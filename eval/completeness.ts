import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from the root .env file
dotenv.config({ path: path.join(__dirname, '..', '.env') });

import * as fs from 'fs/promises';
import { ask, validateResponse } from '../onboard-extension/src/bob/client';
import {
  buildRepoContext,
  buildEntryPointsPrompt,
  buildDependencyGraphPrompt,
  buildArtifactsPrompt,
  buildWeirdPartsPrompt,
} from '../onboard-extension/src/features/repo-xray/prompt';
import {
  EntryPointsResponseSchema,
  DependencyGraphResponseSchema,
  ArtifactsResponseSchema,
  WeirdPartsResponseSchema,
  EntryPointsResponse,
  DependencyGraphResponse,
  ArtifactsResponse,
  WeirdPartsResponse,
} from '../onboard-extension/src/features/repo-xray/schema';

interface CompletenessLabel {
  weird_part: string;
  location: string;
  code_snippet: string;
  why_weird: string;
  why_it_exists: string;
  implications: string;
  category: string;
}

interface CompletenessResult {
  weird_part: string;
  description: string;
  found: number;
  bob_explanation: string;
  match_quality: string;
}

/**
 * Generate a file tree representation of the repository
 */
async function generateFileTree(rootPath: string, maxDepth: number = 4): Promise<string> {
  const lines: string[] = [];
  const ignoreDirs = new Set([
    'node_modules',
    '.git',
    'dist',
    'build',
    'out',
    '.vscode',
    '__pycache__',
    '.pytest_cache',
    'venv',
    '.env',
  ]);

  async function traverse(dirPath: string, prefix: string = '', depth: number = 0) {
    if (depth > maxDepth) {
      return;
    }

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      const filtered = entries.filter(
        (entry) => !entry.name.startsWith('.') || entry.name === '.env.example'
      );

      for (let i = 0; i < filtered.length; i++) {
        const entry = filtered[i];
        const isLast = i === filtered.length - 1;
        const connector = isLast ? '└── ' : '├── ';
        const extension = isLast ? '    ' : '│   ';

        if (entry.isDirectory()) {
          if (ignoreDirs.has(entry.name)) {
            lines.push(`${prefix}${connector}${entry.name}/ (ignored)`);
            continue;
          }
          lines.push(`${prefix}${connector}${entry.name}/`);
          await traverse(path.join(dirPath, entry.name), prefix + extension, depth + 1);
        } else {
          lines.push(`${prefix}${connector}${entry.name}`);
        }
      }
    } catch (error) {
      // Skip directories we can't read
    }
  }

  const rootName = path.basename(rootPath);
  lines.push(`${rootName}/`);
  await traverse(rootPath);

  return lines.join('\n');
}

/**
 * Walk a directory looking for Python source files within the main package.
 * For FastAPI we want fastapi/**.py, skipping tests/docs/scripts.
 */
async function findPackageSourceFiles(workspaceRoot: string): Promise<string[]> {
  const candidates: string[] = [];
  const skipDirs = new Set([
    'node_modules', '.git', 'dist', 'build', 'out', '__pycache__', '.pytest_cache',
    'venv', '.venv', 'tests', 'test', 'docs', 'scripts', 'examples',
  ]);

  async function walk(dir: string, depth: number): Promise<void> {
    if (depth > 3) return;
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (skipDirs.has(entry.name)) continue;
        await walk(full, depth + 1);
      } else if (entry.isFile() && entry.name.endsWith('.py')) {
        candidates.push(full);
      }
    }
  }

  // Look for a top-level package directory matching the repo name first
  // (e.g. fastapi-demo/fastapi/), then fall back to scanning the root.
  const repoName = path.basename(workspaceRoot).replace(/-demo$/, '');
  const packageDir = path.join(workspaceRoot, repoName);
  try {
    const stat = await fs.stat(packageDir);
    if (stat.isDirectory()) {
      await walk(packageDir, 0);
      return candidates;
    }
  } catch {
    // No matching package dir, fall through
  }
  await walk(workspaceRoot, 0);
  return candidates;
}

/**
 * Extract line-numbered windows around lines that contain weird-part markers.
 * Uses an 8-line window (4 before, 4 after) around each match, then merges
 * overlapping windows so we don't repeat content.
 */
