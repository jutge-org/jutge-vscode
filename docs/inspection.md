# Security and reliability inspection (jutge-vscode)

This document reviews likely **bugs**, **security weaknesses**, and **operational risks** in the extension as of a static read of the repository. It is not a penetration test and does not replace dependency scanning or formal threat modeling.

---

## Summary

| Area                         | Risk level | Notes                                                                            |
| ---------------------------- | ---------- | -------------------------------------------------------------------------------- |
| Session tokens in storage    | Medium     | Course/exam tokens live in `globalState`, not `SecretStorage`.                   |
| Problem statement HTML       | Medium     | Server HTML is embedded in the webview; CSP limits scripts but not all abuse.    |
| User-tuned runners / tools   | Medium     | Configurable compilers and `compare` execution run user-controlled paths/flags.  |
| API client robustness        | Low–Medium | Missing `Content-Type` can throw; env-based URL/headers affect trust boundaries. |
| Webview ↔ extension messages | Low        | Problem panel trusts message shape; webview is isolated but still a boundary.    |

---

## Authentication and secrets

### Tokens in `globalState`

`JutgeService` persists `jutgeToken` and `jutgeExamToken` via `ExtensionContext.globalState`. That storage is not designed as a secret vault; it is typically readable from the machine’s VS Code extension host data (similar sensitivity to other local app data). Sign-in **email/password** use `SecretStorage`, which is the right pattern for credentials.

**Impact:** Local attackers or malware with filesystem access may read session tokens more easily than if they were in `SecretStorage`.

**Recommendation:** Consider migrating tokens to `SecretStorage` (or OS keychain-backed APIs) and treating `globalState` only for non-sensitive preferences.

### Optional password retention

Passwords can be stored in `SecretStorage` for convenience (`storeSignInCredentials`). Users should be aware that “remember password” increases impact if the OS account is compromised.

### `invalidateToken` (dev aid)

`invalidateToken` calls async `storeToken` / `storeExamToken` without `await`. Clearing persisted tokens may race with the next read or shutdown.

**Impact:** Low (command is dev-gated in the UI); still a correctness footgun.

---

## Network and API client

### Fixed HTTPS endpoints

`extension.ts` sets known `https://` API bases per mode (normal / exam / contest, prod vs dev). That reduces open-redirect style misuse from settings.

### Environment variables (`jutge_api_client.ts`)

`JUTGE_API_URL` and optional `JUTGE_DOMAIN` (`x-forwarded-host`) are read from the environment. Anyone who can set the extension host’s environment can point traffic at another host or influence server-visible headers.

**Impact:** Mostly relevant on shared or CI-like machines, or if another tool injects env vars into the VS Code process.

### Response handling

The client assumes `multipart/form-data` and parses JSON from the `data` field. If `Content-Type` is missing, optional chaining on `get("content-type")?.split(";")[0]` still evaluates `[0]` on `undefined` in some cases, which can **throw** instead of surfacing a clean protocol error.

**Recommendation:** Parse defensively, e.g. `const raw = response.headers.get("content-type"); const contentType = raw?.split(";")[0]?.toLowerCase()`.

### No certificate pinning

Uses standard `fetch` TLS verification only (no pinning). Same as most extensions; worth noting for high-threat models.

---

## Webviews, HTML, and XSS

### Problem webview: `statementHtml`

`htmlWebview` injects `statementHtml` from the API directly into the page. CSP in `html.ts` restricts `script-src` (nonce + extension origin + MathJax CDN) and allows `img-src` for `https:` and `data:`. Inline scripts in the statement should not run, but:

- **External images** can still load (tracking / metadata leaks when viewing a problem).
- **`style-src` includes `'unsafe-inline'`** — intentional for styling, but increases surface if markup is hostile.
- **MathJax from jsDelivr** is allowed; supply-chain/CDN integrity is a general dependency topic.

**Recommendation:** If the platform guarantees sanitized HTML, document that contract. Otherwise consider server-side sanitization or a stricter renderer (e.g. markdown-only subset).

### Problem webview: attributes and testcase content

Testcase text uses `data-original-text` with raw `actual` string in HTML attributes in `htmlTestview` helpers. Problem metadata uses `data-*` attributes for IDs and titles. If any field can contain quotes or markup-like characters without escaping, **attribute breakout** is theoretically possible (depends on API content rules).

**Recommendation:** Centralize HTML escaping for any string placed in attributes or concatenate into HTML.

### Sign-in and dashboard webviews

Sign-in and dashboard HTML use **`script-src 'unsafe-inline'`** in CSP. Content is authored by the extension, not remote users, which limits risk. The **dashboard** builds tables with `escapeHtml` for dynamic fields — good practice.

