# Change Log

All notable changes to the "continuum-vscode" extension will be documented in this file.

## [0.2.2] - 2026-03-10

### Changed
- Renamed all "Connect to Continuum" button labels and status bar text to **"Connect to Context Hub"** for clarity

## [0.2.1] - 2026-03-10

### Fixed
- **Port mismatch bug** — managed server starts on port 8111 but client was connecting to 8000 (the wrong default), causing connection failures for all users with default settings
- **PATH resolution** — extension now uses shell to spawn the `continuum` process, fixing failures on macOS with pyenv, conda, or virtualenv setups
- **Config reactivity** — changing `serverManaged` or `serverPort` in settings now immediately updates the active connection without requiring a reload
- **Sidebar silent failure** — sidebar now shows a clickable "Server unreachable" node instead of staying blank when the server is offline

## [0.2.0] - 2025-12-15

### Added
- **Remember command** — store memories with category and importance via Command Palette
- **Recall command** — semantic search across project memories
- **Project Context view** — browse all memories organized by category
- **Sidebar tree view** — dedicated activity bar panel showing memories grouped by category
- **Status bar indicator** — shows Continuum connection status with periodic health checks
- **Auto-push on save** — optionally push a memory on every file save (`continuum.autoPushOnSave`)
- **Delete memory** — remove individual memories from the sidebar context menu
- **Copy memory content** — copy memory text to clipboard from the sidebar
- **Welcome view** — helpful getting-started instructions when the sidebar is empty
- **Reactive configuration** — changing `serverUrl` or `autoPushOnSave` takes effect without reload
- **Better error messages** — API errors now show specific details (connection refused, timeouts, server errors)

### Changed
- Migrated all API calls from v1 to **Continuum v2 API**
- Auto-save content now includes line count and language for richer context
- Categories updated to `["AI", "Machine Learning"]` for marketplace discoverability

## [0.1.0] - 2025-11-23

### Added
- Initial release
- Connect to Continuum Hub command
- Push code selection to context command
- Basic integration with Continuum server

### Features
- Seamless connection to local Continuum server
- Push selected code snippets to context hub
- Support for multi-IDE AI agent workflows