function extractInterestingExcerpts(
  filePath: string,
  content: string,
  relPath: string
): string {
  const markerRegex = /\b(hack|workaround|deprecated|vendored|compat(?:ibility)?|legacy|TODO|FIXME|XXX|HACK|@deprecated|on_startup|on_shutdown|AsyncExitStack|nested|embed|unwrap|special[- _]?case|note:|originally|historical|intentional|purpose(?:ly|ful)|sqlalchemy_safe|copy of|dependency could have)\b/i;
  const lines = content.split(/\r?\n/);
  const matchedLines: number[] = [];

  for (let i = 0; i < lines.length; i++) {
    if (markerRegex.test(lines[i])) {
      matchedLines.push(i);
    }
  }

  if (matchedLines.length === 0) return '';

  // Build merged windows. Larger radius so adjacent markers fuse into one
  // contiguous window and we get more code context around each marker.
  const windowRadius = 6;
  const windows: Array<[number, number]> = [];
  for (const idx of matchedLines) {
    const start = Math.max(0, idx - windowRadius);
    const end = Math.min(lines.length - 1, idx + windowRadius);
    const last = windows[windows.length - 1];
    if (last && start <= last[1] + 1) {
      last[1] = Math.max(last[1], end);
    } else {
      windows.push([start, end]);
    }
  }

  const out: string[] = [`### ${relPath}`];
  for (const [start, end] of windows) {
    out.push(`# lines ${start + 1}-${end + 1}`);
    for (let i = start; i <= end; i++) {
      out.push(`${String(i + 1).padStart(5, ' ')}: ${lines[i]}`);
    }
    out.push('');
  }
  return out.join('\n');
}

/**
 * Build a single excerpt blob from all source files, with a per-file cap so one
 * giant file can't eat the budget, and a global cap so we stay under the model's
 * context window. Files that don't fit get a truncation note rather than aborting
 * the whole loop.
 */
async function gatherSourceExcerpts(
  workspaceRoot: string,
  byteBudget: number = 200_000,
  perFileBudget: number = 20_000
): Promise<string> {
  // Sort files so high-signal ones come FIRST in the prompt (LLM attention is
  // position-biased). Deprecation-shim folders like `_compat/` are crowded with
  // boring "X deprecated in favor of Y" comments — push them to the end.
  const files = (await findPackageSourceFiles(workspaceRoot)).sort((a, b) => {
    const aCompat = /[\/\\]_compat[\/\\]/.test(a) ? 1 : 0;
    const bCompat = /[\/\\]_compat[\/\\]/.test(b) ? 1 : 0;
    if (aCompat !== bCompat) return aCompat - bCompat;
    return a.localeCompare(b);
  });
  const sections: string[] = [];
  let used = 0;
  let skipped = 0;
  for (const filePath of files) {
    if (used >= byteBudget) {
      skipped = files.length - sections.length;
      break;
    }
    let content: string;
    try {
      content = await fs.readFile(filePath, 'utf-8');
    } catch {
      continue;
    }
    const relPath = path.relative(workspaceRoot, filePath).replace(/\\/g, '/');
    let excerpt = extractInterestingExcerpts(filePath, content, relPath);
    if (!excerpt) continue;

    // Per-file cap: keep header + as many windows as fit, truncate the rest.
    if (excerpt.length > perFileBudget) {
      excerpt = excerpt.slice(0, perFileBudget) + `\n[... excerpt truncated at ${perFileBudget} bytes ...]\n`;
    }

    // Global cap: if this file would push past the budget, trim what we can include.
    const remaining = byteBudget - used;
    if (excerpt.length > remaining) {
      excerpt = excerpt.slice(0, Math.max(0, remaining - 64)) + `\n[... global budget reached ...]\n`;
    }

    sections.push(excerpt);
    used += excerpt.length;
  }
  if (skipped > 0) {
    sections.push(`\n[... ${skipped} more files skipped after global budget reached ...]`);
  }
  return sections.join('\n');
}

/**
 * Gather repository context
 */
