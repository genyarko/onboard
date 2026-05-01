import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import { executeRepoXRay } from './features/repo-xray/command';
import { executeWhyIsThisHere, clearWhyIsThisHereCache } from './features/why-is-this-here/command';
import { DayNPlanProvider, registerTreeViewCommands } from './features/day-n-plan/provider';
import { executeDayNPlan } from './features/day-n-plan/command';
import { executeFindStarterTasks } from './features/starter-tasks/command';

// Helper to load .env from workspace folders
function loadWorkspaceEnv() {
    const folders = vscode.workspace.workspaceFolders;
    if (!folders) return;

    for (const folder of folders) {
        const envPath = path.join(folder.uri.fsPath, '.env');
        if (fs.existsSync(envPath)) {
            dotenv.config({ path: envPath });
            console.log(`Loaded environment variables from ${envPath}`);
            // We can break after first successful load or load all. Usually loading all is fine,
            // but dotenv.config doesn't override existing env vars by default.
        }
        
        // Also check one level up in case they opened the extension folder directly
        const parentEnvPath = path.join(folder.uri.fsPath, '..', '.env');
        if (fs.existsSync(parentEnvPath)) {
            dotenv.config({ path: parentEnvPath });
            console.log(`Loaded environment variables from ${parentEnvPath}`);
        }
    }
}

export function activate(context: vscode.ExtensionContext) {
    console.log('Onboard extension is now active');
    
    // Load environment variables early
    loadWorkspaceEnv();

    // Register Repo X-Ray command
    const xrayCommand = vscode.commands.registerCommand('onboard.xrayRepo', async () => {
        try {
            await executeRepoXRay();
        } catch (error) {
            console.error('Repo X-Ray command error:', error);
            vscode.window.showErrorMessage(
                `Repo X-Ray failed: ${error instanceof Error ? error.message : String(error)}`
            );
        }
    });

    context.subscriptions.push(xrayCommand);

    // Register Why Is This Here as an explicit command (no auto-hover).
    const whyCommand = vscode.commands.registerCommand('onboard.whyIsThisHere', async () => {
        try {
            await executeWhyIsThisHere();
        } catch (error) {
            console.error('Why Is This Here command error:', error);
            vscode.window.showErrorMessage(
                `Why Is This Here failed: ${error instanceof Error ? error.message : String(error)}`
            );
        }
    });
    context.subscriptions.push(whyCommand);

    const clearWhyCacheCommand = vscode.commands.registerCommand(
        'onboard.whyIsThisHere.clearCache',
        () => {
            clearWhyIsThisHereCache();
            vscode.window.showInformationMessage('Why Is This Here cache cleared');
        }
    );
    context.subscriptions.push(clearWhyCacheCommand);

    // Register Starter Tasks command
    const starterTasksCommand = vscode.commands.registerCommand('onboard.findStarterTasks', async () => {
        try {
            await executeFindStarterTasks();
        } catch (error) {
            console.error('Starter Tasks command error:', error);
            vscode.window.showErrorMessage(
                `Find Starter Tasks failed: ${error instanceof Error ? error.message : String(error)}`
            );
        }
    });
    context.subscriptions.push(starterTasksCommand);

    // Register Day-N Plan tree view and commands
    const dayNPlanProvider = new DayNPlanProvider(context);
    const treeView = vscode.window.createTreeView('onboard.dayNPlan', {
        treeDataProvider: dayNPlanProvider,
        showCollapseAll: true,
    });

    context.subscriptions.push(treeView);

    // Register Day-N Plan command
    const dayNPlanCommand = vscode.commands.registerCommand('onboard.generateDayNPlan', async () => {
        try {
            await executeDayNPlan(dayNPlanProvider);
        } catch (error) {
            console.error('Day-N Plan command error:', error);
            vscode.window.showErrorMessage(
                `Day-N Plan failed: ${error instanceof Error ? error.message : String(error)}`
            );
        }
    });

    context.subscriptions.push(dayNPlanCommand);

    // Register tree view commands
    registerTreeViewCommands(context, dayNPlanProvider);
}

export function deactivate() {}