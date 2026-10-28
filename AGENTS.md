# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common commands

This project uses **bun** as the package manager / task runner (see `mise.toml` for Node 22). esbuild bundles both the extension host and the webview.

- `bun install` — install dependencies
- `bun compile` — one-shot build of both bundles into `dist/` (runs `node ./esbuild.js`)
- `bun watch` — incremental rebuild during development; this is what `F5 → Run Extension` uses via `.vscode/tasks.json`
- `bun package` — production build (`NODE_ENV=production`, minified, no sourcemaps)
- `bun lint` — ESLint over `src/**/*.ts` (uses `.eslintcache`)
- `bun format` — Prettier across the repo
- `make vsix` — package into a `.vsix` (runs `bun vscode:package`, which itself runs the production build then `vsce package`)
- Press **F5** in VS Code to launch an Extension Development Host with `MODE=development` (enables dev-only sign-in helpers and the **Invalidate Token** command). The pre-launch task runs `bun watch`.

There is no automated test suite — verification is manual inside the Extension Development Host.

### Regenerating the Jutge API client

`src/jutge_api_client.ts` is **auto-generated** from `https://api.jutge.org/clients/download/typescript` — do not hand-edit it. To refresh:

```bash
cd src && ./update-client.sh
```

(uses `http` from HTTPie). The script overwrites the file in place.

## Architecture

### Two bundles, one extension

`esbuild.js` produces two independent bundles with different platforms and module formats:

- **Extension host** (`src/extension.ts` → `dist/extension.js`, CJS for Node) — VS Code APIs, HTTP, file I/O, tree views, command registration. `vscode` is marked `external`.
- **Problem webview** (`src/webview/main.ts` → `dist/webview/main.js`, ESM for the browser) — the UI rendered inside the problem panel, using `@vscode/webview-ui-toolkit`. The webview's CSS is emitted alongside as `dist/webview/main.css` (esbuild side-effect of `import "./styles/style.css"`).

The two communicate via `postMessage` with typed commands in `src/types.ts` (`VSCodeToWebviewCommand` / `WebviewToVSCodeCommand`). Some sidebar views (sign-in, timer) are _webview views_ that ship their HTML inline from their provider — they are not part of the `webview/` bundle.

The path alias **`@/` → `src/`** is configured in both `esbuild.js` and `tsconfig.json`. Use it in imports (`@/services/jutge`) rather than relative paths.

`src/webview/` is excluded from the root `tsconfig.json` and has its own `tsconfig.json` because it targets the DOM, not Node.

### API modes (normal / exam / contest)

`setJutgeApiURL({ mode, useDevApi })` in `extension.ts` switches `jutgeClient.JUTGE_API_URL` between six hosts: `{normal, exam, contest}` × `{prod, dev}`. The single `jutgeClient` instance (in `src/services/jutge.ts`) is shared across the whole extension; its `meta.token` and base URL are mutated as the user signs in/out of different modes. **Exam mode** can only reach `exam.api.jutge.org` (the production host is firewalled), so any code path that needs to check a token must temporarily swap both URL and meta — see `JutgeService.isExamTokenValid` for the canonical pattern (save → swap → restore in `finally`).

When-clause context keys gate the views in `package.json`:

- `jutge-vscode.isSignedIn.Courses` — normal mode session
- `jutge-vscode.isSignedIn.Exam` — exam or contest session
- `jutge-vscode.isContestMode` — contest specifically (subset of Exam)
- `jutge-vscode.isDevMode` — `process.env.MODE === "development"`

These are set with `vscode.commands.executeCommand("setContext", …)` and **must be initialized to concrete `false` values before any `await` in `activate()`** — otherwise VS Code evaluates the `when` clauses against `undefined` and the sign-in view stays hidden on first activation. The sign-in and timer webview view providers are also registered before `await` for the same reason.

### JutgeService and stale-while-revalidate

`JutgeService` (static class in `src/services/jutge.ts`) is the façade over `jutgeClient`. Most read methods come in pairs:

- `getXxxSWR()` — returns `{ data, onUpdate }`. `data` is whatever was cached in `globalState` under the key `this.<funcCallId>` (may be `undefined`); a background revalidation fires immediately and calls `onUpdate(newData)` if the fresh result differs (deep-equal) or `onUpdate(null)` on error. On `UnauthorizedError` the user is signed out automatically.
- `getXxx()` — `promisify` wrapper that resolves with cached data if present, otherwise waits for the first revalidation.

