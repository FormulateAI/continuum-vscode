import * as vscode from 'vscode';
import { ContinuumClient, formatApiError } from './api';
import { MEMORY_CATEGORIES, IMPORTANCE_LEVELS, MemoryCategory, Importance, MemoryItem } from './types';

const CATEGORY_ITEMS = [
  { label: '$(symbol-structure) architecture',  description: 'System design, service structure, data flow', value: 'architecture' as MemoryCategory },
  { label: '$(symbol-ruler) conventions',       description: 'Naming rules, formatting standards, code style', value: 'conventions' as MemoryCategory },
  { label: '$(symbol-misc) patterns',           description: 'Reusable solutions and design patterns in use', value: 'patterns' as MemoryCategory },
  { label: '$(bug) debugging',                  description: 'Known issues, gotchas, troubleshooting steps', value: 'debugging' as MemoryCategory },
  { label: '$(checklist) decisions',            description: 'Architectural decisions, trade-offs, rationale', value: 'decisions' as MemoryCategory },
  { label: '$(settings-gear) preferences',      description: 'Team preferences, tooling and workflow choices', value: 'preferences' as MemoryCategory },
  { label: '$(note) general',                   description: 'Notes that do not fit other categories', value: 'general' as MemoryCategory },
];

const IMPORTANCE_ITEMS = [
  { label: '$(error) critical',   description: 'Must-know — affects every code change', value: 'critical' as Importance },
  { label: '$(warning) high',     description: 'Important context — frequently relevant', value: 'high' as Importance },
  { label: '$(info) medium',      description: 'Useful to know — situationally relevant', value: 'medium' as Importance },
  { label: '$(circle-outline) low', description: 'Nice to have — rarely needed', value: 'low' as Importance },
  { label: '$(clock) ephemeral',  description: 'Temporary note — can be deleted soon', value: 'ephemeral' as Importance },
];

export async function connectCommand(client: ContinuumClient): Promise<boolean> {
  try {
    const info = await client.healthCheck();
    vscode.window.showInformationMessage(
      `Context Hub connected — server v${info.version}`,
    );
    return true;
  } catch (err) {
    vscode.window.showErrorMessage(formatApiError(err));
    return false;
  }
}

export async function rememberCommand(client: ContinuumClient): Promise<void> {
  try {
    const project = await client.getWorkspaceProject();
    if (!project) {
      vscode.window.showWarningMessage('Open a workspace folder first.');
      return;
    }

    const content = await vscode.window.showInputBox({
      title: 'Save to Context Hub',
      prompt: 'What should your team and AI agents remember about this project?',
      placeHolder: 'e.g. We use PostgreSQL with Prisma ORM — never write raw SQL',
      validateInput: v => v.trim().length < 5 ? 'Please enter at least 5 characters.' : undefined,
    });
    if (!content) { return; }

    const categoryPick = await vscode.window.showQuickPick(CATEGORY_ITEMS, {
      title: 'Context Hub: Choose Category',
      placeHolder: 'How should this memory be categorised?',
      matchOnDescription: true,
    });
    if (!categoryPick) { return; }

    const importancePick = await vscode.window.showQuickPick(IMPORTANCE_ITEMS, {
      title: 'Context Hub: Choose Importance',
      placeHolder: 'How important is this for AI agents to know?',
      matchOnDescription: true,
    });
    if (!importancePick) { return; }

    await client.storeMemory(
      project.id,
      content.trim(),
      categoryPick.value,
      importancePick.value,
      'vscode',
    );
    vscode.window.showInformationMessage(`Memory saved to Context Hub (${categoryPick.value}).`);
  } catch (err) {
    vscode.window.showErrorMessage(formatApiError(err));
  }
}

