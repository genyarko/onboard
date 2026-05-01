import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Extension Test Suite', () => {
    vscode.window.showInformationMessage('Start all tests.');

    test('Extension should be present', () => {
        assert.ok(vscode.extensions.getExtension('undefined_publisher.onboard'));
    });

    test('Extension should activate', async () => {
        const ext = vscode.extensions.getExtension('undefined_publisher.onboard');
        assert.ok(ext);
        await ext!.activate();
        assert.strictEqual(ext!.isActive, true);
    });

    test('Should register onboard.xrayRepo command', async () => {
        const commands = await vscode.commands.getCommands(true);
        assert.ok(commands.includes('onboard.xrayRepo'));
    });

    test('Should register onboard.whyIsThisHere command', async () => {
        const commands = await vscode.commands.getCommands(true);
        assert.ok(commands.includes('onboard.whyIsThisHere'));
    });

    test('Should register onboard.whyIsThisHere.clearCache command', async () => {
        const commands = await vscode.commands.getCommands(true);
        assert.ok(commands.includes('onboard.whyIsThisHere.clearCache'));
    });

    test('Should register onboard.generateDayNPlan command', async () => {
        const commands = await vscode.commands.getCommands(true);
        assert.ok(commands.includes('onboard.generateDayNPlan'));
    });

    test('Should register onboard.refreshDayNPlan command', async () => {
        const commands = await vscode.commands.getCommands(true);
        assert.ok(commands.includes('onboard.refreshDayNPlan'));
    });

    test('Should register onboard.clearDayNPlan command', async () => {
        const commands = await vscode.commands.getCommands(true);
        assert.ok(commands.includes('onboard.clearDayNPlan'));
    });

    test('Should register onboard.findStarterTasks command', async () => {
        const commands = await vscode.commands.getCommands(true);
        assert.ok(commands.includes('onboard.findStarterTasks'));
    });
});