When adding a new cached endpoint, follow the existing pattern: give it a unique `funcCallId` (include arguments) and route through `this.SWR(...)`. Tokens are kept in `globalState` (`jutgeToken`, `jutgeExamToken`); sign-in email/password live in `SecretStorage` (`SECRET_SIGN_IN_*`). There is a one-shot migration from legacy `globalState.email` on first read.

### View landscape

The sidebar container `jutge` hosts a mix of tree views and webview views, gated by the `when` keys above. See `docs/Architecture.md` for the full table; the practical points:

- **Tree views** (courses, exams, profile, exam properties/documents, ranking, jutge-stats, jutge-api, about) — providers in `src/providers/<name>/provider.ts` (most also have `element.ts` / `item.ts`).
- **Webview views** (sign-in, timer) — registered with `registerWebviewViewProvider`; render inline HTML.
- **Webview panels** (problem viewer, dashboard, ranking) — top-level `vscode.WebviewPanel` instances.

`SubmissionService.onDidReceiveVeredict` is the cross-cutting event that updates tree icons after a submission lands; `extension.ts` wires it to `JutgeCourseTreeProvider.refreshProblem`.

### Problem view (the main interaction surface)

The problem viewer is the only view that uses the bundled `webview/main.ts`. The flow:

1. `commandShowProblem` → `WebviewPanelRegistry.createOrReveal(problemNm, order)` reveals an existing panel or constructs a new `ProblemViewPanel`.
2. `ProblemViewPanel._loadProblem` fans out `Promise.allSettled` over abstract problem, handler suppl, sample testcases, HTML statement, and custom testcases, then builds the HTML via `htmlProblemView` and assigns it to `panel.webview.html`. It constructs a `ProblemHandler` only after the metadata is loaded.
3. `ProblemHandler` (`src/services/problem-handler.ts`) handles all user actions from the webview: create/open file, run/edit testcases, run all, submit. Testcase status updates are pushed back to the webview through `VSCodeToWebviewCommand.UPDATE_TESTCASE_STATUS` / `UPDATE_CUSTOM_TESTCASE_STATUS`.
4. `WebviewPanelRegistry` is the source of truth for live panels. Workspace `onDidCreate/Delete/SaveFiles` events route through `updatePanelsOnChangedFiles` so panels can refresh their "Open Existing File" button and custom-testcase list when matching source files change. Filename → problem number is resolved by `getProblemIdFromFilename`.
5. `ProblemViewPanelSerializer` restores panels across reloads (registered for `viewType = "problemView"`; `activationEvents` includes `onWebviewPanel:problemView`).

When adding a new webview message, extend both enums in `src/types.ts` and handle it in `ProblemViewPanel._handleMessage` (extension side) and `addEventListeners` / `onEvent` (webview side).

### Submission flow

`SubmissionService.submitProblem` reads the file, picks `compiler_id` from `problem.handler.compilers` (first space-separated entry), falls back to the default for the language, calls `JutgeService.submit`, then polls `JutgeService.getSubmission` every `MONITOR_INTERVAL_MS` until the verdict is no longer `Pending`. It pushes `UPDATE_SUBMISSION_STATUS` to the webview throughout and fires `onDidReceiveVeredict` so tree icons update.

### Language runners

`src/services/runners/languages.ts` is a registry keyed by `Proglang` (`C++`, `Python`, `GHC`). Each entry pairs a `LanguageRunner` implementation (in `runners/languages/*.ts`) with file extensions, a comment prefix (used by `FileService.makeHeader`), a MIME type (for submission), and a list of Jutge compiler IDs.

Runners use `child_process.spawnSync` and only spawn a terminal when there are errors (compile or runtime), routing diagnostics through `errors.ts`. Adding a language means: implementing `LanguageRunner.run`, adding the entry to `__languages`, and updating the `jutge-vscode.runner.*` settings in `package.json` if compile flags are configurable.

C++ on Windows: if the user's compiler command is `cl` (MSVC), the flags shape changes (`/Fe`, `/EHsc`, `/std:c++20`) — see `README.md` for the bat-file setup users need. Don't assume `g++`-style invocation.

### Extension dependencies

`package.json#extensionDependencies` requires **`ms-python.python`** (so `ConfigService` can resolve the Python interpreter via the official Python API) and **`tomoki1207.pdf`** (PDF preview for exam documents; `commandOpenExamDocument` falls back to `vscode.openExternal` if the preview command fails).

### Logging

`Logger` / `StaticLogger` in `src/loggers.ts` are mixins: extend them and call `this.log.info(...)` / `this.log.error(...)`. Messages are prefixed with `[ClassName]:`. Use them in preference to bare `console.*` so logs stay greppable.