export async function recallCommand(client: ContinuumClient): Promise<void> {
  try {
    const project = await client.getWorkspaceProject();
    if (!project) {
      vscode.window.showWarningMessage('Open a workspace folder first.');
      return;
    }

    const query = await vscode.window.showInputBox({
      title: 'Context Hub: Search Memories',
      prompt: 'Search your project knowledge base',
      placeHolder: 'e.g. database setup, auth flow, naming conventions, deployment',
    });
    if (!query) { return; }

    const results = await client.searchMemories(query, project.id);
    if (results.length === 0) {
      vscode.window.showInformationMessage(`No memories found for "${query}". Try a broader search term.`);
      return;
    }

    const items = results.map(r => ({
      label: r.content.length > 80 ? r.content.substring(0, 80) + '\u2026' : r.content,
      detail: `Relevance: ${Math.round(r.score * 100)}%`,
      content: r.content,
    }));

    const picked = await vscode.window.showQuickPick(items, {
      title: `Context Hub: ${results.length} result(s) for "${query}"`,
      placeHolder: 'Select a memory to view in full',
      matchOnDetail: true,
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
  try {
    const project = await client.getWorkspaceProject();
    if (!project) {
      vscode.window.showWarningMessage('Open a workspace folder first.');
      return;
    }

    const briefing = await client.getProjectContext(project.id);

    const lines: string[] = [
      `# ${briefing.project.name} — Project Context`,
      '',
      `> **${briefing.memory_count} memories** stored in Context Hub`,
      '',
      '---',
      '',
    ];

    const categoryOrder = ['architecture', 'conventions', 'patterns', 'decisions', 'debugging', 'preferences', 'general'];
    const sortedEntries = Object.entries(briefing.categories)
      .filter(([, memories]) => memories.length > 0)
      .sort(([a], [b]) => categoryOrder.indexOf(a) - categoryOrder.indexOf(b));

    for (const [category, memories] of sortedEntries) {
      lines.push(`## ${category.charAt(0).toUpperCase() + category.slice(1)} (${memories.length})`);
      lines.push('');
      for (const mem of memories) {
        const badge =
          mem.importance === 'critical' ? '🔴 ' :
          mem.importance === 'high'     ? '🟠 ' : '';
        lines.push(`- ${badge}${mem.content}`);
      }
      lines.push('');
    }

    if (sortedEntries.length === 0) {
      lines.push('_No memories saved yet. Use **Context Hub: Save Memory** to get started._');
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
  vscode.window.showInformationMessage('Context Hub: sidebar refreshed.');
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
  if (!text.trim()) {
    vscode.window.showWarningMessage('No text selected. Highlight code or text to save it as a memory.');
    return;
  }

  try {
    const project = await client.getWorkspaceProject();
    if (!project) {
      vscode.window.showWarningMessage('Open a workspace folder first.');
      return;
    }

    const categoryPick = await vscode.window.showQuickPick(CATEGORY_ITEMS, {
      title: 'Context Hub: Categorise Selection',
      placeHolder: 'How should this selection be categorised?',
      matchOnDescription: true,
    });
    if (!categoryPick) { return; }

    const importancePick = await vscode.window.showQuickPick(IMPORTANCE_ITEMS, {
      title: 'Context Hub: Choose Importance',
      placeHolder: 'How important is this for AI agents to know?',
      matchOnDescription: true,
    });
    if (!importancePick) { return; }

    await client.storeMemory(
      project.id,
      text.trim(),
      categoryPick.value,
      importancePick.value,
      'vscode-selection',
      [],
    );
    vscode.window.showInformationMessage(`Selection saved to Context Hub (${categoryPick.value}).`);
  } catch (err) {
    vscode.window.showErrorMessage(formatApiError(err));
  }
}

export async function editMemoryCommand(
  client: ContinuumClient,
  memoryItem: MemoryItem,
): Promise<boolean> {
  const content = await vscode.window.showInputBox({
    title: 'Context Hub: Edit Memory',
    prompt: 'Update the memory content',
    value: memoryItem.content,
    validateInput: v => v.trim().length < 5 ? 'Please enter at least 5 characters.' : undefined,
  });
  if (content === undefined) { return false; }

  const categoryPick = await vscode.window.showQuickPick(
    CATEGORY_ITEMS.map(c => ({ ...c, picked: c.value === memoryItem.category })),
    {
      title: 'Context Hub: Update Category',
      placeHolder: 'Choose a category',
      matchOnDescription: true,
    },
  );
  if (!categoryPick) { return false; }

  const importancePick = await vscode.window.showQuickPick(
    IMPORTANCE_ITEMS.map(i => ({ ...i, picked: i.value === memoryItem.importance })),
    {
      title: 'Context Hub: Update Importance',
      placeHolder: 'Choose importance level',
      matchOnDescription: true,
    },
  );
  if (!importancePick) { return false; }

  try {
    await client.updateMemory(memoryItem.id, {
      content: content.trim(),
      category: categoryPick.value,
      importance: importancePick.value,
    });
    vscode.window.showInformationMessage('Memory updated.');
    return true;
  } catch (err) {
    vscode.window.showErrorMessage(formatApiError(err));
    return false;
  }
}
