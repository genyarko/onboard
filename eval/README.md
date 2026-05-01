# Evaluation Scripts

This directory contains evaluation scripts for testing the Onboard extension's features against ground truth data.

## Scripts

### 1. `faithfulness.ts` - Why-Is-This-Here Evaluation

Tests the accuracy and completeness of Bob's "Why Is This Here" feature by comparing its explanations against manually labeled ground truth.

**What it does:**
- Loads ground truth labels from `ground-truth/faithfulness-labels.json`
- For each labeled line, runs Why-Is-This-Here analysis
- Compares Bob's output to ground truth
- Scores accuracy (0-1) and completeness (0-1)
- Generates CSV with results and average scores

**Output:** `out/faithfulness-results.csv`

**Metrics:**
- **Accuracy Score**: Measures factual correctness and presence of key information
- **Completeness Score**: Measures whether all important information categories are provided

### 2. `completeness.ts` - Repo X-Ray Evaluation

Tests whether Bob's "Repo X-Ray" feature can detect known weird/unusual patterns in the codebase.

**What it does:**
- Loads ground truth weird parts from `ground-truth/completeness-labels.json`
- Runs full Repo X-Ray analysis on FastAPI repository
- Checks if each labeled weird part is detected in Bob's output
- Scores detection: found (1) or not found (0)
- Generates CSV with results and detection rate

**Output:** `out/completeness-results.csv`

**Metrics:**
- **Detection Rate**: Percentage of ground truth weird parts found
- **Match Quality**: Excellent, Good, Partial, or None

## Setup

### Prerequisites

1. **Install dependencies** in the onboard-extension directory:
   ```bash
   cd ../onboard-extension
   npm install
   ```

2. **Compile TypeScript** in the onboard-extension directory:
   ```bash
   npm run compile
   ```

3. **Ensure Bob Shell is running** and accessible via the extension's Bob client

4. **FastAPI repository** should be present at `../fastapi-demo`

### Running the Scripts

From the `eval` directory:

```bash
# Compile the evaluation scripts
npx tsc

# Run faithfulness evaluation
node out/faithfulness.js

# Run completeness evaluation
node out/completeness.js
```

## Ground Truth Data

### `ground-truth/faithfulness-labels.json`

Contains 10 manually labeled code lines from FastAPI with:
- File path and line number
- Code snippet
- Context description
- Detailed explanation of why the code exists
- Source (issue/PR reference)
- Why it matters

### `ground-truth/completeness-labels.json`

Contains 5 manually labeled "weird parts" from FastAPI with:
- Description of the weird part
- Location in codebase
- Code snippet
- Why it's weird
- Why it exists
- Implications
- Category (backward_compatibility, workaround, etc.)

## Output Format

### Faithfulness Results CSV

```csv
file,line,ground_truth,bob_output,accuracy_score,completeness_score,notes
fastapi/routing.py,633,"...","..",0.850,0.900,"Confidence: high"
...
AVERAGE,,,,0.825,0.875,
```

### Completeness Results CSV

```csv
weird_part,description,found,bob_explanation,match_quality
"Vendored _DefaultLifespan class","...",1,"...",excellent
...
DETECTION_RATE,,,0.800,
```

## Interpreting Results

### Good Results
- **Faithfulness**: Accuracy > 0.7, Completeness > 0.7
- **Completeness**: Detection Rate > 0.6, mostly "good" or "excellent" matches

### Areas for Improvement
- Low accuracy scores indicate Bob is missing key facts or providing incorrect information
- Low completeness scores indicate Bob is not providing enough context
- Low detection rate indicates Bob is missing important patterns in the codebase

## Troubleshooting

### "Cannot find module" errors
- Make sure you've run `npm install` and `npm run compile` in the onboard-extension directory
- Check that the relative paths in the scripts are correct

### "Bob client error"
- Ensure Bob Shell is running
- Check that the extension's Bob client configuration is correct

### "File not found" errors
- Verify the FastAPI repository is at `../fastapi-demo`
- Check that ground truth files exist in `ground-truth/` directory

### Git-related errors
- The faithfulness script requires git history
- Make sure the FastAPI repository is a valid git repository
- If git commands fail, the script will still run but with limited context
