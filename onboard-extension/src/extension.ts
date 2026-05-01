import * as vscode from 'vscode';
import { executeRepoXRay } from './features/repo-xray/command';

export function activate(context: vscode.ExtensionContext) {
    console.log('Onboard extension is now active');

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
}

export function deactivate() {}