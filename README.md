# Continuum VSCode Extension

[![GitHub](https://img.shields.io/badge/github-FormulateAI%2Fcontinuum--vscode-blue?logo=github)](https://github.com/FormulateAI/continuum-vscode)
[![License](https://img.shields.io/badge/license-Apache--2.0-green)](LICENSE)
[![VS Code](https://img.shields.io/badge/VS%20Code-Extension-blue?logo=visualstudiocode)](https://github.com/FormulateAI/continuum-vscode)

Connect VS Code to **Continuum** — the universal context layer that lets you seamlessly switch between AI coding assistants (Cursor, Windsurf, Antigravity) without losing your development context.

## Getting Started

1. **Install the Continuum server**
   ```bash
   pip install continuum-context-hub
   ```

2. **Start the server**
   ```bash
   continuum serve
   ```

3. **Connect from VS Code**
   - Open the Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`)
   - Run **Continuum: Connect**
   - You should see "Connected to Continuum v..." confirmation

4. **Store your first memory**
   - Run **Continuum: Remember** from the Command Palette
   - Enter what you want to remember (e.g. "We use camelCase for all TS functions")
   - Choose a category and importance level

The Continuum sidebar panel will appear in the Activity Bar, showing all your project memories organized by category.

## How It Works

Continuum acts as a shared memory layer across your development tools. Memories you store from VS Code are available to AI agents running in Cursor, Windsurf, or any other Continuum-connected IDE — and vice versa.

```
VS Code  ──┐
Cursor   ──┤──▶  Continuum Server  ──▶  Shared Memory
Windsurf ──┘     (local / remote)       (per-project)
```

Each memory has a **category** (architecture, conventions, patterns, debugging, decisions, preferences, general) and an **importance** level (critical, high, medium, low, ephemeral) to help AI agents prioritize the most relevant context.

## Commands

| Command | Description |
|---------|-------------|
| **Continuum: Connect** | Check connection to the Continuum server |
| **Continuum: Remember** | Store a new memory with category and importance |
| **Continuum: Recall** | Search memories by semantic query |
| **Continuum: Project Context** | View all project memories in a formatted document |
| **Continuum: Sync** | Refresh and display the full project context |
| **Continuum: Push Selection** | Push the currently selected text as a memory |
| **Continuum: Refresh Memories** | Refresh the sidebar memory tree |
| **Continuum: Delete Memory** | Delete a memory (sidebar context menu) |
| **Continuum: Copy Memory Content** | Copy memory text to clipboard (sidebar context menu) |

## Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `continuum.serverUrl` | `string` | `http://localhost:8000` | URL of the Continuum server |
| `continuum.autoPushOnSave` | `boolean` | `false` | Automatically push a memory when files are saved |

Both settings take effect immediately — no reload required.

## Sidebar

The Continuum panel in the Activity Bar shows your project's memories grouped by category. Each memory displays its importance level with a distinct icon:

- **Error icon** — critical
- **Warning icon** — high
- **Info icon** — medium
- **Circle** — low
- **Clock** — ephemeral

Right-click a memory to delete it or copy its content.

## Installation

### From VS Code Marketplace
```
ext install FormulateAI.continuum-vscode
```

### From Source
1. Clone the repository
2. Run `npm install`
3. Run `npm run compile`
4. Press F5 to launch the extension in development mode

## Related Projects

- [Continuum](https://github.com/FormulateAI/continuum) — The main context hub
- [PyPI Package](https://pypi.org/project/continuum-context-hub/)

## License

Apache 2.0 — see [LICENSE](LICENSE)

## Contributing

Contributions welcome! See [CONTRIBUTING.md](CONTRIBUTING.md)
