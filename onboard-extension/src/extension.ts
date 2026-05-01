import * as vscode from 'vscode';
import { executeRepoXRay } from './features/repo-xray/command';
import { registerWhyIsThisHereProvider } from './features/why-is-this-here/provider';

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

    // Register Why Is This Here hover provider
    registerWhyIsThisHereProvider(context);
}

export function deactivate() {}