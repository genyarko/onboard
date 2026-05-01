# Testing "Why Is This Here" Hover Provider

## Overview
The hover provider has been registered in `extension.ts` and is ready for testing. This guide explains how to test it on FastAPI files with known git history.

## Prerequisites
1. Extension compiled successfully (`npm run compile`)
2. BOB_API_KEY environment variable set
3. VS Code Extension Development Host running (F5)

## Test Setup

### 1. Open FastAPI Demo Repository
The `fastapi-demo` folder in the workspace has a rich git history, making it perfect for testing.

```powershell
# In Extension Development Host, open the FastAPI demo folder
File > Open Folder > "C:\Users\genya\Downloads\merolav onboard\fastapi-demo"
```

### 2. Test Files with Known History
Good test candidates from the FastAPI repository:

1. **`fastapi/applications.py`** (Line 47-61)
   - The `FastAPI` class definition
   - Should have extensive commit history
   - Complex initialization with many parameters

2. **`fastapi/routing.py`**
   - Core routing logic
   - Likely has many related commits

3. **`fastapi/dependencies/utils.py`**
   - Dependency injection utilities
   - Should show evolution of the feature

## Testing Procedure

### Test 1: Basic Hover Functionality
1. Open `fastapi/applications.py`
2. Navigate to line 47 (class FastAPI definition)
3. Hover over the line
4. **Expected Result:**
   - Progress notification appears: "Analyzing code context..."
   - Hover tooltip displays with sections:
     - 🔍 Why Is This Here?
     - Summary
     - 💼 Business Reason
     - ⚙️ Technical Context
     - 🔗 Related Changes (if any)
     - 📝 Related Commits
     - 📌 Notes
     - Confidence indicator (🟢/🟡/🔴)

### Test 2: Line with Recent Changes
1. Use `git log` to find recently modified lines:
   ```bash
   cd fastapi-demo
   git log --oneline -10
   ```
2. Open a file from recent commits
3. Hover over modified lines
4. **Expected Result:**
   - Should show recent commit information
   - Related PRs (if linked)
   - Clear explanation of why the change was made

### Test 3: Complex Code Section
1. Open `fastapi/applications.py`
2. Hover over line 878 (`self.debug = debug`)
3. **Expected Result:**
   - Should explain the initialization pattern
   - Reference related parameters
   - Show commit that introduced or modified it

### Test 4: Cache Behavior
1. Hover over the same line twice
2. **Expected Result:**
   - First hover: Shows progress notification
   - Second hover (within 5 minutes): Instant response (cached)

### Test 5: Non-Git Repository (Fallback)
1. Create a new folder outside git
2. Create a Python file with some code
3. Hover over a line
4. **Expected Result:**
   - Should still work (fallback mode)
   - No git history shown
   - Analysis based on code context only

## Verification Checklist

### ✅ Functionality
- [ ] Hover provider activates on code lines
- [ ] Progress notification appears
- [ ] Hover tooltip displays formatted markdown
- [ ] All sections render correctly (emojis, formatting)
- [ ] Cache works (instant second hover)
- [ ] Cancellation works (ESC during analysis)

### ✅ Accuracy of Explanations
Review the hover content for:
- [ ] **Summary**: Clear, concise one-sentence explanation
- [ ] **Business Reason**: Explains WHY (user value, problem solved)
- [ ] **Technical Context**: Explains HOW (implementation details)
- [ ] **Related Changes**: Lists relevant modifications
- [ ] **Related Commits**: Shows git history with relevance
- [ ] **Confidence**: Appropriate level (high/medium/low)

### ✅ Edge Cases
- [ ] Empty lines (should not trigger)
- [ ] Comments (should analyze)
- [ ] Very long lines (should handle)
- [ ] Files without git history (fallback mode)
- [ ] Binary files (should skip)

## Debugging

### Enable Debug Logging
Check the Debug Console in VS Code for:
- Extension activation messages
- Git command outputs
- Bob API calls and responses
- Error messages

### Common Issues

**Issue: Hover doesn't appear**
- Check: Is the file in a git repository?
- Check: Debug Console for errors
- Check: BOB_API_KEY is set

**Issue: "Error analyzing code"**
- Check: Bob API key is valid
- Check: Network connectivity
- Check: Debug Console for detailed error

**Issue: Slow response**
- First hover is always slower (fetching git history + API call)
- Subsequent hovers should be instant (cached)
- Check: Is git repository very large?

## Adjusting the Prompt

If explanations are not accurate or insightful enough, modify:
- `src/features/why-is-this-here/prompt.ts`

Key areas to adjust:
1. **Context amount**: Currently ±30 lines, can increase/decrease
2. **Prompt instructions**: Make more specific about what to analyze
3. **Output format**: Adjust schema in `schema.ts`

### Example Prompt Improvements

**If explanations are too generic:**
```typescript
// In prompt.ts, add more specific instructions:
"Focus on the SPECIFIC business value and user impact of this code.
Avoid generic statements. Be concrete and detailed."
```

**If missing important context:**
```typescript
// Increase context lines:
const surroundingCode = this.getSurroundingContext(document, position.line, 50); // was 30
```

**If commit relevance is unclear:**
```typescript
// In prompt.ts, add:
"For each commit, explain SPECIFICALLY how it relates to this line.
Don't just list commits - explain their relevance."
```

## Success Criteria

The hover provider is ready for production when:
1. ✅ Hovers work reliably on FastAPI files
2. ✅ Explanations are accurate and insightful (not generic)
3. ✅ Performance is acceptable (< 3 seconds for first hover)
4. ✅ Cache improves subsequent hovers
5. ✅ Fallback mode works without git
6. ✅ Error handling is graceful

## Next Steps

After testing is complete:
1. Document any prompt adjustments made
2. Update README with usage instructions
3. Consider adding configuration options (context lines, cache TTL)
4. Move to next feature implementation
