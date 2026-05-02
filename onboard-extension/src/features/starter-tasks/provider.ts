import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { Logger } from '../../utils/logger';
import { StarterTask, StarterTasksResponse } from './schema';

class StarterTaskTreeItem extends vscode.TreeItem {
  constructor(
    public readonly task: StarterTask,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly command?: vscode.Command
  ) {
    super(task.title, collapsibleState);
    this.tooltip = `${task.description}\n\nDifficulty: ${task.difficulty}`;
    this.description = task.difficulty;
    this.contextValue = 'starterTask';
    this.checkboxState = task.completed ? vscode.TreeItemCheckboxState.Checked : vscode.TreeItemCheckboxState.Unchecked;
    
    this.setIcon();
  }

  private setIcon(): void {
    const icon = this.task.completed ? 'pass-filled' : 'rocket';
    this.iconPath = new vscode.ThemeIcon(icon);
  }
}

export class StarterTasksProvider implements vscode.TreeDataProvider<StarterTaskTreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<StarterTaskTreeItem | undefined | null | void> =
    new vscode.EventEmitter<StarterTaskTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<StarterTaskTreeItem | undefined | null | void> =
    this._onDidChangeTreeData.event;

  private tasks: StarterTask[] = [];
  private workspaceRoot: string = '';
  private context: vscode.ExtensionContext;
  private storageFilePath: string = '';

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders && workspaceFolders.length > 0) {
      this.workspaceRoot = workspaceFolders[0].uri.fsPath;
      this.storageFilePath = path.join(this.workspaceRoot, '.onboard', 'tasks.json');
    }
    
    this.loadTasks();
  }

  private loadTasks() {
    if (this.storageFilePath && fs.existsSync(this.storageFilePath)) {
      try {
        const data = fs.readFileSync(this.storageFilePath, 'utf8');
        this.tasks = JSON.parse(data);
        return;
      } catch (error) {
        Logger.error('Failed to load tasks from workspace', error);
      }
    }
    const savedTasks = this.context.workspaceState.get<StarterTask[]>('onboard.starterTasks.data');
    if (savedTasks) {
      this.tasks = savedTasks;
    }
  }

  private saveTasks() {
    if (this.storageFilePath && this.tasks.length > 0) {
      try {
        const dir = path.dirname(this.storageFilePath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(this.storageFilePath, JSON.stringify(this.tasks, null, 2));
      } catch (error) {
        Logger.error('Failed to save tasks to workspace', error);
      }
    }
    this.context.workspaceState.update('onboard.starterTasks.data', this.tasks);
  }

  public toggleTaskCompletion(item: StarterTaskTreeItem) {
    const task = this.tasks.find(t => t.id === item.task.id);
    if (task) {
      task.completed = !task.completed;
      this.saveTasks();
      this.refresh();
    }
  }

  public setTasks(tasks: StarterTask[]): void {
    // Assign IDs if missing
    this.tasks = tasks.map(t => ({
      ...t,
      id: t.id || Math.random().toString(36).substring(7),
      completed: t.completed ?? false
    }));
    
    // Sort by difficulty: easy -> medium -> hard
    const difficultyMap = { easy: 1, medium: 2, hard: 3 };
    this.tasks.sort((a, b) => difficultyMap[a.difficulty] - difficultyMap[b.difficulty]);

    this.saveTasks();
    this.refresh();
  }

  public clearTasks(): void {
    this.tasks = [];
    this.context.workspaceState.update('onboard.starterTasks.data', undefined);
    if (this.storageFilePath && fs.existsSync(this.storageFilePath)) {
      try {
        fs.unlinkSync(this.storageFilePath);
      } catch (e) {}
    }
    this.refresh();
  }

  public refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: StarterTaskTreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: StarterTaskTreeItem): Thenable<StarterTaskTreeItem[]> {
    if (element) {
      return Promise.resolve([]);
    }

    return Promise.resolve(
      this.tasks.map(task => {
        const absolutePath = path.isAbsolute(task.file) 
          ? task.file 
          : path.join(this.workspaceRoot, task.file);
          
        return new StarterTaskTreeItem(
          task,
          vscode.TreeItemCollapsibleState.None,
          {
            command: 'onboard.openTaskFile',
            title: 'Open Task File',
            arguments: [absolutePath, task.line],
          }
        );
      })
    );
  }
}

export function registerStarterTasksTreeViewCommands(
  context: vscode.ExtensionContext,
  provider: StarterTasksProvider
): void {
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'onboard.openTaskFile',
      async (filePath: string, line: number) => {
        try {
          const uri = vscode.Uri.file(filePath);
          const doc = await vscode.workspace.openTextDocument(uri);
          const editor = await vscode.window.showTextDocument(doc);
          const pos = new vscode.Position(line - 1, 0);
          editor.selection = new vscode.Selection(pos, pos);
          editor.revealRange(new vscode.Range(pos, pos), vscode.TextEditorRevealType.InCenter);
        } catch (error) {
          vscode.window.showErrorMessage(`Failed to open file: ${filePath}`);
        }
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('onboard.refreshStarterTasks', () => {
      provider.refresh();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('onboard.clearStarterTasks', () => {
      provider.clearTasks();
      vscode.window.showInformationMessage('Starter tasks cleared');
    })
  );
}
