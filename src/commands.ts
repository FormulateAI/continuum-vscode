import * as vscode from 'vscode';
import { ContinuumClient, formatApiError } from './api';
import { MEMORY_CATEGORIES, IMPORTANCE_LEVELS, MemoryCategory, Importance, MemoryItem } from './types';

export async function connectCommand(client: ContinuumClient): Promise<boolean> {
  try {
    const info = await client.healthCheck();
    vscode.window.showInformationMessage(
      `Connected to Continuum v${info.version}`,
    );
    return true;
  } catch (err) {
    vscode.window.showErrorMessage(formatApiError(err));
    return false;
  }
}

export async function rememberCommand(client: ContinuumClient): Promise<void> {
  const project = await client.getWorkspaceProject();
  if (!project) {
    vscode.window.showWarningMessage('No workspace folder open.');
    return;
  }

  const content = await vscode.window.showInputBox({
    prompt: 'What should Continuum remember?',
    placeHolder: 'e.g. We use camelCase for all TypeScript functions',
  });
  if (!content) { return; }

  const categoryPick = await vscode.window.showQuickPick(
    MEMORY_CATEGORIES.map(c => ({ label: c })),
    { placeHolder: 'Select a category' },
  );
  if (!categoryPick) { return; }

  const importancePick = await vscode.window.showQuickPick(
    IMPORTANCE_LEVELS.map(i => ({ label: i })),
    { placeHolder: 'Select importance level' },
  );
  if (!importancePick) { return; }

  try {
    await client.storeMemory(
      project.id,
      content,
      categoryPick.label as MemoryCategory,
      importancePick.label as Importance,
      'vscode',
    );
    vscode.window.showInformationMessage('Memory stored.');
  } catch (err) {
    vscode.window.showErrorMessage(formatApiError(err));
  }
}

export async function recallCommand(client: ContinuumClient): Promise<void> {
  const project = await client.getWorkspaceProject();
  if (!project) {
    vscode.window.showWarningMessage('No workspace folder open.');
    return;
  }

  const query = await vscode.window.showInputBox({
    prompt: 'Search memories',
    placeHolder: 'e.g. naming conventions',
  });
  if (!query) { return; }

  try {
    const results = await client.searchMemories(query, project.id);
    if (results.length === 0) {
      vscode.window.showInformationMessage('No memories found.');
      return;
    }

    const items = results.map(r => ({
      label: r.content.length > 80 ? r.content.substring(0, 80) + '\u2026' : r.content,
      detail: `Score: ${r.score.toFixed(2)}`,
      content: r.content,
    }));

    const picked = await vscode.window.showQuickPick(items, {
      placeHolder: 'Select a memory to view',
    });
    if (!picked) { return; }

    const doc = await vscode.workspace.openTextDocument({
      content: picked.content,
      language: 'markdown',
    });
    await vscode.window.showTextDocument(doc, { preview: true });
  } catch (err) {
    vscode.window.showErrorMessage(formatApiError(err));
  }
}

export async function showProjectContextCommand(
  client: ContinuumClient,
): Promise<void> {
  const project = await client.getWorkspaceProject();
  if (!project) {
    vscode.window.showWarningMessage('No workspace folder open.');
    return;
  }

  try {
    const briefing = await client.getProjectContext(project.id);

    const lines: string[] = [
      `# ${briefing.project.name} — Project Context`,
      '',
      `**Memories:** ${briefing.memory_count}`,
      '',
    ];

    for (const [category, memories] of Object.entries(briefing.categories)) {
      if (memories.length === 0) { continue; }
      lines.push(`## ${category} (${memories.length})`);
      lines.push('');
      for (const mem of memories) {
        const badge = mem.importance === 'critical' ? '🔴' :
                      mem.importance === 'high' ? '🟠' : '';
        lines.push(`- ${badge} ${mem.content}`);
      }
      lines.push('');
    }

    const doc = await vscode.workspace.openTextDocument({
      content: lines.join('\n'),
      language: 'markdown',
    });
    await vscode.window.showTextDocument(doc, { preview: true });
  } catch (err) {
    vscode.window.showErrorMessage(formatApiError(err));
  }
}

export async function syncCommand(
  client: ContinuumClient,
  treeProvider: { refresh(): void },
): Promise<void> {
  await showProjectContextCommand(client);
  treeProvider.refresh();
  vscode.window.showInformationMessage('Continuum: Sidebar refreshed.');
}

export async function pushSelectionCommand(
  client: ContinuumClient,
): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showWarningMessage('No active editor found.');
    return;
  }

  const text = editor.document.getText(editor.selection);
  if (!text) {
    vscode.window.showWarningMessage('No text selected.');
    return;
  }

  const project = await client.getWorkspaceProject();
  if (!project) {
    vscode.window.showWarningMessage('No workspace folder open.');
    return;
  }

  const categoryPick = await vscode.window.showQuickPick(
    MEMORY_CATEGORIES.map(c => ({ label: c })),
    { placeHolder: 'Select a category for this selection' },
  );
  if (!categoryPick) { return; }

  const importancePick = await vscode.window.showQuickPick(
    IMPORTANCE_LEVELS.map(i => ({ label: i })),
    { placeHolder: 'Select importance level' },
  );
  if (!importancePick) { return; }

  try {
    await client.storeMemory(
      project.id,
      text,
      categoryPick.label as MemoryCategory,
      importancePick.label as Importance,
      'vscode-selection',
      [],
    );
    vscode.window.showInformationMessage('Selection pushed to Continuum.');
  } catch (err) {
    vscode.window.showErrorMessage(formatApiError(err));
  }
}

export async function editMemoryCommand(
  client: ContinuumClient,
  memoryItem: MemoryItem,
): Promise<boolean> {
  const content = await vscode.window.showInputBox({
    prompt: 'Edit memory content',
    value: memoryItem.content,
  });
  if (content === undefined) { return false; }

  const categoryPick = await vscode.window.showQuickPick(
    MEMORY_CATEGORIES.map(c => ({
      label: c,
      picked: c === memoryItem.category,
    })),
    { placeHolder: 'Select category' },
  );
  if (!categoryPick) { return false; }

  const importancePick = await vscode.window.showQuickPick(
    IMPORTANCE_LEVELS.map(i => ({
      label: i,
      picked: i === memoryItem.importance,
    })),
    { placeHolder: 'Select importance' },
  );
  if (!importancePick) { return false; }

  try {
    await client.updateMemory(memoryItem.id, {
      content,
      category: categoryPick.label as MemoryCategory,
      importance: importancePick.label as Importance,
    });
    vscode.window.showInformationMessage('Memory updated.');
    return true;
  } catch (err) {
    vscode.window.showErrorMessage(formatApiError(err));
    return false;
  }
}
