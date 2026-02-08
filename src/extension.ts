import * as vscode from 'vscode';
import { ContinuumClient } from './api';
import { MemoryTreeProvider } from './sidebar';
import {
  connectCommand,
  rememberCommand,
  recallCommand,
  showProjectContextCommand,
  syncCommand,
  pushSelectionCommand,
} from './commands';

let healthTimer: ReturnType<typeof setInterval> | undefined;

export function activate(context: vscode.ExtensionContext) {
  const client = ContinuumClient.fromSettings();
  const treeProvider = new MemoryTreeProvider(client);

  // --- Status bar ---
  const statusBar = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    100,
  );
  statusBar.command = 'continuum.connect';
  statusBar.text = '$(database) Continuum';
  statusBar.tooltip = 'Click to check Continuum connection';
  statusBar.show();
  context.subscriptions.push(statusBar);

  async function updateStatus() {
    try {
      await client.healthCheck();
      statusBar.text = '$(database) Continuum';
      statusBar.tooltip = 'Continuum: connected';
    } catch {
      statusBar.text = '$(database) Continuum (offline)';
      statusBar.tooltip = 'Continuum: disconnected — click to retry';
    }
  }

  updateStatus();
  healthTimer = setInterval(updateStatus, 30_000);

  // --- Sidebar tree view ---
  const treeView = vscode.window.createTreeView('continuum-memories', {
    treeDataProvider: treeProvider,
  });
  context.subscriptions.push(treeView);

  // --- Commands ---
  context.subscriptions.push(
    vscode.commands.registerCommand('continuum.connect', async () => {
      const ok = await connectCommand(client);
      if (ok) {
        statusBar.text = '$(database) Continuum';
        statusBar.tooltip = 'Continuum: connected';
        treeProvider.refresh();
      }
    }),
    vscode.commands.registerCommand('continuum.remember', async () => {
      await rememberCommand(client);
      treeProvider.refresh();
    }),
    vscode.commands.registerCommand('continuum.recall', () =>
      recallCommand(client),
    ),
    vscode.commands.registerCommand('continuum.showContext', () =>
      showProjectContextCommand(client),
    ),
    vscode.commands.registerCommand('continuum.sync', async () => {
      await syncCommand(client);
      treeProvider.refresh();
    }),
    vscode.commands.registerCommand('continuum.pushSelection', async () => {
      await pushSelectionCommand(client);
      treeProvider.refresh();
    }),
    vscode.commands.registerCommand('continuum.refreshMemories', () =>
      treeProvider.refresh(),
    ),
    vscode.commands.registerCommand(
      'continuum.deleteMemory',
      async (item: { memoryItem?: { id: string } }) => {
        if (!item?.memoryItem) { return; }
        try {
          await client.deleteMemory(item.memoryItem.id);
          vscode.window.showInformationMessage('Memory deleted.');
          treeProvider.refresh();
        } catch {
          vscode.window.showErrorMessage('Failed to delete memory.');
        }
      },
    ),
    vscode.commands.registerCommand(
      'continuum.copyMemoryContent',
      async (item: { memoryItem?: { content: string } }) => {
        if (!item?.memoryItem) { return; }
        await vscode.env.clipboard.writeText(item.memoryItem.content);
        vscode.window.showInformationMessage('Copied to clipboard.');
      },
    ),
  );

  // --- Auto-push on save ---
  const config = vscode.workspace.getConfiguration('continuum');
  if (config.get<boolean>('autoPushOnSave', false)) {
    let saveTimeout: ReturnType<typeof setTimeout> | undefined;

    const saveWatcher = vscode.workspace.onDidSaveTextDocument(doc => {
      if (saveTimeout) { clearTimeout(saveTimeout); }
      saveTimeout = setTimeout(async () => {
        try {
          const project = await client.getWorkspaceProject();
          if (!project) { return; }
          await client.storeMemory(
            project.id,
            `File saved: ${vscode.workspace.asRelativePath(doc.uri)}`,
            'general',
            'ephemeral',
            'vscode-autosave',
            [doc.languageId],
          );
        } catch {
          // Silently ignore auto-push failures
        }
      }, 2000);
    });
    context.subscriptions.push(saveWatcher);
  }
}

export function deactivate() {
  if (healthTimer) {
    clearInterval(healthTimer);
    healthTimer = undefined;
  }
}