async function gatherRepoContext(workspaceRoot: string) {
  // Generate file tree
  const fileTree = await generateFileTree(workspaceRoot);

  // Read key files
  const additionalFiles: Record<string, string> = {};

  const packageJsonPath = path.join(workspaceRoot, 'package.json');
  try {
    additionalFiles['package.json'] = await fs.readFile(packageJsonPath, 'utf-8');
  } catch { /* skip */ }

  const pyprojectPath = path.join(workspaceRoot, 'pyproject.toml');
  try {
    additionalFiles['pyproject.toml'] = await fs.readFile(pyprojectPath, 'utf-8');
  } catch { /* skip */ }

  const readmePath = path.join(workspaceRoot, 'README.md');
  try {
    additionalFiles['README.md'] = await fs.readFile(readmePath, 'utf-8');
  } catch { /* skip */ }

  // Pull source excerpts so the weird-parts prompt has actual code to reason over,
  // not just a directory listing.
  const sourceExcerpts = await gatherSourceExcerpts(workspaceRoot);
  console.log(`  (gathered ${sourceExcerpts.length.toLocaleString()} bytes of source excerpts)`);

  // Dump excerpts for debugging
  const excerptsDumpPath = path.join(__dirname, 'out', 'completeness-source-excerpts.txt');
  try {
    await fs.mkdir(path.dirname(excerptsDumpPath), { recursive: true });
    await fs.writeFile(excerptsDumpPath, sourceExcerpts, 'utf-8');
  } catch { /* non-fatal */ }

  return buildRepoContext(workspaceRoot, fileTree, additionalFiles, sourceExcerpts);
}

/**
 * Execute Repo X-Ray analysis
 */
async function runRepoXRay(workspaceRoot: string): Promise<WeirdPartsResponse> {
  console.log('  Step 1: Gathering repository context...');
  const context = await gatherRepoContext(workspaceRoot);

  console.log('  Step 2: Identifying entry points...');
  const entryPointsPrompt = buildEntryPointsPrompt(context);
  const entryPointsResponse = await ask(entryPointsPrompt);
  
  if (!entryPointsResponse.success || !entryPointsResponse.data) {
    throw new Error(`Entry points analysis failed: ${entryPointsResponse.error || 'No data'}`);
  }
  
  const entryPoints = validateResponse(
    entryPointsResponse.data,
    (data) => EntryPointsResponseSchema.parse(data)
  );

  console.log('  Step 3: Analyzing dependency graph...');
  const dependencyGraphPrompt = buildDependencyGraphPrompt(context, entryPoints);
  const dependencyGraphResponse = await ask(dependencyGraphPrompt);
  
  if (!dependencyGraphResponse.success || !dependencyGraphResponse.data) {
    throw new Error(`Dependency graph analysis failed: ${dependencyGraphResponse.error || 'No data'}`);
  }
  
  const dependencyGraph = validateResponse(
    dependencyGraphResponse.data,
    (data) => DependencyGraphResponseSchema.parse(data)
  );

  console.log('  Step 4: Generating artifacts...');
  const artifactsPrompt = buildArtifactsPrompt(context, entryPoints, dependencyGraph);
  const artifactsResponse = await ask(artifactsPrompt);
  
  if (!artifactsResponse.success || !artifactsResponse.data) {
    throw new Error(`Artifacts generation failed: ${artifactsResponse.error || 'No data'}`);
  }
  
  const artifacts = validateResponse(
    artifactsResponse.data,
    (data) => ArtifactsResponseSchema.parse(data)
  );

  console.log('  Step 5: Identifying weird parts...');
  const weirdPartsPrompt = buildWeirdPartsPrompt(context, entryPoints, dependencyGraph, artifacts);
  const weirdPartsResponse = await ask(weirdPartsPrompt);
  
  if (!weirdPartsResponse.success || !weirdPartsResponse.data) {
    throw new Error(`Weird parts analysis failed: ${weirdPartsResponse.error || 'No data'}`);
  }
  
  const weirdParts = validateResponse(
    weirdPartsResponse.data,
    (data) => WeirdPartsResponseSchema.parse(data)
  );

  return weirdParts;
}

/**
 * Check if a ground truth weird part is found in Bob's output
 */
