import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { Logger } from '../../utils/logger';
import { OnboardingPlan, DayPlan, ReadingItem, Task } from './schema';

/**
 * Tree item types for the Day-N Plan tree view
 */
type TreeItemType = 'day' | 'concept' | 'reading' | 'task' | 'readingSection' | 'taskSection';

/**
 * Custom tree item for Day-N Plan
 */
class DayNPlanTreeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly itemType: TreeItemType,
    public readonly data?: any,
    public readonly command?: vscode.Command
  ) {
    super(label, collapsibleState);
    this.contextValue = itemType;
    this.setIcon();
    this.setTooltip();
    
    // Add checkbox for reading and task
    if (itemType === 'reading' || itemType === 'task') {
      this.checkboxState = data?.completed ? vscode.TreeItemCheckboxState.Checked : vscode.TreeItemCheckboxState.Unchecked;
    }
  }

  private setIcon(): void {
    switch (this.itemType) {
      case 'day':
        this.iconPath = new vscode.ThemeIcon('calendar');
        break;
      case 'concept':
        this.iconPath = new vscode.ThemeIcon('lightbulb');
        break;
      case 'reading':
        this.iconPath = new vscode.ThemeIcon(this.data?.completed ? 'pass-filled' : 'book');
        break;
      case 'task':
        this.iconPath = new vscode.ThemeIcon(this.data?.completed ? 'pass-filled' : 'checklist');
        break;
      case 'readingSection':
        this.iconPath = new vscode.ThemeIcon('library');
        break;
      case 'taskSection':
        this.iconPath = new vscode.ThemeIcon('tools');
        break;
    }
  }

  private setTooltip(): void {
    switch (this.itemType) {
      case 'day':
        const dayData = this.data as DayPlan;
        this.tooltip = `${dayData.concept}\n\nGoal: ${dayData.goal}`;
        break;
      case 'concept':
        this.tooltip = `Main concept for this day`;
        break;
      case 'reading':
        const reading = this.data as ReadingItem;
        this.tooltip = `${reading.description}\n\nEstimated time: ${reading.estimatedMinutes} minutes\nPriority: ${reading.priority}`;
        break;
      case 'task':
        const task = this.data as Task;
        this.tooltip = `${task.description}\n\nEstimated time: ${task.estimatedMinutes} minutes\nDifficulty: ${task.difficulty}`;
        break;
      case 'readingSection':
        this.tooltip = 'Files and documentation to read';
        break;
      case 'taskSection':
        this.tooltip = 'Hands-on task for this day';
        break;
    }
  }
}

/**
 * Tree data provider for Day-N Plan
 * Displays the 5-day onboarding plan in a tree view
 */
