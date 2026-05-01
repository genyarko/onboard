# Testing Day-N Plan Feature

## Overview
This document outlines the testing strategy for the Day-N Plan feature, which generates personalized 5-day onboarding plans for new team members.

## Test Environment Setup

### Prerequisites
1. VS Code with the Onboard extension installed
2. FastAPI demo repository cloned and opened in VS Code
3. Bob Shell configured and accessible
4. `.env` file with Bob API credentials

### Installation Steps
```bash
cd onboard-extension
npm install
npm run compile
# Press F5 to launch Extension Development Host
```

## Test Cases

### 1. Configuration UI Tests

#### Test 1.1: Role Selection
**Steps:**
1. Run command: `Onboard: Generate 5-Day Plan`
2. Select "Backend Engineer" from role dropdown
3. Verify the selection is captured

**Expected Result:**
- Quick pick shows all predefined roles
- Selected role is stored in config

#### Test 1.2: Custom Role Input
**Steps:**
1. Run command: `Onboard: Generate 5-Day Plan`
2. Select "Other" from role dropdown
3. Enter "Machine Learning Engineer"
4. Verify custom role is accepted

**Expected Result:**
- Input box appears for custom role
- Validation rejects empty or too short inputs
- Custom role is stored in config

#### Test 1.3: Seniority Selection
**Steps:**
1. After role selection, choose seniority level
2. Test all three options: Junior, Mid-Level, Senior

**Expected Result:**
- All seniority levels are selectable
- Selection is stored in config

#### Test 1.4: Focus Area (Optional)
**Steps:**
1. After seniority selection, choose "Specify Focus Area"
2. Enter "API Development"
3. Verify focus area is captured

**Expected Result:**
- Option to skip or specify focus area
- Input validation works correctly
- Focus area is stored in config

#### Test 1.5: Configuration Confirmation
**Steps:**
1. Complete all configuration steps
2. Review confirmation dialog
3. Test both "Generate Plan" and "Reconfigure" options

**Expected Result:**
- Confirmation shows all selected options
- "Generate Plan" proceeds to generation
- "Reconfigure" restarts the configuration flow

#### Test 1.6: Cancellation Handling
**Steps:**
1. Start configuration
2. Press ESC at various steps
3. Verify graceful cancellation

**Expected Result:**
- Cancellation at any step stops the process
- No error messages shown
- Extension remains functional

### 2. Plan Generation Tests

#### Test 2.1: Basic Plan Generation
**Steps:**
1. Configure: Backend Engineer, Mid-Level, no focus area
2. Wait for plan generation
3. Verify progress notifications

**Expected Result:**
- Progress bar shows each step
- No errors during generation
- Success message appears

#### Test 2.2: Plan with Repo X-Ray Data
**Steps:**
1. Run `Onboard: X-Ray Repository` first
2. Then run `Onboard: Generate 5-Day Plan`
3. Verify plan uses X-Ray insights

**Expected Result:**
- Plan references entry points from X-Ray
- Architecture insights are incorporated
- Reading list includes key files identified by X-Ray

#### Test 2.3: Plan without Repo X-Ray Data
**Steps:**
1. Ensure no REPO_XRAY.md exists
2. Run `Onboard: Generate 5-Day Plan`
3. Verify plan is still generated

**Expected Result:**
- Plan generation succeeds without X-Ray data
- File tree analysis is used instead
- Plan is still comprehensive

#### Test 2.4: Different Seniority Levels
**Steps:**
1. Generate plan for Junior developer
2. Generate plan for Senior developer
3. Compare task complexity and guidance

**Expected Result:**
- Junior plan has simpler tasks, more guidance
- Senior plan has complex tasks, less hand-holding
- Reading time estimates differ appropriately

#### Test 2.5: Different Roles
**Steps:**
1. Generate plan for Backend Engineer
2. Generate plan for Frontend Developer
3. Compare focus areas and file selections

**Expected Result:**
- Backend plan focuses on APIs, services, data models
- Frontend plan focuses on components, UI, state management
- Reading lists are role-appropriate

### 3. Tree View Tests

#### Test 3.1: Tree View Structure
**Steps:**
1. Generate a plan
2. Open "Day-N Plan" view in Explorer
3. Verify tree structure

**Expected Result:**
- 5 day items visible (Day 1-5)
- Each day shows: concept, reading list, task
- Tree is properly collapsible/expandable

#### Test 3.2: Day Item Display
**Steps:**
1. Expand a day item
2. Verify all child items are shown

**Expected Result:**
- Concept item with lightbulb icon
- Reading section with book icon
- Task section with checklist icon
- Proper labels and formatting

#### Test 3.3: Reading Item Click
**Steps:**
1. Expand reading list
2. Click on a reading item
3. Verify file opens

**Expected Result:**
- File opens in editor
- Correct file is opened
- No errors if file doesn't exist (graceful handling)

#### Test 3.4: Task Item Click
**Steps:**
1. Expand task section
2. Click on task description
3. Verify task details webview opens

**Expected Result:**
- Webview panel opens
- Task details are displayed correctly
- Metadata (time, difficulty) is shown

#### Test 3.5: Starter File Click
**Steps:**
1. Click on "Starter: filename" item
2. Verify file opens

