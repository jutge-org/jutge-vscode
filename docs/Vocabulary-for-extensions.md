# Vocabulary — main elements of a VS Code extension

This document explains the usual terms you will see when reading or building a Visual Studio Code extension. It is generic (not specific to Jutge), but matches how the official API and `package.json` contributions are described.

For the full reference, see the [Extension API](https://code.visualstudio.com/api) documentation.

---

## Extension package

An **extension** is a folder (or `.vsix` archive) that contains a **`package.json`** manifest at its root. That manifest declares metadata (name, version, publisher), the **entry module**, and **contributions** (what the extension adds to the editor).

---

## Entry point and `main`

**`main`** in `package.json` points to the JavaScript file VS Code loads first — typically something like `./dist/extension.js` after a build step. That file must export at least an **`activate`** function.

---

## Activation

**Activation** is the moment VS Code loads your extension code into the **extension host** (a separate Node.js process from the UI).

- **`activationEvents`** in `package.json` declare _when_ loading may happen (for example `onCommand:...`, `onLanguage:...`, `onStartupFinished`, `workspaceContains:...`, or `onWebviewPanel:...`).
- If the list is empty or uses `"*"` (discouraged for performance), the extension can load very early.

Until activation runs, your module is not executed; only the manifest is known.

---

## `activate` and `deactivate`

- **`activate(context)`** — async-capable function VS Code calls when activation triggers. You register commands, providers, listeners, and push disposables onto **`context.subscriptions`** so they are cleaned up when the extension is disabled or uninstalled.
- **`deactivate()`** — optional; called on shutdown. Use it only for synchronous teardown if needed; prefer disposables for most cleanup.

---

## Extension host

The **extension host** is the process where extension code runs. It has access to the **`vscode`** module (the Extension API). It is _not_ the same as the Electron renderer that draws the editor UI, which is why some work is done via messaging (for example **webviews**).

---

## `ExtensionContext`

The **`vscode.ExtensionContext`** object passed to `activate` represents this activation of your extension. It provides:

- **`subscriptions`** — array of **disposables** to dispose when the extension stops
- **`extensionUri` / `extensionPath`** — where your extension files live on disk
- **`globalState` / `workspaceState`** — simple key–value persistence (global vs per workspace)
- **`secrets`** — secure storage for tokens
- **`storageUri`** — folder for large or arbitrary files managed by the extension

---

## Contributions (`contributes`)

The **`contributes`** section in `package.json` declares static integration points: **commands**, **menus**, **views**, **keybindings**, **configuration** (settings schema), **languages**, **grammars**, **debuggers**, **themes**, and more. VS Code reads this _without_ running your code, to build menus and UI.

---

## Commands

A **command** is a string id (often `publisher.extension.commandName`) registered in code with `vscode.commands.registerCommand`. It can be bound to the Command Palette, menus, buttons, or called from other extensions via `vscode.commands.executeCommand`.

**`executeCommand`** can also run built-in VS Code commands (for example `vscode.openFolder`).

---

## When clauses and context keys

**When clauses** are boolean expressions in `package.json` (menus, views, etc.) that show or enable UI based on **context keys** — string flags maintained by VS Code or by extensions via `vscode.commands.executeCommand('setContext', key, value)`.

Examples of built-in keys: `editorLangId`, `resourceScheme`. Extensions often define keys like `myExtension.isLoggedIn`.

---

## Configuration (settings)

**Configuration** is user-editable settings under a contribution like `"configuration": { "properties": { ... } }`. In code you read them with `vscode.workspace.getConfiguration('sectionId')`. Values can be **workspace-scoped** or **global** depending on scope arguments.

---

## Workspace

A **workspace** is the opened project context: one root folder (**single-folder workspace**) or a **multi-root workspace** file (`.code-workspace`) with several folders. **`vscode.workspace`** exposes folders, configuration, documents, and file-change events.

**`WorkspaceFolder`** — one entry in `workspace.workspaceFolders`; has `uri`, `name`, `index`.

---

## Editor and documents

- **`TextDocument`** — the content model of a file (text, language id, uri); may be dirty or not on disk.
- **`TextEditor`** — a view onto a document in an editor group; has `selection`, `visibleRanges`.
- **`NotebookEditor`** — analogous for notebooks.

Opening or saving files fires workspace or document events; edits go through a **`TextEditorEdit`** or workspace **`WorkspaceEdit`**.

---

## Disposables

A **disposable** is an object with a **`dispose()`** method that releases listeners, timers, or UI registrations. Registering almost anything in the API returns a `Disposable`. Pushing them to **`context.subscriptions`** ties their lifetime to the extension.

---

## Views and the activity bar

**Views** live in **view containers** (for example the **activity bar** strip on the side, or the panel). You contribute a **container** (`viewsContainers`) and **views** inside it (`views`).

A **Tree view** is created with `vscode.window.createTreeView` and a **`TreeDataProvider`**, which supplies nodes and tells VS Code when data changes (`onDidChangeTreeData`).

A **Webview view** is a small HTML view embedded in the sidebar or panel (different from a **Webview panel** in an editor area).

---

## Webview panel

A **webview** is HTML/CSS/JS running in an isolated **browser origin** inside VS Code. A **`WebviewPanel`** is usually shown in an **editor column** like a document tab.

The extension host sets HTML with **`webview.html`** (or equivalent) and exchanges JSON messages with **`postMessage`** / **`onDidReceiveMessage`**. Scripts and assets typically come from **`asWebviewUri`** so content is allowed under your extension’s **local resource roots**.

A **`WebviewPanelSerializer`** lets VS Code **restore** a panel after reload if you contributed the right activation event.

---

## Progress, notifications, inputs

- **`window.showInformationMessage` / `showErrorMessage` / `showWarningMessage`** — modal or actionable toasts.
- **`window.withProgress`** — progress in the status bar or notification.
- **`window.showInputBox` / `showQuickPick`** — simple user input flows.

---

## Tasks, terminals, debug

- **Tasks** — contributed in `package.json` or created via API; run build scripts etc.
- **`Terminal`** — created with `createTerminal`; extension can send text or reveal it.
- **Debug** — `debug` contributions and `vscode.debug` API for starting sessions and breakpoints (advanced topic).

---

## Language features (LSP-style)

Extensions can register **providers**: completion, hover, definition, code actions, diagnostics, formatting, etc. Each is a function or class VS Code calls when relevant. Heavy language servers often run as a **separate process** and speak **LSP**; lightweight logic can stay in-process.

---

## Extension dependencies

**`extensionDependencies`** in `package.json` list other extension ids that must be installed; your code can then use **`vscode.extensions.getExtension`** and that extension’s exports if it exposes an API.

---

## Publishing vocabulary

- **Publisher** — identity on the Marketplace.
- **`.vsix`** — packaged extension file produced by **`vsce package`**.
- **Pre-release** — semver and marketplace flag for beta channels.

---

## How this maps to reading code

| Term                   | Typical first encounter                     |
| ---------------------- | ------------------------------------------- |
| `package.json`         | What the extension declares to VS Code      |
| `activate`             | Where registration and wiring happen        |
| `ExtensionContext`     | Subscriptions, paths, persisted state       |
| `contributes.commands` | Palette / menu ids you implement            |
| `createTreeView`       | Sidebar trees                               |
| `createWebviewPanel`   | Rich HTML UI in an editor column            |
| `getConfiguration`     | User settings your code reads               |
| `Disposable`           | Cleanup pattern for everything you register |

---

_This file is a glossary for onboarding; for Jutge-specific structure, see `ARCHITECTURE.md`._
