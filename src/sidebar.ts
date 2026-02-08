import * as vscode from 'vscode';
import { ContinuumClient } from './api';
import { MemoryItem, MemoryCategory, MEMORY_CATEGORIES } from './types';

export class MemoryTreeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly memoryItem?: MemoryItem,
    public readonly category?: MemoryCategory,
    public readonly count?: number,
  ) {
    super(label, collapsibleState);

    if (memoryItem) {
      // Leaf node — individual memory
      this.tooltip = memoryItem.content;
      this.description = memoryItem.importance;
      this.contextValue = 'memory';

      const iconMap: Record<string, vscode.ThemeIcon> = {
        critical: new vscode.ThemeIcon('error'),
        high: new vscode.ThemeIcon('warning'),
        medium: new vscode.ThemeIcon('info'),
        low: new vscode.ThemeIcon('circle-outline'),
        ephemeral: new vscode.ThemeIcon('clock'),
      };
      this.iconPath = iconMap[memoryItem.importance] ?? new vscode.ThemeIcon('circle-outline');
    } else if (category) {
      // Category group node
      this.description = count !== undefined ? `${count}` : '';
      this.contextValue = 'category';

      const catIconMap: Record<string, vscode.ThemeIcon> = {
        architecture: new vscode.ThemeIcon('symbol-structure'),
        conventions: new vscode.ThemeIcon('symbol-ruler'),
        patterns: new vscode.ThemeIcon('symbol-misc'),
        debugging: new vscode.ThemeIcon('bug'),
        decisions: new vscode.ThemeIcon('checklist'),
        preferences: new vscode.ThemeIcon('settings-gear'),
        general: new vscode.ThemeIcon('note'),
      };
      this.iconPath = catIconMap[category] ?? new vscode.ThemeIcon('folder');
    }
  }
}

export class MemoryTreeProvider implements vscode.TreeDataProvider<MemoryTreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<MemoryTreeItem | undefined | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private memoriesByCategory: Map<MemoryCategory, MemoryItem[]> = new Map();

  constructor(private client: ContinuumClient) {}

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: MemoryTreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: MemoryTreeItem): Promise<MemoryTreeItem[]> {
    if (!element) {
      // Top-level: load project context and return category nodes
      return this.getCategoryNodes();
    }

    if (element.category) {
      // Category node: return memory items under this category
      const memories = this.memoriesByCategory.get(element.category) ?? [];
      return memories.map(mem => {
        const label = mem.content.length > 60
          ? mem.content.substring(0, 60) + '…'
          : mem.content;
        return new MemoryTreeItem(
          label,
          vscode.TreeItemCollapsibleState.None,
          mem,
        );
      });
    }

    return [];
  }

  private async getCategoryNodes(): Promise<MemoryTreeItem[]> {
    this.memoriesByCategory.clear();

    try {
      const project = await this.client.getWorkspaceProject();
      if (!project) { return []; }

      const briefing = await this.client.getProjectContext(project.id);

      for (const cat of MEMORY_CATEGORIES) {
        const memories = briefing.categories[cat] ?? [];
        if (memories.length > 0) {
          this.memoriesByCategory.set(cat, memories);
        }
      }
    } catch {
      // Server unreachable — return empty tree
      return [];
    }

    const nodes: MemoryTreeItem[] = [];
    for (const [cat, memories] of this.memoriesByCategory) {
      nodes.push(
        new MemoryTreeItem(
          cat,
          vscode.TreeItemCollapsibleState.Collapsed,
          undefined,
          cat,
          memories.length,
        ),
      );
    }
    return nodes;
  }
}