### Problem panel: `postMessage` handling

`_handleMessage` switches on `command` and reads `data.testcaseId`, `data` for diff, etc., without strict runtime validation. In normal operation the webview is bundled with the extension; if the webview bundle were tampered or a bug allowed arbitrary messages, the extension host would trust structure.

**Recommendation:** Narrow message types (e.g. discriminated unions) and validate indices before use.

---

## Local code execution and tooling

### C / C++ / Haskell / Python runners

Runners use `child_process.spawnSync` with a **command and argv** from configuration (`ConfigService.getCppCommand`, `getGHCCommand`, Python path from the Python extension). That avoids shell parsing for `spawnSync` itself, but:

- A malicious **binary path** (e.g. `runner.cpp.command` pointing to an attacker-controlled executable) still runs with the user’s privileges.
- User code under test is executed locally with timeouts in some paths — inherent risk when running untrusted submissions.

### `TerminalService.executeCommand`

Commands are joined into a string and sent with `terminal.sendText` after `escapeShellString`. This is **better than raw concatenation** but still shell-dependent (cmd vs bash). Edge cases in escaping are a classic footgun for unusual filenames or hostile arguments.

### ImageMagick `compare`

`FileService.compareImages` invokes `compare` with image paths. Paths should come from workspace/test flow; if ever derived from remote content without normalization, that would be sensitive.

### Temporary PDFs

Exam documents are written under `os.tmpdir()` with sanitized names (`extension.ts`). Other users on the same machine could theoretically read tmp contents until cleaned — standard shared-temp caveat.

---

## Configuration bugs (correctness / security adjacent)

### C++ flags type mismatch

`package.json` declares `jutge-vscode.runner.cpp.flags` as an **array**, but `ConfigService.getCppFlags()` uses `getString("runner.cpp.flags")` and returns a **string**, which `CppRunner` spreads into argv (`...flags`). Spreading a **string** splits **characters** into separate arguments, which breaks compilation and is confusing if settings are an array (coercion / undefined behavior).

**Impact:** Broken builds; possible surprising argv if misconfigured.

**Recommendation:** Align schema and code: use `get<string[]>` (or equivalent) and pass an array consistently.

### Preferred language fallback

`getPreferredLangId()` maps unknown config to `"??"`, which may not match API language codes and relies on fallback logic elsewhere.

---

## Extension identity and telemetry

`showExtensionInfo` calls `vscode.extensions.getExtension("jutge.jutge-vscode")`, while `package.json` publisher is `jutge-org` (marketplace id `jutge-org.jutge-vscode` per README). The lookup may **always miss**, so logged version may be `"unknown"`.

**Impact:** Low for security; affects diagnostics and supportability.

---

## Dependencies and supply chain

- **Runtime deps:** `@vscode/python-extension`, `@vscode/webview-ui-toolkit`, `dayjs`, `deep-equal`, `yaml`. Keep versions updated; run `npm audit` / equivalent in CI.
- **`jutge_api_client.ts`** is large generated code; regenerate from trusted OpenAPI/spec pipelines.
- **Extension dependencies:** `ms-python.python`, `tomoki1207.pdf` — compromise of those extensions elevates trust in their APIs.

---

## Reliability and UX bugs

- **`notifyProblemFilesChanges`** logs `this.customTestcases.length` after assignment; if `loadCustomTestcases` ever returned `null`, this would throw (today it likely always returns an array — worth asserting in types).
- **`_loadProblem`**: uses `Promise.allSettled` but may still call `updateWebview()` after partial failures; user might see incomplete problem data without a strong error surface.
- **SWR / cache** (`jutge.ts`): comments mention missing `onError` handling for stale-while-revalidate flows.

---

## Prioritized hardening ideas

1. Move session tokens from `globalState` to `SecretStorage` (or document accepted risk).
2. Fix C++ flags configuration type and argv construction; audit GHC/Python flag handling for the same pattern.
3. Harden API client: safe `Content-Type` parsing, typed errors for non-JSON bodies.
4. Escape all dynamic strings in problem webview HTML attributes; revisit `statementHtml` trust model.
5. Fix extension id string in `showExtensionInfo` for accurate version logging.
6. Add automated checks: ESLint security rules, `npm audit`, and optional SAST in CI.

---

## Scope disclaimer

This inspection is based on **static analysis** of the source layout under `src/` and configuration in `package.json`. It does not validate server-side Jutge.org behavior, runtime data from production APIs, or behavior of third-party extensions.
