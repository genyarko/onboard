import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from the root .env file
dotenv.config({ path: path.join(__dirname, '..', '.env') });

import * as fs from 'fs/promises';
import { ask, validateResponse } from '../onboard-extension/src/bob/client';
import { generateWhyIsThisHerePrompt } from '../onboard-extension/src/features/why-is-this-here/prompt';
import { validateExplanation, WhyIsThisHereExplanation } from '../onboard-extension/src/features/why-is-this-here/schema';
import { getLineHistory, getCommitDetails, getLinkedPRs } from './git-utils';

interface FaithfulnessLabel {
  file: string;
  line_number: number;
  code: string;
  context: string;
  explanation: string;
  source: string;
  why_it_matters: string;
}

interface FaithfulnessResult {
  file: string;
  line: number;
  ground_truth: string;
  bob_output: string;
  accuracy_score: number;
  completeness_score: number;
  notes: string;
}

/**
 * Read file content and get surrounding context
 */
async function getSurroundingContext(
  filePath: string,
  lineNumber: number,
  contextLines: number = 30
): Promise<string> {
  const content = await fs.readFile(filePath, 'utf-8');
  const lines = content.split('\n');
  
  const startLine = Math.max(0, lineNumber - 1 - contextLines);
  const endLine = Math.min(lines.length - 1, lineNumber - 1 + contextLines);
  
  const contextArray: string[] = [];
  for (let i = startLine; i <= endLine; i++) {
    const prefix = i === lineNumber - 1 ? '>>> ' : '    ';
    contextArray.push(`${prefix}${i + 1}: ${lines[i]}`);
  }
  
  return contextArray.join('\n');
}

/**
 * Run Why-Is-This-Here analysis for a specific line
 */
async function analyzeLineWithBob(
  filePath: string,
  lineNumber: number,
  lineContent: string,
  repoRoot: string
): Promise<WhyIsThisHereExplanation> {
  try {
    // Get surrounding context
    const surroundingCode = await getSurroundingContext(filePath, lineNumber, 30);
    
    // Get git history
    const history = await getLineHistory(filePath, lineNumber, repoRoot);
    
    // Get commit details for most recent commit
    let commitDetails = null;
    if (history.length > 0) {
      commitDetails = await getCommitDetails(history[0].hash, repoRoot);
    }
    
    // Get linked PRs
    let linkedPRs: any[] = [];
    if (history.length > 0) {
      linkedPRs = await getLinkedPRs(history[0].hash, repoRoot);
    }
    
    // Build prompt
    const prompt = generateWhyIsThisHerePrompt({
      filePath: path.relative(process.cwd(), filePath),
      lineNumber,
      lineContent,
      history,
      commitDetails: commitDetails || undefined,
      linkedPRs: linkedPRs.length > 0 ? linkedPRs : undefined,
      surroundingCode,
    });
    
    // Call Bob
    const response = await ask<WhyIsThisHereExplanation>(prompt);
    
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to get response from Bob');
    }
    
    // Validate response
    return validateResponse(response.data, validateExplanation);
  } catch (error) {
    console.error(`Error analyzing line ${lineNumber} in ${filePath}:`, error);
    throw error;
  }
}

/**
 * Calculate accuracy score by comparing Bob's output to ground truth
 * Checks for factual correctness and key information presence
 */
