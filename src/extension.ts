import * as vscode from 'vscode';
import { ContinuumClient, formatApiError } from './api';
import { MemoryTreeProvider } from './sidebar';
import { ServerManager } from './server';
import {
  connectCommand,
  rememberCommand,
  recallCommand,
  showProjectContextCommand,
  syncCommand,
  pushSelectionCommand,
  editMemoryCommand,
} from './commands';

let healthTimer: ReturnType<typeof setInterval> | undefined;
let serverManager: ServerManager | undefined;

export async function activate(context: vscode.ExtensionContext) {
  let client = ContinuumClient.fromSettings();
  const treeProvider = new MemoryTreeProvider(client);

  // --- Server lifecycle management ---
  const config = vscode.workspace.getConfiguration('continuum');
  const serverManaged = config.get<boolean>('serverManaged', true);

  if (serverManaged) {
    serverManager = new ServerManager(context);
    const installed = await serverManager.ensureInstalled();
    if (installed) {
      await serverManager.start();
    }
  }

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
    } catch (err) {
      console.warn('Continuum: health check failed:', err);
      statusBar.text = '$(database) Continuum (offline)';
      statusBar.tooltip = 'Continuum: disconnected — click to retry';

      // If server is managed and died, offer restart
      if (serverManager) {
        const running = await serverManager.isRunning();
        if (!running) {
          statusBar.tooltip = 'Continuum: server stopped — click to restart';
        }
      }
    }
  }

  updateStatus();
  healthTimer = setInterval(updateStatus, 30_000);

  // --- Sidebar tree view ---
  const treeView = vscode.window.createTreeView('continuum-memories', {
    treeDataProvider: treeProvider,
  });
  context.subscriptions.push(treeView);

  // --- Auto-push on save ---
  let saveWatcher: vscode.Disposable | undefined;

  function setupAutoSave() {
    if (saveWatcher) {
      saveWatcher.dispose();
      saveWatcher = undefined;
    }

    const config = vscode.workspace.getConfiguration('continuum');
    if (!config.get<boolean>('autoPushOnSave', false)) {
      return;
    }

    let saveTimeout: ReturnType<typeof setTimeout> | undefined;

    saveWatcher = vscode.workspace.onDidSaveTextDocument(doc => {
      if (saveTimeout) { clearTimeout(saveTimeout); }
      saveTimeout = setTimeout(async () => {
        try {
          const project = await client.getWorkspaceProject();
          if (!project) { return; }
          const relativePath = vscode.workspace.asRelativePath(doc.uri);
          const lineCount = doc.lineCount;
          const lang = doc.languageId;
          await client.storeMemory(
            project.id,
            `File updated: ${relativePath} (${lineCount} lines, ${lang})`,
            'general',
            'ephemeral',
            'vscode-autosave',
            [lang],
          );
        } catch {
          // Silently ignore auto-push failures
        }
      }, 2000);
    });
    context.subscriptions.push(saveWatcher);
  }

  setupAutoSave();

  // --- Configuration change listener ---
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(e => {
      if (
        e.affectsConfiguration('continuum.serverUrl') ||
        e.affectsConfiguration('continuum.serverManaged') ||
        e.affectsConfiguration('continuum.serverPort')
      ) {
        client = ContinuumClient.fromSettings();
        treeProvider.updateClient(client);
        updateStatus();
      }
      if (e.affectsConfiguration('continuum.autoPushOnSave')) {
        setupAutoSave();
      }
    }),
  );

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
      await syncCommand(client, treeProvider);
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
        } catch (err) {
          vscode.window.showErrorMessage(formatApiError(err));
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
    vscode.commands.registerCommand(
      'continuum.editMemory',
      async (item: { memoryItem?: import('./types').MemoryItem }) => {
        if (!item?.memoryItem) { return; }
        const updated = await editMemoryCommand(client, item.memoryItem);
        if (updated) {
          treeProvider.refresh();
        }
      },
    ),
    vscode.commands.registerCommand('continuum.showServerLogs', () => {
      serverManager?.showLogs();
    }),
  );
}

export function deactivate() {
  if (healthTimer) {
    clearInterval(healthTimer);
    healthTimer = undefined;
  }
  if (serverManager) {
    serverManager.stop();
    serverManager = undefined;
  }
}