export class DayNPlanProvider implements vscode.TreeDataProvider<DayNPlanTreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<DayNPlanTreeItem | undefined | null | void> =
    new vscode.EventEmitter<DayNPlanTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<DayNPlanTreeItem | undefined | null | void> =
    this._onDidChangeTreeData.event;

  private plan: OnboardingPlan | null = null;
  private workspaceRoot: string = '';
  private context: vscode.ExtensionContext;
  private planFilePath: string = '';

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders && workspaceFolders.length > 0) {
      this.workspaceRoot = workspaceFolders[0].uri.fsPath;
      this.planFilePath = path.join(this.workspaceRoot, '.onboard', 'plan.json');
    }
    
    // Attempt to restore plan from workspace file or state
    this.loadPlan();
  }

  private loadPlan() {
    if (this.planFilePath && fs.existsSync(this.planFilePath)) {
      try {
        const data = fs.readFileSync(this.planFilePath, 'utf8');
        this.plan = JSON.parse(data);
        return;
      } catch (error) {
        Logger.error('Failed to load plan from workspace', error);
      }
    }
    const savedPlan = this.context.workspaceState.get<OnboardingPlan>('onboard.dayNPlan.data');
    if (savedPlan) {
      this.plan = savedPlan;
      this.savePlanFile();
    }
  }

  private savePlanFile() {
    if (this.planFilePath && this.plan) {
      try {
        const dir = path.dirname(this.planFilePath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        // Generate IDs if missing
        this.plan.days.forEach(day => {
          day.readingList?.forEach(r => { if (!r.id) {r.id = Math.random().toString(36).substring(7);} });
          if (day.task && !day.task.id) {day.task.id = Math.random().toString(36).substring(7);}
        });
        fs.writeFileSync(this.planFilePath, JSON.stringify(this.plan, null, 2));
      } catch (error) {
        Logger.error('Failed to save plan to workspace', error);
      }
    }
    this.context.workspaceState.update('onboard.dayNPlan.data', this.plan);
  }

  public toggleItemCompletion(item: DayNPlanTreeItem) {
    if (!this.plan) {return;}
    if (item.itemType === 'reading') {
      item.data.completed = !item.data.completed;
    } else if (item.itemType === 'task') {
      item.data.completed = !item.data.completed;
    }
    this.savePlanFile();
    this.refresh();
  }

  /**
   * Update the plan and refresh the tree view
   */
  public updatePlan(plan: OnboardingPlan): void {
    this.plan = plan;
    this.savePlanFile();
    this.refresh();
  }

  /**
   * Clear the plan and refresh the tree view
   */
  public clearPlan(): void {
    this.plan = null;
    this.context.workspaceState.update('onboard.dayNPlan.data', undefined);
    if (this.planFilePath && fs.existsSync(this.planFilePath)) {
      try {
        fs.unlinkSync(this.planFilePath);
      } catch (e) {
        Logger.error('Failed to delete plan file', e);
      }
    }
    this.refresh();
  }

  public getPlan(): OnboardingPlan | null {
    return this.plan;
  }

  /**
   * Refresh the tree view
   */
  public refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  /**
   * Get tree item representation
   */
  getTreeItem(element: DayNPlanTreeItem): vscode.TreeItem {
    return element;
  }

  /**
   * Get children for a tree item
   */
  getChildren(element?: DayNPlanTreeItem): Thenable<DayNPlanTreeItem[]> {
    if (!this.plan) {
      return Promise.resolve([]);
    }

    if (!element) {
      // Root level: return all days
      return Promise.resolve(this.getDayItems());
    }

    // Get children based on item type
    switch (element.itemType) {
      case 'day':
        return Promise.resolve(this.getDayChildren(element.data as DayPlan));
      case 'readingSection':
        return Promise.resolve(this.getReadingItems(element.data as ReadingItem[]));
      case 'taskSection':
        return Promise.resolve(this.getTaskItems(element.data as Task));
      default:
        return Promise.resolve([]);
    }
  }

  /**
   * Get day items (Day 1-5)
   */
  private getDayItems(): DayNPlanTreeItem[] {
    if (!this.plan) {
      return [];
    }

    return this.plan.days.map((day) => {
      const label = `Day ${day.day}: ${day.concept}`;
      return new DayNPlanTreeItem(
        label,
        vscode.TreeItemCollapsibleState.Expanded,
        'day',
        day
      );
    });
  }

  /**
   * Get children for a day item
   */
  private getDayChildren(day: DayPlan): DayNPlanTreeItem[] {
    const children: DayNPlanTreeItem[] = [];

    // Add concept item
    children.push(
      new DayNPlanTreeItem(
        `🎯 ${day.concept}`,
        vscode.TreeItemCollapsibleState.None,
        'concept',
        day.concept
      )
    );

    // Add reading section
    if (day.readingList && day.readingList.length > 0) {
      children.push(
        new DayNPlanTreeItem(
          `📚 Reading List (${day.readingList.length} items)`,
          vscode.TreeItemCollapsibleState.Expanded,
          'readingSection',
          day.readingList
        )
      );
    }

    // Add task section
    if (day.task) {
      children.push(
        new DayNPlanTreeItem(
          `✅ Task: ${day.task.title}`,
          vscode.TreeItemCollapsibleState.Expanded,
          'taskSection',
          day.task
        )
      );
    }

    return children;
  }

  /**
   * Get reading items
   */
  private getReadingItems(readings: ReadingItem[]): DayNPlanTreeItem[] {
    return readings.map((reading) => {
      const label = `${this.getPriorityIcon(reading.priority)} ${path.basename(reading.filePath)}`;
      const filePath = this.resolveFilePath(reading.filePath);

      return new DayNPlanTreeItem(
        label,
        vscode.TreeItemCollapsibleState.None,
        'reading',
        reading,
        {
          command: 'onboard.openFile',
          title: 'Open File',
          arguments: [filePath, reading],
        }
      );
    });
  }

  /**
   * Get task items
   */
  private getTaskItems(task: Task): DayNPlanTreeItem[] {
    const items: DayNPlanTreeItem[] = [];

    // Add task description item
    items.push(
      new DayNPlanTreeItem(
        `📝 ${task.description.substring(0, 50)}${task.description.length > 50 ? '...' : ''}`,
        vscode.TreeItemCollapsibleState.None,
        'task',
        task,
        {
          command: 'onboard.showTaskDetails',
          title: 'Show Task Details',
          arguments: [task],
        }
      )
    );

    // Add starter file if available
    if (task.starterFile) {
      const filePath = this.resolveFilePath(task.starterFile);
      items.push(
        new DayNPlanTreeItem(
          `📄 Starter: ${path.basename(task.starterFile)}`,
          vscode.TreeItemCollapsibleState.None,
          'task',
          task,
          {
            command: 'onboard.openFile',
            title: 'Open Starter File',
            arguments: [filePath, task],
          }
        )
      );
    }

    // Add starter task if available
    if (task.starterTask) {
      items.push(
        new DayNPlanTreeItem(
          `🔗 ${task.starterTask}`,
          vscode.TreeItemCollapsibleState.None,
          'task',
          task,
          {
            command: 'onboard.openUrl',
            title: 'Open Starter Task',
            arguments: [task.starterTask],
          }
        )
      );
    }

    return items;
  }

  /**
   * Resolve file path to absolute path
   */
  private resolveFilePath(filePath: string): string {
    if (path.isAbsolute(filePath)) {
      return filePath;
    }
    return path.join(this.workspaceRoot, filePath);
  }

  /**
   * Get priority icon
   */
  private getPriorityIcon(priority: 'high' | 'medium' | 'low'): string {
    switch (priority) {
      case 'high':
        return '🔴';
      case 'medium':
        return '🟡';
      case 'low':
        return '🟢';
      default:
        return '⚪';
    }
  }
}

