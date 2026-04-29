import * as vscode from "vscode"
import { JutgeService } from "@/services/jutge"

export const signInWebviewViewType = "jutge-sign-in"

function getSignInHtml(): string {
    return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta
        http-equiv="Content-Security-Policy"
        content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';"
    />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Sign in</title>
    <style>
        :root {
            font-size: 13px;
        }
        body {
            margin: 0;
            padding: 12px 14px 16px;
            color: var(--vscode-foreground);
            font-family: var(--vscode-font-family);
            line-height: 1.45;
        }
        .field {
            margin-bottom: 12px;
        }
        label.field-label {
            display: block;
            margin-bottom: 4px;
            opacity: 0.9;
        }
        input[type="text"],
        input[type="password"],
        select {
            box-sizing: border-box;
            width: 100%;
            padding: 4px 8px;
            color: var(--vscode-input-foreground);
            background: var(--vscode-input-background);
            border: 1px solid var(--vscode-input-border, transparent);
            border-radius: 2px;
            font-family: inherit;
            font-size: inherit;
        }
        input:focus,
        select:focus {
            outline: 1px solid var(--vscode-focusBorder);
            outline-offset: -1px;
        }
        fieldset.env-fieldset {
            margin: 0 0 12px;
            padding: 8px 10px 10px;
            border: 1px solid var(--vscode-widget-border, rgba(127, 127, 127, 0.3));
            border-radius: 4px;
        }
        fieldset.env-fieldset legend {
            padding: 0 4px;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.04em;
            opacity: 0.85;
        }
        .radio-row {
            display: flex;
            flex-direction: column;
            gap: 6px;
        }
        .radio-row label {
            display: flex;
            align-items: center;
            gap: 8px;
            cursor: pointer;
        }
        .radio-row input {
            margin: 0;
        }
        .conditional {
            display: none;
            margin-bottom: 12px;
            padding-left: 2px;
            border-left: 2px solid var(--vscode-inputOption-activeBorder, var(--vscode-focusBorder));
            padding-left: 10px;
        }
        .conditional.visible {
            display: block;
        }
        .actions {
            margin-top: 14px;
        }
        .action-button-row {
            width: 100%;
        }
        button.sign-in-btn {
            display: block;
            width: 100%;
            box-sizing: border-box;
            padding: 6px 14px;
            color: var(--vscode-button-foreground);
            background: var(--vscode-button-background);
            border: none;
            border-radius: 2px;
            font-family: inherit;
            font-size: inherit;
            cursor: pointer;
        }
        button.sign-in-btn:hover {
            background: var(--vscode-button-hoverBackground);
        }
        .checkbox-row {
            display: flex;
            align-items: center;
            gap: 8px;
            user-select: none;
            margin-top: 8px;
            justify-content: flex-end;
        }
        .checkbox-row input {
            margin: 0;
            cursor: pointer;
        }
        .checkbox-row label {
            cursor: pointer;
            color: var(--vscode-descriptionForeground, #888888) !important;
            opacity: 0.9;
        }
        .message {
            margin-top: 8px;
            font-size: 12px;
            min-height: 1.2em;
            color: var(--vscode-descriptionForeground, #888888);
        }
    </style>
</head>
<body>
    <div class="field">
        <label class="field-label" for="email">Email</label>
        <input type="text" id="email" name="email" autocomplete="username" />
    </div>
    <div class="field">
        <label class="field-label" for="password">Password</label>
        <input type="password" id="password" name="password" autocomplete="current-password" />
    </div>

    <fieldset class="env-fieldset">
        <legend>Site</legend>
        <div class="radio-row">
            <label>
                <input type="radio" name="signin-mode" value="jutge" checked />
                <span>Jutge.org</span>
            </label>
            <label>
                <input type="radio" name="signin-mode" value="exam" />
                <span>Exam</span>
            </label>
            <label>
                <input type="radio" name="signin-mode" value="contest" />
                <span>Contest</span>
            </label>
        </div>
    </fieldset>

    <div id="exam-section" class="conditional">
        <div class="field">
            <label class="field-label" for="exam-name">Exam name</label>
            <select id="exam-name" name="exam-name">
                <option value="">Select an exam…</option>
                <option value="__placeholder1">(Example exam A)</option>
                <option value="__placeholder2">(Example exam B)</option>
            </select>
        </div>
        <div class="field">
            <label class="field-label" for="exam-password">Exam password</label>
            <input type="password" id="exam-password" name="exam-password" autocomplete="off" />
        </div>
    </div>

    <div id="contest-section" class="conditional">
        <div class="field">
            <label class="field-label" for="contest-name">Contest name</label>
            <select id="contest-name" name="contest-name">
                <option value="">Select a contest…</option>
                <option value="__placeholder1">(Example contest A)</option>
                <option value="__placeholder2">(Example contest B)</option>
            </select>
        </div>
        <div class="field">
            <label class="field-label" for="contest-password">Contest password</label>
            <input type="password" id="contest-password" name="contest-password" autocomplete="off" />
        </div>
    </div>

    <div class="actions">
        <div id="message" class="message"></div>
        <div class="action-button-row">
            <button type="button" class="sign-in-btn" id="sign-in-btn">Sign in</button>
        </div>
        <div class="checkbox-row">
            <label for="use-dev-api">Use dev API</label>
            <input type="checkbox" id="use-dev-api" name="use-dev-api" />
        </div>
    </div>

    <script>
        (function () {
            var vscode = acquireVsCodeApi();
            var pendingTimer = null;
            function mode() {
                var el = document.querySelector('input[name="signin-mode"]:checked');
                return el ? el.value : "jutge";
            }
            function setMessage(text, kind) {
                var message = document.getElementById("message");
                message.textContent = text || "";
                if (!text) {
                    message.style.color = "var(--vscode-descriptionForeground, #888888)";
                    return;
                }
                message.style.color = kind === "success"
                    ? "var(--vscode-testing-iconPassed)"
                    : "var(--vscode-errorForeground, #f14c4c)";
            }
            function setPending(pending) {
                var button = document.getElementById("sign-in-btn");
                button.disabled = pending;
                button.textContent = pending ? "Signing in..." : "Sign in";
            }
            function clearPendingTimer() {
                if (pendingTimer !== null) {
                    clearTimeout(pendingTimer);
                    pendingTimer = null;
                }
            }
            function refresh() {
                var m = mode();
                var exam = document.getElementById("exam-section");
                var contest = document.getElementById("contest-section");
                exam.classList.toggle("visible", m === "exam");
                contest.classList.toggle("visible", m === "contest");
            }
            document.querySelectorAll('input[name="signin-mode"]').forEach(function (r) {
                r.addEventListener("change", refresh);
            });
            document.getElementById("sign-in-btn").addEventListener("click", function () {
                setMessage("");
                setPending(true);
                clearPendingTimer();
                pendingTimer = setTimeout(function () {
                    setPending(false);
                    setMessage("Could not sign in. Please try again.", "error");
                }, 12000);
                vscode.postMessage({
                    type: "signInRequested",
                    payload: {
                        email: document.getElementById("email").value,
                        password: document.getElementById("password").value,
                        mode: mode(),
                        useDevApi: document.getElementById("use-dev-api").checked
                    }
                });
            });
            window.addEventListener("message", function (event) {
                var message = event.data;
                if (!message || message.type !== "signInResult") return;
                clearPendingTimer();
                setPending(false);
                var payload = message.payload || {};
                var text = payload.message;
                if (!payload.ok && (!text || !String(text).trim())) {
                    text = "Invalid credentials.";
                }
                setMessage(text, payload.ok ? "success" : "error");
            });
            refresh();
        })();
    </script>
</body>
</html>`
}

export class SignInWebviewViewProvider implements vscode.WebviewViewProvider {
    constructor(private readonly extensionUri: vscode.Uri) {}

    resolveWebviewView(webviewView: vscode.WebviewView): void | Thenable<void> {
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                vscode.Uri.joinPath(this.extensionUri, "src", "webview"),
                vscode.Uri.joinPath(this.extensionUri, "dist"),
            ],
        }
        webviewView.webview.html = getSignInHtml()
        webviewView.webview.onDidReceiveMessage(async (message: unknown) => {
            if (!message || typeof message !== "object") {
                return
            }

            const msg = message as {
                type?: string
                payload?: {
                    email?: string
                    password?: string
                    mode?: string
                    useDevApi?: boolean
                }
            }

            if (msg.type !== "signInRequested") {
                return
            }

            const mode = msg.payload?.mode
            if (mode === "exam" || mode === "contest") {
                webviewView.webview.postMessage({
                    type: "signInResult",
                    payload: { ok: false, message: "Not implemented yet" },
                })
                return
            }

            try {
                const result = await JutgeService.signInWithCredentials({
                    email: msg.payload?.email || "",
                    password: msg.payload?.password || "",
                    useDevApi: Boolean(msg.payload?.useDevApi),
                })

                webviewView.webview.postMessage({
                    type: "signInResult",
                    payload: {
                        ok: result.ok,
                        message: result.ok ? "Signed in successfully." : result.error,
                    },
                })
            } catch (error) {
                const text =
                    error instanceof Error && error.message
                        ? error.message
                        : "Could not sign in. Please try again."
                webviewView.webview.postMessage({
                    type: "signInResult",
                    payload: { ok: false, message: text },
                })
            }
        })
    }
}