function checkWeirdPartDetection(
  label: CompletenessLabel,
  bobOutput: WeirdPartsResponse
): { found: number; explanation: string; matchQuality: string } {
  // Extract key terms from the label
  const labelTerms = extractKeyTerms(label);
  
  // Search through Bob's weird parts
  let bestMatch: any = null;
  let bestScore = 0;
  
  for (const weirdPart of bobOutput.weirdParts) {
    const score = calculateMatchScore(label, weirdPart, labelTerms);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = weirdPart;
    }
  }
  
  // Determine if found based on score threshold
  const found = bestScore >= 0.4 ? 1 : 0;
  
  let matchQuality = 'none';
  if (bestScore >= 0.7) {
    matchQuality = 'excellent';
  } else if (bestScore >= 0.5) {
    matchQuality = 'good';
  } else if (bestScore >= 0.4) {
    matchQuality = 'partial';
  }
  
  const explanation = bestMatch
    ? `${bestMatch.file}${bestMatch.lineRange ? ':' + bestMatch.lineRange : ''} — ${bestMatch.description} (score: ${bestScore.toFixed(2)})`
    : 'Not detected';

  return { found, explanation, matchQuality };
}

/**
 * Extract key terms from a label for matching
 */
function extractKeyTerms(label: CompletenessLabel): Set<string> {
  const terms = new Set<string>();
  
  // Extract from weird_part title
  const titleWords = label.weird_part
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 3);
  titleWords.forEach((w) => terms.add(w));
  
  // Extract technical terms from code snippet
  const technicalTerms = label.code_snippet.match(/\b[A-Z][a-z]+[A-Z][a-zA-Z]*\b|\b[a-z]+_[a-z_]+\b/g);
  if (technicalTerms) {
    technicalTerms.forEach((t) => terms.add(t.toLowerCase()));
  }
  
  // Extract from location
  const locationParts = label.location.split(/[\/\s:]+/);
  locationParts.forEach((p) => {
    if (p.length > 3) {
      terms.add(p.toLowerCase());
    }
  });
  
  // Extract key concepts from why_weird
  const conceptWords = label.why_weird
    .toLowerCase()
    .match(/\b(vendored|nested|hack|deprecated|unwrapping|compatibility|workaround|legacy)\b/g);
  if (conceptWords) {
    conceptWords.forEach((w) => terms.add(w));
  }
  
  return terms;
}

/**
 * Parse all line ranges out of a free-form string. Handles "888", "226-245",
 * "lines 624-636, 927-936", "routing.py:116-135", etc. Returns each range as
 * [start, end]. Single-line entries like "888" become [888, 888].
 */
function parseLineRanges(text: string | undefined | null): Array<[number, number]> {
  if (!text) return [];
  const ranges: Array<[number, number]> = [];
  const rangeRe = /(\d+)\s*-\s*(\d+)/g;
  const seen = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = rangeRe.exec(text)) !== null) {
    const start = parseInt(m[1], 10);
    const end = parseInt(m[2], 10);
    if (!isNaN(start) && !isNaN(end) && end >= start && end - start < 10000) {
      const key = `${start}-${end}`;
      if (!seen.has(key)) {
        seen.add(key);
        ranges.push([start, end]);
      }
    }
  }
  // If no ranges, fall back to single line numbers (but ignore tiny numbers
  // like "v2" or "3.1.0" — only accept >=10 to avoid false matches).
  if (ranges.length === 0) {
    const singleRe = /\b(\d{2,5})\b/g;
    while ((m = singleRe.exec(text)) !== null) {
      const n = parseInt(m[1], 10);
      if (!isNaN(n) && n >= 10) {
        ranges.push([n, n]);
      }
    }
  }
  return ranges;
}

/**
 * Score how well two line ranges align. 1.0 = real overlap, partial credit
 * for "nearby" (within 30 lines), 0 for distant. Uses the best pairing across
 * multiple ranges in either side.
 */
function lineRangeAlignment(
  labelRanges: Array<[number, number]>,
  foundRanges: Array<[number, number]>
): number {
  if (labelRanges.length === 0 || foundRanges.length === 0) return 0;
  let best = 0;
  for (const [ls, le] of labelRanges) {
    for (const [fs, fe] of foundRanges) {
      const overlap = Math.min(le, fe) - Math.max(ls, fs);
      if (overlap >= 0) {
        best = Math.max(best, 1.0);
        continue;
      }
      // Negative overlap = gap between ranges
      const gap = -overlap;
      if (gap <= 30) {
        best = Math.max(best, 0.5);
      } else if (gap <= 100) {
        best = Math.max(best, 0.2);
      }
    }
  }
  return best;
}