function calculateAccuracyScore(
  groundTruth: FaithfulnessLabel,
  bobOutput: WhyIsThisHereExplanation
): number {
  let score = 0;
  let maxScore = 0;
  
  // Check if Bob mentions the source/issue (if available)
  maxScore += 1;
  if (groundTruth.source && bobOutput.summary) {
    const sourceNumber = groundTruth.source.match(/#(\d+)/)?.[1];
    if (sourceNumber && bobOutput.summary.includes(sourceNumber)) {
      score += 1;
    } else if (bobOutput.relatedCommits && bobOutput.relatedCommits.length > 0) {
      score += 0.5; // Partial credit for mentioning commits
    }
  }
  
  // Check if Bob captures the main explanation
  maxScore += 2;
  const groundTruthLower = groundTruth.explanation.toLowerCase();
  const bobSummaryLower = (bobOutput.summary || '').toLowerCase();
  const bobTechnicalLower = (bobOutput.technicalContext || '').toLowerCase();
  const bobBusinessLower = (bobOutput.businessReason || '').toLowerCase();
  
  // Extract key concepts from ground truth
  const keyPhrases = extractKeyPhrases(groundTruth.explanation);
  let matchedPhrases = 0;
  
  for (const phrase of keyPhrases) {
    const phraseLower = phrase.toLowerCase();
    if (
      bobSummaryLower.includes(phraseLower) ||
      bobTechnicalLower.includes(phraseLower) ||
      bobBusinessLower.includes(phraseLower)
    ) {
      matchedPhrases++;
    }
  }
  
  score += (matchedPhrases / keyPhrases.length) * 2;
  
  // Check if Bob captures why it matters
  maxScore += 1;
  if (groundTruth.why_it_matters) {
    const whyItMattersLower = groundTruth.why_it_matters.toLowerCase();
    if (
      bobSummaryLower.includes('important') ||
      bobSummaryLower.includes('critical') ||
      bobBusinessLower.includes('important') ||
      bobBusinessLower.includes('critical') ||
      bobTechnicalLower.includes('important') ||
      bobTechnicalLower.includes('critical')
    ) {
      score += 0.5;
    }
    
    // Check for specific impact mentions
    const impactKeywords = ['resource', 'performance', 'security', 'compatibility', 'cleanup'];
    for (const keyword of impactKeywords) {
      if (
        whyItMattersLower.includes(keyword) &&
        (bobSummaryLower.includes(keyword) ||
          bobTechnicalLower.includes(keyword) ||
          bobBusinessLower.includes(keyword))
      ) {
        score += 0.5;
        break;
      }
    }
  }
  
  return maxScore > 0 ? score / maxScore : 0;
}

/**
 * Calculate completeness score
 * Checks if Bob provides all key information categories
 */
function calculateCompletenessScore(
  groundTruth: FaithfulnessLabel,
  bobOutput: WhyIsThisHereExplanation
): number {
  let score = 0;
  let maxScore = 5;
  
  // Has summary
  if (bobOutput.summary && bobOutput.summary.length > 20) {
    score += 1;
  }
  
  // Has technical context
  if (bobOutput.technicalContext && bobOutput.technicalContext.length > 30) {
    score += 1;
  }
  
  // Has business reason or why it matters
  if (bobOutput.businessReason && bobOutput.businessReason.length > 20) {
    score += 1;
  }
  
  // Has related commits or changes
  if (
    (bobOutput.relatedCommits && bobOutput.relatedCommits.length > 0) ||
    (bobOutput.relatedChanges && bobOutput.relatedChanges.length > 0)
  ) {
    score += 1;
  }
  
  // Confidence level is appropriate (not low for well-documented code)
  if (bobOutput.confidence === 'high' || bobOutput.confidence === 'medium') {
    score += 1;
  }
  
  return score / maxScore;
}

/**
 * Extract key phrases from explanation text
 */
function extractKeyPhrases(text: string): string[] {
  // Simple extraction: split by sentences and take important phrases
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const phrases: string[] = [];
  
  for (const sentence of sentences) {
    // Extract phrases between quotes or important technical terms
    const quoted = sentence.match(/"([^"]+)"|'([^']+)'/g);
    if (quoted) {
      phrases.push(...quoted.map((q) => q.replace(/['"]/g, '')));
    }
    
    // Extract technical terms (camelCase, PascalCase, snake_case)
    const technical = sentence.match(/\b[a-z]+[A-Z][a-zA-Z]*\b|\b[A-Z][a-z]+[A-Z][a-zA-Z]*\b|\b[a-z]+_[a-z_]+\b/g);
    if (technical) {
      phrases.push(...technical);
    }
  }
  
  // If no specific phrases found, use first 3 significant words from each sentence
  if (phrases.length === 0) {
    for (const sentence of sentences.slice(0, 2)) {
      const words = sentence
        .split(/\s+/)
        .filter((w) => w.length > 4 && !/^(this|that|with|from|have|been|were|will)$/i.test(w))
        .slice(0, 3);
      phrases.push(...words);
    }
  }
  
  return phrases.filter((p) => p.length > 3).slice(0, 5);
}

/**
 * Format explanation for CSV output
 */
function formatExplanation(explanation: WhyIsThisHereExplanation): string {
  const parts: string[] = [];
  
  if (explanation.summary) {
    parts.push(`Summary: ${explanation.summary}`);
  }
  
  if (explanation.technicalContext) {
    parts.push(`Technical: ${explanation.technicalContext}`);
  }
  
  if (explanation.businessReason) {
    parts.push(`Business: ${explanation.businessReason}`);
  }
  
  return parts.join(' | ').replace(/"/g, '""'); // Escape quotes for CSV
}

/**
 * Main evaluation function
 */
async function runFaithfulnessEval(): Promise<void> {
  console.log('🔍 Starting Faithfulness Evaluation...\n');
  
  // Load ground truth labels
  const labelsPath = path.join(__dirname, 'ground-truth', 'faithfulness-labels.json');
  const labelsContent = await fs.readFile(labelsPath, 'utf-8');
  const labels: FaithfulnessLabel[] = JSON.parse(labelsContent);
  
  console.log(`Loaded ${labels.length} ground truth labels\n`);
  
  const results: FaithfulnessResult[] = [];
  const fastapiRoot = path.join(__dirname, '..', 'fastapi-demo');
  
  // Process each label
  for (let i = 0; i < labels.length; i++) {
    const label = labels[i];
    console.log(`[${i + 1}/${labels.length}] Analyzing ${label.file}:${label.line_number}...`);
    
    try {
      const filePath = path.join(fastapiRoot, label.file);
      
      // Run Bob's analysis
      const bobOutput = await analyzeLineWithBob(filePath, label.line_number, label.code, fastapiRoot);
      
      // Calculate scores
      const accuracyScore = calculateAccuracyScore(label, bobOutput);
      const completenessScore = calculateCompletenessScore(label, bobOutput);
      
      console.log(`  ✓ Accuracy: ${(accuracyScore * 100).toFixed(1)}%, Completeness: ${(completenessScore * 100).toFixed(1)}%`);
      
      results.push({
        file: label.file,
        line: label.line_number,
        ground_truth: label.explanation,
        bob_output: formatExplanation(bobOutput),
        accuracy_score: accuracyScore,
        completeness_score: completenessScore,
        notes: `Confidence: ${bobOutput.confidence}`,
      });
    } catch (error) {
      console.error(`  ✗ Error: ${error instanceof Error ? error.message : String(error)}`);
      results.push({
        file: label.file,
        line: label.line_number,
        ground_truth: label.explanation,
        bob_output: 'ERROR: ' + (error instanceof Error ? error.message : String(error)),
        accuracy_score: 0,
        completeness_score: 0,
        notes: 'Analysis failed',
      });
    }
    
    console.log('');
  }
  
  // Calculate averages
  const avgAccuracy =
    results.reduce((sum, r) => sum + r.accuracy_score, 0) / results.length;
  const avgCompleteness =
    results.reduce((sum, r) => sum + r.completeness_score, 0) / results.length;
  
  console.log('📊 Results Summary:');
  console.log(`   Average Accuracy Score: ${(avgAccuracy * 100).toFixed(1)}%`);
  console.log(`   Average Completeness Score: ${(avgCompleteness * 100).toFixed(1)}%`);
  console.log('');
  
  // Generate CSV
  const csvLines = [
    'file,line,ground_truth,bob_output,accuracy_score,completeness_score,notes',
  ];
  
  for (const result of results) {
    csvLines.push(
      [
        result.file,
        result.line,
        `"${result.ground_truth.replace(/"/g, '""')}"`,
        `"${result.bob_output}"`,
        result.accuracy_score.toFixed(3),
        result.completeness_score.toFixed(3),
        `"${result.notes}"`,
      ].join(',')
    );
  }
  
  // Add summary row
  csvLines.push('');
  csvLines.push(`AVERAGE,,,,${avgAccuracy.toFixed(3)},${avgCompleteness.toFixed(3)},`);
  
  const csvContent = csvLines.join('\n');
  const outputPath = path.join(__dirname, 'out', 'faithfulness-results.csv');
  
  // Ensure output directory exists
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, csvContent, 'utf-8');
  
  console.log(`✅ Results saved to: ${outputPath}`);
}

// Run the evaluation
runFaithfulnessEval().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