**Expected Result:**
- Starter file opens in editor
- Correct file is opened

#### Test 3.6: Priority Icons
**Steps:**
1. Verify reading items show priority icons
2. Check high (🔴), medium (🟡), low (🟢) priorities

**Expected Result:**
- Icons are displayed correctly
- Tooltips show priority level

### 4. Command Tests

#### Test 4.1: Refresh Command
**Steps:**
1. Generate a plan
2. Click refresh button in tree view
3. Verify tree refreshes

**Expected Result:**
- Tree view updates
- Success message shown
- No data loss

#### Test 4.2: Clear Command
**Steps:**
1. Generate a plan
2. Click clear button in tree view
3. Verify plan is cleared

**Expected Result:**
- Tree view becomes empty
- Success message shown
- Can generate new plan

#### Test 4.3: Generate Command from Tree View
**Steps:**
1. Click calendar icon in tree view title
2. Verify command executes

**Expected Result:**
- Configuration UI appears
- Same flow as command palette

### 5. File Output Tests

#### Test 5.1: Markdown File Generation
**Steps:**
1. Generate a plan
2. Check for ONBOARDING_PLAN.md in workspace root
3. Verify content

**Expected Result:**
- File is created
- Markdown is well-formatted
- All days are included
- Metadata is correct

#### Test 5.2: View Plan Option
**Steps:**
1. After generation, click "View Plan"
2. Verify markdown file opens

**Expected Result:**
- ONBOARDING_PLAN.md opens in editor
- Content is readable
- Markdown preview works

#### Test 5.3: View in Tree Option
**Steps:**
1. After generation, click "View in Tree"
2. Verify tree view is focused

**Expected Result:**
- Day-N Plan view is focused
- Tree is expanded
- Plan is visible

### 6. Error Handling Tests

#### Test 6.1: No Workspace Open
**Steps:**
1. Close all workspace folders
2. Run `Onboard: Generate 5-Day Plan`
3. Verify error message

**Expected Result:**
- Error message: "No workspace folder is open"
- No crash or hang

#### Test 6.2: Bob API Failure
**Steps:**
1. Temporarily break Bob configuration
2. Try to generate plan
3. Verify error handling

**Expected Result:**
- Error message shown
- No crash
- Can retry after fixing configuration

#### Test 6.3: Invalid Response from Bob
**Steps:**
1. Simulate invalid JSON response (if possible)
2. Verify validation catches it

**Expected Result:**
- Validation error shown
- Clear error message
- No crash

#### Test 6.4: File System Errors
**Steps:**
1. Generate plan in read-only directory
2. Verify error handling

**Expected Result:**
- Error message about file write failure
- Tree view still works
- Can retry

### 7. Integration Tests

#### Test 7.1: FastAPI Repository Test
**Steps:**
1. Open FastAPI demo repository
2. Generate plan for Backend Engineer, Mid-Level
3. Verify plan quality

**Expected Result:**
- Plan references FastAPI-specific files
- Tasks are relevant to FastAPI development
- Reading list includes key FastAPI files

#### Test 7.2: Multiple Plan Generations
**Steps:**
1. Generate plan with one configuration
2. Generate another plan with different configuration
3. Verify second plan replaces first

**Expected Result:**
- Tree view updates with new plan
- Old plan is replaced
- No memory leaks

#### Test 7.3: Extension Reload
**Steps:**
1. Generate a plan
2. Reload VS Code window
3. Verify state

**Expected Result:**
- Tree view is empty (state not persisted)
- Can generate new plan
- No errors on reload

### 8. Performance Tests

#### Test 8.1: Large Repository
**Steps:**
1. Open a large repository (1000+ files)
2. Generate plan
3. Measure time and responsiveness

**Expected Result:**
- Generation completes in reasonable time (<2 minutes)
- UI remains responsive
- No timeout errors

#### Test 8.2: File Tree Generation
**Steps:**
1. Monitor file tree generation time
2. Verify depth limit is respected

**Expected Result:**
- File tree generation is fast (<5 seconds)
- Max depth of 4 is enforced
- Ignored directories are skipped

## Test Results Template

### Test Run Information
- **Date:** [Date]
- **Tester:** [Name]
- **Extension Version:** 0.0.1
- **VS Code Version:** [Version]
- **Repository:** FastAPI Demo

### Results Summary
| Test Case | Status | Notes |
|-----------|--------|-------|
| 1.1 Role Selection | ⬜ Pass / ⬜ Fail | |
| 1.2 Custom Role Input | ⬜ Pass / ⬜ Fail | |
| 1.3 Seniority Selection | ⬜ Pass / ⬜ Fail | |
| ... | ... | ... |

### Issues Found
1. [Issue description]
2. [Issue description]

### Recommendations
1. [Recommendation]
2. [Recommendation]

## Automated Testing (Future)

### Unit Tests Needed
- [ ] Config validation tests
- [ ] Schema validation tests
- [ ] File path resolution tests
- [ ] Markdown generation tests

### Integration Tests Needed
- [ ] Bob client mock tests
- [ ] Tree view provider tests
- [ ] Command execution tests

### E2E Tests Needed
- [ ] Full workflow tests
- [ ] Error scenario tests
- [ ] Performance tests
