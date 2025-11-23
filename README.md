# Continuum VSCode Extension

[![GitHub](https://img.shields.io/badge/github-FormulateAI%2Fcontinuum--vscode-blue?logo=github)](https://github.com/FormulateAI/continuum-vscode)
[![License](https://img.shields.io/badge/license-Apache--2.0-green)](LICENSE)
[![VS Code](https://img.shields.io/badge/VS%20Code-Extension-blue?logo=visualstudiocode)](https://github.com/FormulateAI/continuum-vscode)

**🔗 GitHub:** https://github.com/FormulateAI/continuum-vscode  
**📦 Main Project:** https://github.com/FormulateAI/continuum  
**🐍 PyPI Package:** https://pypi.org/project/continuum-context-hub/

---

Connect VS Code to **Continuum** - the universal context layer that lets you seamlessly switch between AI coding assistants (Cursor, Windsurf, Antigravity) without losing your development context.

## Features

- **Connect to Continuum Hub**: Establish connection to your local or remote Continuum server
- **Push Code Selections**: Send selected code snippets to the context hub for AI agents to reference
- **Seamless Integration**: Works alongside your existing AI coding tools

## Installation

### From VS Code Marketplace
```
ext install FormulateAI.continuum-vscode
```

### From Source
1. Clone the repository
2. Run `npm install`
3. Run `npm run compile`
4. Press F5 to launch extension in development mode

## Usage

### Connect to Continuum Hub

1. Open Command Palette (`Cmd+Shift+P` or `Ctrl+Shift+P`)
2. Type "Continuum: Connect to Hub"
3. Ensure your Continuum server is running on `http://localhost:8000`

### Push Code to Context

1. Select code in your editor
2. Open Command Palette
3. Type "Continuum: Push Selection to Context"
4. The selection will be stored in your context hub

## Requirements

- **Continuum Server** must be running
- Install via: `pip install continuum-context-hub`
- Start server: See [Continuum documentation](https://github.com/FormulateAI/continuum)

## Configuration

The extension connects to `http://localhost:8000` by default. To configure:

```json
{
  "continuum.serverUrl": "http://localhost:8000"
}
```

## Related Projects

- [Continuum](https://github.com/FormulateAI/continuum) - The main context hub
- [PyPI Package](https://pypi.org/project/continuum-context-hub/)

## License

Apache 2.0 - see [LICENSE](LICENSE)

## Contributing

Contributions welcome! See [CONTRIBUTING.md](CONTRIBUTING.md)
