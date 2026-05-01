import * as vscode from 'vscode';
import { PlanConfig } from './schema';

/**
 * Predefined role options for the onboarding plan
 */
const ROLE_OPTIONS = [
  { label: 'Backend Engineer', description: 'Focus on APIs, services, and data models' },
  { label: 'Frontend Developer', description: 'Focus on UI components and user interactions' },
  { label: 'Full-Stack Developer', description: 'Balance between frontend and backend' },
  { label: 'DevOps Engineer', description: 'Focus on infrastructure and deployment' },
  { label: 'QA Engineer', description: 'Focus on testing and quality assurance' },
  { label: 'Mobile Developer', description: 'Focus on mobile app development' },
  { label: 'Data Engineer', description: 'Focus on data pipelines and analytics' },
  { label: 'Other', description: 'Specify a custom role' },
];

/**
 * Seniority level options
 */
const SENIORITY_OPTIONS = [
  { label: 'Junior', value: 'junior' as const, description: 'Entry-level, needs more guidance' },
  { label: 'Mid-Level', value: 'mid' as const, description: 'Experienced, moderate independence' },
  { label: 'Senior', value: 'senior' as const, description: 'Highly experienced, minimal guidance' },
];

/**
 * Collects configuration from the user through VS Code UI
 * Returns null if the user cancels at any step
 */
export async function collectPlanConfig(): Promise<PlanConfig | null> {
  // Step 1: Select role
  const roleSelection = await vscode.window.showQuickPick(ROLE_OPTIONS, {
    placeHolder: 'Select the role of the new team member',
    title: 'Day-N Plan: Role Selection',
    ignoreFocusOut: true,
  });

  if (!roleSelection) {
    return null; // User cancelled
  }

  let role = roleSelection.label;

  // If "Other" was selected, prompt for custom role
  if (role === 'Other') {
    const customRole = await vscode.window.showInputBox({
      prompt: 'Enter the custom role',
      placeHolder: 'e.g., Machine Learning Engineer, Security Engineer',
      title: 'Day-N Plan: Custom Role',
      ignoreFocusOut: true,
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Role cannot be empty';
        }
        if (value.trim().length < 3) {
          return 'Role must be at least 3 characters';
        }
        return null;
      },
    });

    if (!customRole) {
      return null; // User cancelled
    }

    role = customRole.trim();
  }

  // Step 2: Select seniority level
  const senioritySelection = await vscode.window.showQuickPick(SENIORITY_OPTIONS, {
    placeHolder: 'Select the seniority level',
    title: 'Day-N Plan: Seniority Level',
    ignoreFocusOut: true,
  });

  if (!senioritySelection) {
    return null; // User cancelled
  }

  const seniority = senioritySelection.value;

  // Step 3: Optional focus area
  const focusAreaOptions = [
    { label: 'Skip', description: 'No specific focus area' },
    { label: 'Specify Focus Area', description: 'Enter a specific area to focus on' },
  ];

  const focusAreaChoice = await vscode.window.showQuickPick(focusAreaOptions, {
    placeHolder: 'Do you want to specify a focus area? (Optional)',
    title: 'Day-N Plan: Focus Area',
    ignoreFocusOut: true,
  });

  if (!focusAreaChoice) {
    return null; // User cancelled
  }

  let focusArea: string | undefined;

  if (focusAreaChoice.label === 'Specify Focus Area') {
    const focusAreaInput = await vscode.window.showInputBox({
      prompt: 'Enter the specific focus area',
      placeHolder: 'e.g., API development, UI components, Database optimization',
      title: 'Day-N Plan: Focus Area',
      ignoreFocusOut: true,
      validateInput: (value) => {
        if (value && value.trim().length > 0 && value.trim().length < 3) {
          return 'Focus area must be at least 3 characters if provided';
        }
        return null;
      },
    });

    if (focusAreaInput === undefined) {
      return null; // User cancelled
    }

    focusArea = focusAreaInput.trim() || undefined;
  }

  // Return the collected configuration
  return {
    role,
    seniority,
    focusArea,
  };
}

/**
 * Shows a confirmation dialog with the collected configuration
 * Returns true if user confirms, false if they want to reconfigure
 */
export async function confirmPlanConfig(config: PlanConfig): Promise<boolean> {
  const focusAreaText = config.focusArea ? `\nFocus Area: ${config.focusArea}` : '';
  
  const message = `Generate a 5-day onboarding plan with the following configuration?\n\nRole: ${config.role}\nSeniority: ${config.seniority}${focusAreaText}`;

  const choice = await vscode.window.showInformationMessage(
    message,
    { modal: true },
    'Generate Plan',
    'Reconfigure'
  );

  return choice === 'Generate Plan';
}

/**
 * Main function to collect and confirm plan configuration
 * Handles the full configuration flow with retry logic
 */
export async function getPlanConfiguration(): Promise<PlanConfig | null> {
  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
    attempts++;

    const config = await collectPlanConfig();
    
    if (!config) {
      // User cancelled during collection
      return null;
    }

    const confirmed = await confirmPlanConfig(config);
    
    if (confirmed) {
      return config;
    }

    // User wants to reconfigure, loop continues
    if (attempts >= maxAttempts) {
      vscode.window.showWarningMessage('Maximum configuration attempts reached. Operation cancelled.');
      return null;
    }
  }

  return null;
}