/**
 * Register commands for tree view interactions
 */
export function registerTreeViewCommands(
  context: vscode.ExtensionContext,
  provider: DayNPlanProvider
): void {
  // Command: Open file
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'onboard.openFile',
      async (filePath: string, item: ReadingItem | Task) => {
        try {
          const uri = vscode.Uri.file(filePath);
          const doc = await vscode.workspace.openTextDocument(uri);
          await vscode.window.showTextDocument(doc);
        } catch (error) {
          vscode.window.showErrorMessage(
            `Failed to open file: ${path.basename(filePath)}\n${error instanceof Error ? error.message : String(error)}`
          );
        }
      }
    )
  );

  // Command: Show task details
  context.subscriptions.push(
    vscode.commands.registerCommand('onboard.showTaskDetails', async (task: Task) => {
      const panel = vscode.window.createWebviewPanel(
        'taskDetails',
        `Task: ${task.title}`,
        vscode.ViewColumn.One,
        {}
      );

      panel.webview.html = getTaskDetailsHtml(task);
    })
  );

  // Command: Open URL
  context.subscriptions.push(
    vscode.commands.registerCommand('onboard.openUrl', async (url: string) => {
      try {
        await vscode.env.openExternal(vscode.Uri.parse(url));
      } catch (error) {
        vscode.window.showErrorMessage(
          `Failed to open URL: ${url}\n${error instanceof Error ? error.message : String(error)}`
        );
      }
    })
  );

  // Command: Refresh tree view
  context.subscriptions.push(
    vscode.commands.registerCommand('onboard.refreshDayNPlan', () => {
      provider.refresh();
      vscode.window.showInformationMessage('Day-N Plan refreshed');
    })
  );

  // Command: Clear plan
  context.subscriptions.push(
    vscode.commands.registerCommand('onboard.clearDayNPlan', () => {
      provider.clearPlan();
      vscode.window.showInformationMessage('Day-N Plan cleared');
    })
  );
}

/**
 * Generate HTML for task details webview
 */
function getTaskDetailsHtml(task: Task): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${task.title}</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            padding: 20px;
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
        }
        h1 {
            color: var(--vscode-textLink-foreground);
            border-bottom: 2px solid var(--vscode-textLink-foreground);
            padding-bottom: 10px;
        }
        .metadata {
            display: flex;
            gap: 20px;
            margin: 20px 0;
            padding: 15px;
            background-color: var(--vscode-editor-inactiveSelectionBackground);
            border-radius: 5px;
        }
        .metadata-item {
            display: flex;
            flex-direction: column;
        }
        .metadata-label {
            font-size: 0.9em;
            opacity: 0.8;
            margin-bottom: 5px;
        }
        .metadata-value {
            font-weight: bold;
        }
        .description {
            line-height: 1.6;
            margin: 20px 0;
        }
        .section {
            margin: 20px 0;
        }
        .section-title {
            font-weight: bold;
            margin-bottom: 10px;
            color: var(--vscode-textLink-foreground);
        }
        .badge {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 3px;
            font-size: 0.9em;
            font-weight: bold;
        }
        .badge-beginner {
            background-color: #4caf50;
            color: white;
        }
        .badge-intermediate {
            background-color: #ff9800;
            color: white;
        }
        .badge-advanced {
            background-color: #f44336;
            color: white;
        }
    </style>
</head>
<body>
    <h1>✅ ${task.title}</h1>
    
    <div class="metadata">
        <div class="metadata-item">
            <div class="metadata-label">Estimated Time</div>
            <div class="metadata-value">${task.estimatedMinutes} minutes</div>
        </div>
        <div class="metadata-item">
            <div class="metadata-label">Difficulty</div>
            <div class="metadata-value">
                <span class="badge badge-${task.difficulty}">${task.difficulty.toUpperCase()}</span>
            </div>
        </div>
    </div>

    <div class="section">
        <div class="section-title">📝 Description</div>
        <div class="description">${task.description.replace(/\n/g, '<br>')}</div>
    </div>

    ${
      task.starterFile
        ? `
    <div class="section">
        <div class="section-title">📄 Starter File</div>
        <code>${task.starterFile}</code>
    </div>
    `
        : ''
    }

    ${
      task.starterTask
        ? `
    <div class="section">
        <div class="section-title">🔗 Starter Task</div>
        <div>${task.starterTask}</div>
    </div>
    `
        : ''
    }
</body>
</html>`;
}