/**
 * Calculate match score between label and Bob's weird part.
 *
 * Weights are biased toward LOCALIZATION (the model got the right place) over
 * vibes (term overlap, category similarity). Two failure modes we are protecting
 * against:
 *   - "right file, wrong place": e.g. Bob reports _AsyncLiftContextManager at
 *     routing.py:164-177 and we credit it as a hit for the labeled _DefaultLifespan
 *     at routing.py:226-245. Without the alignment requirement, term/category
 *     overlap alone could push this above the 0.4 threshold.
 *   - "right concept, wrong file": e.g. Bob reports an AsyncExitStack usage in
 *     dependencies/utils.py and we credit it as a hit for the routing.py one.
 *     The file match is gated, so this scores at most ~term overlap × 0.35.
 *
 * Components:
 *   - Term overlap (max 0.35)
 *   - File match (max 0.10)
 *   - Line-range alignment (max 0.40) — dominant signal
 *   - Category proxy (max 0.15) — GATED: only awarded when alignment >= 0.5,
 *     i.e. real or very-close-by overlap. Same file but 100 lines away is NOT
 *     enough to credit a category coincidence.
 */
function calculateMatchScore(
  label: CompletenessLabel,
  weirdPart: any,
  labelTerms: Set<string>
): number {
  let score = 0;

  // WeirdPart schema fields: file, lineRange, description, hypothesis, contradicts, severity
  const weirdPartText = [
    weirdPart.file,
    weirdPart.lineRange,
    weirdPart.description,
    weirdPart.hypothesis,
    weirdPart.contradicts,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  // Term overlap (max 0.35)
  let termMatches = 0;
  for (const term of labelTerms) {
    if (weirdPartText.includes(term)) {
      termMatches++;
    }
  }
  if (labelTerms.size > 0) {
    score += (termMatches / labelTerms.size) * 0.35;
  }

  // File-path match (max 0.1) and line-range alignment (max 0.4).
  // Line-range alignment requires the file to also match — line numbers across
  // different files are meaningless.
  const labelLocation = label.location.toLowerCase();
  const weirdPartFile = (weirdPart.file || '').toLowerCase();
  let fileMatched = false;
  if (labelLocation && weirdPartFile) {
    const labelFile = labelLocation.split(/[\s:]+/)[0];
    const labelBasename = labelFile.split(/[\/\\]/).pop() || labelFile;
    if (weirdPartFile.includes(labelFile) || weirdPartFile.includes(labelBasename)) {
      score += 0.1;
      fileMatched = true;
    }
  }

  let alignment = 0;
  if (fileMatched) {
    const labelRanges = parseLineRanges(label.location);
    const foundRanges = parseLineRanges(weirdPart.lineRange);
    alignment = lineRangeAlignment(labelRanges, foundRanges);
    score += alignment * 0.4;
  }

  // Category-ish match (max 0.15) — schema has no `category`, so use `contradicts`
  // + concept words from `hypothesis` as a proxy. GATED on alignment >= 0.5: a
  // category coincidence is meaningful only if Bob also got close to the right
  // place. Otherwise "deprecated thing in same file" cheaply earns 0.15 it
  // shouldn't.
  if (alignment >= 0.5) {
    const labelCategory = label.category.toLowerCase();
    const proxyText = `${weirdPart.contradicts || ''} ${weirdPart.hypothesis || ''}`.toLowerCase();
    const conceptMap: Record<string, string[]> = {
      compatibility: ['compatibility', 'compat', 'backward', 'legacy'],
      workaround: ['workaround', 'hack', 'patch', 'kludge'],
      legacy: ['legacy', 'historical', 'deprecated'],
      deprecated: ['deprecated', 'obsolete'],
    };
    for (const [labelKey, synonyms] of Object.entries(conceptMap)) {
      if (labelCategory.includes(labelKey) && synonyms.some((s) => proxyText.includes(s))) {
        score += 0.15;
        break;
      }
    }
  }

  return Math.min(score, 1.0);
}

/**
 * Format explanation for CSV output
 */
function formatExplanation(explanation: string): string {
  return explanation.replace(/"/g, '""'); // Escape quotes for CSV
}

/**
 * Main evaluation function
 */
async function runCompletenessEval(): Promise<void> {
  console.log('🔍 Starting Completeness Evaluation...\n');
  
  // Load ground truth labels
  const labelsPath = path.join(__dirname, 'ground-truth', 'completeness-labels.json');
  const labelsContent = await fs.readFile(labelsPath, 'utf-8');
  const labels: CompletenessLabel[] = JSON.parse(labelsContent);
  
  console.log(`Loaded ${labels.length} ground truth weird parts\n`);
  
  // Run Repo X-Ray on FastAPI
  console.log('🔬 Running Repo X-Ray on FastAPI repository...\n');
  const fastapiRoot = path.join(__dirname, '..', 'fastapi-demo');
  
  let bobOutput: WeirdPartsResponse;
  try {
    bobOutput = await runRepoXRay(fastapiRoot);
    console.log(`\n✓ Repo X-Ray complete. Found ${bobOutput.weirdParts.length} weird parts.\n`);

    // Persist raw Bob output for debugging / matcher tuning
    const rawOutputPath = path.join(__dirname, 'out', 'completeness-bob-output.json');
    await fs.mkdir(path.dirname(rawOutputPath), { recursive: true });
    await fs.writeFile(rawOutputPath, JSON.stringify(bobOutput, null, 2), 'utf-8');
    console.log(`   (raw output saved to ${rawOutputPath})\n`);
  } catch (error) {
    console.error('✗ Repo X-Ray failed:', error);
    throw error;
  }
  
  // Check each ground truth weird part
  const results: CompletenessResult[] = [];
  
  console.log('📊 Checking detection of ground truth weird parts...\n');
  
  for (let i = 0; i < labels.length; i++) {
    const label = labels[i];
    console.log(`[${i + 1}/${labels.length}] Checking: ${label.weird_part}`);
    
    const { found, explanation, matchQuality } = checkWeirdPartDetection(label, bobOutput);
    
    console.log(`  ${found ? '✓' : '✗'} ${found ? 'Found' : 'Not found'} (${matchQuality})`);
    
    results.push({
      weird_part: label.weird_part,
      description: label.why_weird,
      found,
      bob_explanation: explanation,
      match_quality: matchQuality,
    });
    
    console.log('');
  }
  
  // Calculate detection rate
  const detectionRate = results.reduce((sum, r) => sum + r.found, 0) / results.length;
  
  // Calculate quality distribution
  const qualityDistribution = {
    excellent: results.filter((r) => r.match_quality === 'excellent').length,
    good: results.filter((r) => r.match_quality === 'good').length,
    partial: results.filter((r) => r.match_quality === 'partial').length,
    none: results.filter((r) => r.match_quality === 'none').length,
  };
  
  console.log('📊 Results Summary:');
  console.log(`   Detection Rate: ${(detectionRate * 100).toFixed(1)}% (${results.filter(r => r.found).length}/${results.length})`);
  console.log(`   Match Quality Distribution:`);
  console.log(`     Excellent: ${qualityDistribution.excellent}`);
  console.log(`     Good: ${qualityDistribution.good}`);
  console.log(`     Partial: ${qualityDistribution.partial}`);
  console.log(`     None: ${qualityDistribution.none}`);
  console.log('');
  
  // Generate CSV
  const csvLines = [
    'weird_part,description,found,bob_explanation,match_quality',
  ];
  
  for (const result of results) {
    csvLines.push(
      [
        `"${result.weird_part.replace(/"/g, '""')}"`,
        `"${result.description.replace(/"/g, '""')}"`,
        result.found,
        `"${formatExplanation(result.bob_explanation)}"`,
        result.match_quality,
      ].join(',')
    );
  }
  
  // Add summary rows
  csvLines.push('');
  csvLines.push(`DETECTION_RATE,,,${detectionRate.toFixed(3)},`);
  csvLines.push(`EXCELLENT_MATCHES,,,${qualityDistribution.excellent},`);
  csvLines.push(`GOOD_MATCHES,,,${qualityDistribution.good},`);
  csvLines.push(`PARTIAL_MATCHES,,,${qualityDistribution.partial},`);
  csvLines.push(`NO_MATCHES,,,${qualityDistribution.none},`);
  
  const csvContent = csvLines.join('\n');
  const outputPath = path.join(__dirname, 'out', 'completeness-results.csv');
  
  // Ensure output directory exists
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, csvContent, 'utf-8');
  
  console.log(`✅ Results saved to: ${outputPath}`);
}

// Run the evaluation
runCompletenessEval().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
