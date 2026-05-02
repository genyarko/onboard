import { Logger } from './utils/logger';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import { executeRepoXRay } from './features/repo-xray/command';
import { executeWhyIsThisHere, clearWhyIsThisHereCache, whyIsThisHereService } from './features/why-is-this-here/command';
import { WhyIsThisHereHoverProvider } from './features/why-is-this-here/provider';
import { DayNPlanProvider, registerTreeViewCommands } from './features/day-n-plan/provider';
import { executeDayNPlan, exportDayNPlanIcs } from './features/day-n-plan/command';
import { executeFindStarterTasks } from './features/starter-tasks/command';
import { withThrottle } from './utils/throttle';

/**
 * Helper to load .env from workspace folders
 */
function loadWorkspaceEnv() {
    const folders = vscode.workspace.workspaceFolders;
    if (!folders) {return;}

    for (const folder of folders) {
        const envPath = path.join(folder.uri.fsPath, '.env');
        if (fs.existsSync(envPath)) {
            dotenv.config({ path: envPath });
            Logger.info(`Loaded environment variables from ${envPath}`);
            // We can break after first successful load or load all. Usually loading all is fine,
            // but dotenv.config doesn't override existing env vars by default.
        }
        
        // Also check one level up in case they opened the extension folder directly
        const parentEnvPath = path.join(folder.uri.fsPath, '..', '.env');
        if (fs.existsSync(parentEnvPath)) {
            dotenv.config({ path: parentEnvPath });
            Logger.info(`Loaded environment variables from ${parentEnvPath}`);
        }
    }
}

/**
 * Activates the Onboard VS Code extension.
 * This is the main entry point called by VS Code when the extension is activated.
 * @param context The extension context provided by VS Code.
 */
import { initBobClient } from './bob/client';

import { StarterTasksProvider, registerStarterTasksTreeViewCommands } from './features/starter-tasks/provider';

export function activate(context: vscode.ExtensionContext) {
    Logger.info('Onboard extension is now active');

    // Initialize Bob API Client with extension context
    initBobClient(context);
    
    // Load environment variables early
    loadWorkspaceEnv();

    // Register Starter Tasks tree view and provider
    const starterTasksProvider = new StarterTasksProvider(context);
    const starterTasksTreeView = vscode.window.createTreeView('onboard.starterTasks', {
        treeDataProvider: starterTasksProvider,
        showCollapseAll: true,
        manageCheckboxStateManually: true
    });

    starterTasksTreeView.onDidChangeCheckboxState(e => {
        e.items.forEach(([item, state]) => {
            starterTasksProvider.toggleTaskCompletion(item as any);
        });
    });
    context.subscriptions.push(starterTasksTreeView);
    registerStarterTasksTreeViewCommands(context, starterTasksProvider);

    // Register Repo X-Ray command
    const xrayCommand = vscode.commands.registerCommand('onboard.xrayRepo', withThrottle('Repo X-Ray', async () => {
        try {
            await executeRepoXRay(context);
        } catch (error) {
            Logger.error('Repo X-Ray command error:', error);
            vscode.window.showErrorMessage(
                `Repo X-Ray failed: ${error instanceof Error ? error.message : String(error)}`
            );
        }
    }, 5000));

    context.subscriptions.push(xrayCommand);

    // Register Why Is This Here as an explicit command (no auto-hover).
    const whyCommand = vscode.commands.registerCommand('onboard.whyIsThisHere', withThrottle('Why Is This Here', async () => {
        try {
            await executeWhyIsThisHere();
        } catch (error) {
            Logger.error('Why Is This Here command error:', error);
            vscode.window.showErrorMessage(
                `Why Is This Here failed: ${error instanceof Error ? error.message : String(error)}`
            );
        }
    }));
    context.subscriptions.push(whyCommand);

    const hoverProvider = vscode.languages.registerHoverProvider(
        { scheme: 'file' },
        new WhyIsThisHereHoverProvider(whyIsThisHereService)
    );
    context.subscriptions.push(hoverProvider);

    const clearWhyCacheCommand = vscode.commands.registerCommand(
        'onboard.whyIsThisHere.clearCache',
        () => {
            clearWhyIsThisHereCache();
            vscode.window.showInformationMessage('Why Is This Here cache cleared');
        }
    );
    context.subscriptions.push(clearWhyCacheCommand);

    // Create Status Bar Item for Cache Clearing
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.command = 'onboard.whyIsThisHere.clearCache';
    statusBarItem.text = '$(trash) Clear Onboard Cache';
    statusBarItem.tooltip = 'Clear Why-Is-This-Here Cache';
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);

    // Register Starter Tasks command
    const starterTasksCommand = vscode.commands.registerCommand('onboard.findStarterTasks', withThrottle('Starter Tasks', async () => {
        try {
            await executeFindStarterTasks(starterTasksProvider);
        } catch (error) {
            Logger.error('Starter Tasks command error:', error);
            vscode.window.showErrorMessage(
                `Find Starter Tasks failed: ${error instanceof Error ? error.message : String(error)}`
            );
        }
    }, 5000));
    context.subscriptions.push(starterTasksCommand);

    // Register Day-N Plan tree view and commands
    const dayNPlanProvider = new DayNPlanProvider(context);
    const treeView = vscode.window.createTreeView('onboard.dayNPlan', {
        treeDataProvider: dayNPlanProvider,
        showCollapseAll: true,
        manageCheckboxStateManually: true
    });

    treeView.onDidChangeCheckboxState(e => {
        e.items.forEach(([item, state]) => {
            // item is DayNPlanTreeItem
            dayNPlanProvider.toggleItemCompletion(item as any);
        });
    });

    context.subscriptions.push(treeView);

    // Register Day-N Plan command
    const dayNPlanCommand = vscode.commands.registerCommand('onboard.generateDayNPlan', withThrottle('Day-N Plan', async () => {
        try {
            await executeDayNPlan(dayNPlanProvider);
        } catch (error) {
            Logger.error('Day-N Plan command error:', error);
            vscode.window.showErrorMessage(
                `Day-N Plan failed: ${error instanceof Error ? error.message : String(error)}`
            );
        }
    }, 5000));

    context.subscriptions.push(dayNPlanCommand);

    const exportIcsCommand = vscode.commands.registerCommand('onboard.exportDayNPlanIcs', async () => {
        try {
            await exportDayNPlanIcs(dayNPlanProvider);
        } catch (error) {
            Logger.error('Export ICS error:', error);
            vscode.window.showErrorMessage(
                `Export failed: ${error instanceof Error ? error.message : String(error)}`
            );
        }
    });
    context.subscriptions.push(exportIcsCommand);

    // Register tree view commands
    registerTreeViewCommands(context, dayNPlanProvider);
}

/**
 * Deactivates the Onboard VS Code extension.
 * This is called by VS Code when the extension is deactivated.
 */
export function deactivate() {}