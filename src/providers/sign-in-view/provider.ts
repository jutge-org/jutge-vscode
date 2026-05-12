import * as vscode from "vscode"
import { JutgeService } from "@/services/jutge"

export const signInWebviewViewType = "jutge-sign-in"

function getSignInHtml(isDevelopmentMode: boolean): string {
    const quickSignInRow = isDevelopmentMode
        ? `<div class="action-button-row">
            <button type="button" class="sign-in-btn quick-sign-in-btn" id="quick-sign-in-btn">Quick sign in for devs</button>
        </div>`
        : ""
    const useDevApiCheckboxRow = isDevelopmentMode
        ? `<div class="checkbox-row">
            <label for="use-dev-api">Use dev API</label>
            <input type="checkbox" id="use-dev-api" name="use-dev-api" />
        </div>`
        : ""
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
        .tabs {
            display: flex;
            margin: 0 0 10px;
            border-bottom: 1px solid var(--vscode-tab-border, var(--vscode-widget-border, rgba(127, 127, 127, 0.3)));
        }
        .tab {
            flex: 1;
            padding: 6px 8px;
            background: transparent;
            color: var(--vscode-tab-inactiveForeground, var(--vscode-descriptionForeground, #888888));
            border: none;
            border-bottom: 2px solid transparent;
            font-family: inherit;
            font-size: inherit;
            cursor: pointer;
        }
        .tab:hover {
            color: var(--vscode-tab-activeForeground, var(--vscode-foreground));
        }
        .tab:focus {
            outline: 1px solid var(--vscode-focusBorder);
            outline-offset: -2px;
        }
        .tab.is-active {
            color: var(--vscode-tab-activeForeground, var(--vscode-foreground));
            border-bottom-color: var(--vscode-focusBorder);
        }
        .host-row {
            display: flex;
            align-items: baseline;
            gap: 6px;
            margin: 0 0 14px;
            font-size: 12px;
            color: var(--vscode-descriptionForeground, #888888);
        }
        .host-row .host-label {
            text-transform: uppercase;
            letter-spacing: 0.04em;
            font-size: 11px;
            opacity: 0.85;
        }
        .host-row .host-url {
            font-family: var(--vscode-editor-font-family, monospace);
            word-break: break-all;
            color: var(--vscode-foreground);
        }
        .conditional {
            display: none;
        }
        .conditional.visible {
            display: block;
        }
        form#sign-in-form {
            margin: 0;
        }
        #sign-in-form > .message {
            margin-top: 14px;
        }
        .actions {
            margin-top: 8px;
        }
        .action-button-row {
            width: 100%;
            margin-bottom: 8px;
        }
        button.sign-in-btn {
            display: block;
            width: 100%;
            box-sizing: border-box;
            padding: 6px 14px;
            color: var(--vscode-button-foreground);
            background: var(--vscode-button-background);
            border: none;
            border-radius: 4px;
            font-family: inherit;
            font-size: inherit;
            cursor: pointer;
        }
        button.sign-in-btn:hover:not(:disabled) {
            background: var(--vscode-button-hoverBackground);
        }
        button.sign-in-btn:disabled {
            opacity: 0.55;
            cursor: not-allowed;
        }
        button.sign-in-btn:disabled:hover {
            background: var(--vscode-button-background);
        }
        button.quick-sign-in-btn {
            color: var(--vscode-button-secondaryForeground);
            background: var(--vscode-button-secondaryBackground);
        }
        button.quick-sign-in-btn:hover {
            background: var(--vscode-button-secondaryHoverBackground);
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
    <div class="tabs" role="tablist">
        <button type="button" class="tab is-active" role="tab" data-mode="jutge" aria-selected="true">Jutge.org</button>
        <button type="button" class="tab" role="tab" data-mode="exam" aria-selected="false">Exam</button>
        <button type="button" class="tab" role="tab" data-mode="contest" aria-selected="false">Contest</button>
    </div>
    <div class="host-row">
        <span class="host-label">Host</span>
        <span class="host-url" id="host-url"></span>
    </div>

    <form id="sign-in-form">
    <div class="field">
        <label class="field-label" for="email">Email</label>
        <input type="text" id="email" name="email" autocomplete="username" />
    </div>
    <div class="field">
        <label class="field-label" for="password">Password</label>
        <input type="password" id="password" name="password" autocomplete="current-password" />
    </div>

    <div id="exam-section" class="conditional">
        <div class="field">
            <label class="field-label" for="exam-name">Exam name</label>
            <select id="exam-name" name="exam-name">
                <option value="">Select an exam...</option>
            </select>
        </div>
        <div id="exam-custom-name-field" class="field" style="display: none;">
            <input type="text" id="exam-custom-name" name="exam-custom-name" autocomplete="off" />
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
                <option value="">Select a contest...</option>
            </select>
        </div>
        <div id="contest-custom-name-field" class="field" style="display: none;">
            <input type="text" id="contest-custom-name" name="contest-custom-name" autocomplete="off" />
        </div>
        <div class="field">
            <label class="field-label" for="contest-password">Contest password</label>
            <input type="password" id="contest-password" name="contest-password" autocomplete="off" />
        </div>
    </div>

        <div id="message" class="message"></div>
        <div class="action-button-row">
            <button type="submit" class="sign-in-btn" id="sign-in-btn">Sign in</button>
        </div>
    </form>
    <div class="actions">
        ${quickSignInRow}
        ${useDevApiCheckboxRow}
    </div>

    <script>
        (function () {
            var vscode = acquireVsCodeApi();
            var pendingTimer = null;
            var isLoadingOptions = false;
            var signInPending = false;
            function isUseDevApi() {
                var el = document.getElementById("use-dev-api");
                return Boolean(el && el.checked);
            }
            function mode() {
                var el = document.querySelector('.tab.is-active');
                return el ? el.getAttribute("data-mode") : "jutge";
            }
            function setActiveTab(targetMode) {
                var tabs = document.querySelectorAll('.tab');
                for (var i = 0; i < tabs.length; i++) {
                    var t = tabs[i];
                    var active = t.getAttribute("data-mode") === targetMode;
                    t.classList.toggle("is-active", active);
                    t.setAttribute("aria-selected", active ? "true" : "false");
                }
            }
            var HOST_URL_BY_MODE = {
                jutge: "https://jutge.org",
                exam: "https://exam.jutge.org",
                contest: "https://contest.jutge.org"
            };
            function updateHostUrl() {
                var el = document.getElementById("host-url");
                if (el) {
                    el.textContent = HOST_URL_BY_MODE[mode()] || HOST_URL_BY_MODE.jutge;
                }
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
            function isExamContestFormComplete() {
                var m = mode();
                if (m === "exam") {
                    if (isLoadingOptions) {
                        return false;
                    }
                    var key = selectedExamKey();
                    if (!key || !String(key).trim()) {
                        return false;
                    }
                    var pwd = document.getElementById("exam-password").value;
                    return Boolean(pwd && String(pwd).trim());
                }
                if (m === "contest") {
                    if (isLoadingOptions) {
                        return false;
                    }
                    var ckey = selectedContestKey();
                    if (!ckey || !String(ckey).trim()) {
                        return false;
                    }
                    var cpwd = document.getElementById("contest-password").value;
                    return Boolean(cpwd && String(cpwd).trim());
                }
                return true;
            }
            function refreshSignInButtonDisabled() {
                var button = document.getElementById("sign-in-btn");
                if (!button) {
                    return;
                }
                var disabled = signInPending || !isExamContestFormComplete();
                button.disabled = disabled;
            }
            function setPending(pending) {
                signInPending = pending;
                var button = document.getElementById("sign-in-btn");
                var quickButton = document.getElementById("quick-sign-in-btn");
                refreshSignInButtonDisabled();
                if (quickButton) {
                    quickButton.disabled = pending;
                }
                button.textContent = pending ? "Signing in..." : "Sign in";
                if (quickButton) {
                    quickButton.textContent = pending ? "Signing in..." : "Quick sign in";
                }
            }
            function clearPendingTimer() {
                if (pendingTimer !== null) {
                    clearTimeout(pendingTimer);
                    pendingTimer = null;
                }
            }
            function clearOptions(list) {
                list.innerHTML = "";
            }
            function addDefaultOption(list, text) {
                var option = document.createElement("option");
                option.value = "";
                option.textContent = text;
                list.appendChild(option);
            }
            function addOthersOption(list) {
                var option = document.createElement("option");
                option.value = "—Custom name—";
                option.textContent = "—Custom name—";
                list.appendChild(option);
            }
            function setLoadingOptions(loading) {
                isLoadingOptions = loading;
                var examInput = document.getElementById("exam-name");
                var contestInput = document.getElementById("contest-name");
                examInput.disabled = loading;
                contestInput.disabled = loading;
                refreshSignInButtonDisabled();
            }
            function updateCustomNameField(targetMode) {
                var select = targetMode === "contest"
                    ? document.getElementById("contest-name")
                    : document.getElementById("exam-name");
                var customField = targetMode === "contest"
                    ? document.getElementById("contest-custom-name-field")
                    : document.getElementById("exam-custom-name-field");
                var customInput = targetMode === "contest"
                    ? document.getElementById("contest-custom-name")
                    : document.getElementById("exam-custom-name");
                var shouldShow = select.value === "—Custom name—";
                customField.style.display = shouldShow ? "block" : "none";
                if (!shouldShow) {
                    customInput.value = "";
                }
                refreshSignInButtonDisabled();
            }
            function selectedExamKey() {
                var selected = document.getElementById("exam-name").value;
                if (selected !== "—Custom name—") {
                    return selected;
                }
                return document.getElementById("exam-custom-name").value;
            }
            function selectedContestKey() {
                var selected = document.getElementById("contest-name").value;
                if (selected !== "—Custom name—") {
                    return selected;
                }
                return document.getElementById("contest-custom-name").value;
            }
            function loadReadyItems(targetMode) {
                if (targetMode !== "exam" && targetMode !== "contest") {
                    return;
                }
                setLoadingOptions(true);
                var input = targetMode === "exam"
                    ? document.getElementById("exam-name")
                    : document.getElementById("contest-name");
                clearOptions(input);
                addDefaultOption(
                    input,
                    targetMode === "exam" ? "Loading exams..." : "Loading contests..."
                );
                input.disabled = true;
                input.value = "";
                updateCustomNameField(targetMode);
                vscode.postMessage({
                    type: "loadReadyItemsRequested",
                    payload: {
                        mode: targetMode,
                        useDevApi: isUseDevApi()
                    }
                });
            }
            function refresh() {
                var m = mode();
                var exam = document.getElementById("exam-section");
                var contest = document.getElementById("contest-section");
                exam.classList.toggle("visible", m === "exam");
                contest.classList.toggle("visible", m === "contest");
                updateHostUrl();
                loadReadyItems(m);
                updateCustomNameField("exam");
                updateCustomNameField("contest");
                refreshSignInButtonDisabled();
            }
            document.querySelectorAll('.tab').forEach(function (t) {
                t.addEventListener("click", function () {
                    var targetMode = t.getAttribute("data-mode");
                    if (!targetMode || targetMode === mode()) {
                        return;
                    }
                    setActiveTab(targetMode);
                    refresh();
                });
            });
            document.getElementById("exam-name").addEventListener("change", function () {
                updateCustomNameField("exam");
            });
            document.getElementById("contest-name").addEventListener("change", function () {
                updateCustomNameField("contest");
            });
            document.getElementById("exam-password").addEventListener("input", refreshSignInButtonDisabled);
            document.getElementById("contest-password").addEventListener("input", refreshSignInButtonDisabled);
            document.getElementById("exam-custom-name").addEventListener("input", refreshSignInButtonDisabled);
            document.getElementById("contest-custom-name").addEventListener("input", refreshSignInButtonDisabled);
            document.getElementById("sign-in-form").addEventListener("submit", function (ev) {
                ev.preventDefault();
                if (isLoadingOptions) {
                    setMessage("Please wait until exams/contests are loaded.", "error");
                    return;
                }
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
                        examKey: selectedExamKey(),
                        examPassword: document.getElementById("exam-password").value,
                        contestKey: selectedContestKey(),
                        contestPassword: document.getElementById("contest-password").value,
                        useDevApi: isUseDevApi()
                    }
                });
            });
            var quickSignInButton = document.getElementById("quick-sign-in-btn");
            if (quickSignInButton) {
                quickSignInButton.addEventListener("click", function () {
                    setMessage("");
                    setPending(true);
                    clearPendingTimer();
                    pendingTimer = setTimeout(function () {
                        setPending(false);
                        setMessage("Could not sign in. Please try again.", "error");
                    }, 12000);
                    vscode.postMessage({
                        type: "quickSignInRequested",
                        payload: {
                            useDevApi: isUseDevApi()
                        }
                    });
                });
            }
            var useDevApiEl = document.getElementById("use-dev-api");
            if (useDevApiEl) {
                useDevApiEl.addEventListener("change", function() {
                    loadReadyItems(mode());
                });
            }
            window.addEventListener("message", function (event) {
                var message = event.data;
                if (!message) return;
                if (message.type === "savedSignInDefaults") {
                    var p = message.payload || {};
                    var emailEl = document.getElementById("email");
                    var passwordEl = document.getElementById("password");
                    if (typeof p.email === "string" && emailEl) {
                        emailEl.value = p.email;
                    }
                    if (typeof p.password === "string" && passwordEl) {
                        passwordEl.value = p.password;
                    }
                    return;
                }
                if (message.type === "signInResult") {
                    clearPendingTimer();
                    setPending(false);
                    var payload = message.payload || {};
                    var text = payload.message;
                    if (!payload.ok && (!text || !String(text).trim())) {
                        text = "Invalid credentials.";
                    }
                    setMessage(text, payload.ok ? "success" : "error");
                    return;
                }
                if (message.type === "loadReadyItemsResult") {
                    var payload = message.payload || {};
                    var targetMode = payload.mode;
                    var input = targetMode === "contest"
                        ? document.getElementById("contest-name")
                        : document.getElementById("exam-name");
                    clearOptions(input);
                    if (payload.ok && Array.isArray(payload.items) && payload.items.length > 0) {
                        addDefaultOption(
                            input,
                            targetMode === "contest" ? "Select a contest..." : "Select an exam..."
                        );
                        payload.items.forEach(function(item) {
                            var option = document.createElement("option");
                            option.value = item;
                            option.textContent = item;
                            input.appendChild(option);
                        });
                        addOthersOption(input);
                    } else if (payload.ok) {
                        addDefaultOption(
                            input,
                            targetMode === "contest"
                                ? "No ready contests found"
                                : "No ready exams found"
                        );
                        addOthersOption(input);
                    } else {
                        addDefaultOption(
                            input,
                            targetMode === "contest" ? "Select a contest..." : "Select an exam..."
                        );
                        setMessage(payload.error || "Could not load exams/contests.", "error");
                    }
                    input.value = "";
                    setLoadingOptions(false);
                    updateCustomNameField(targetMode);
                }
            });
            refresh();
            vscode.postMessage({ type: "signInWebviewReady" });
        })();
    </script>
</body>
</html>`
}
export class SignInWebviewViewProvider implements vscode.WebviewViewProvider {
    constructor(
        private readonly extensionUri: vscode.Uri,
        private readonly showQuickSignIn: boolean
    ) {}

    resolveWebviewView(webviewView: vscode.WebviewView): void | Thenable<void> {
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                vscode.Uri.joinPath(this.extensionUri, "src", "webview"),
                vscode.Uri.joinPath(this.extensionUri, "dist"),
            ],
        }
        webviewView.webview.html = getSignInHtml(this.showQuickSignIn)
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
                    examKey?: string
                    examPassword?: string
                    contestKey?: string
                    contestPassword?: string
                    useDevApi?: boolean
                }
            }

            if (msg.type === "signInWebviewReady") {
                const [email, password] = await Promise.all([
                    JutgeService.getStoredSignInEmail(),
                    JutgeService.getStoredSignInPassword(),
                ])
                webviewView.webview.postMessage({
                    type: "savedSignInDefaults",
                    payload: {
                        email: email ?? "",
                        password: password ?? "",
                    },
                })
                return
            }

            if (msg.type === "loadReadyItemsRequested") {
                const requestedMode =
                    msg.payload?.mode === "contest" || msg.payload?.mode === "exam"
                        ? msg.payload.mode
                        : "exam"
                const readyItems = await JutgeService.getReadyExamsForMode(
                    requestedMode,
                    Boolean(msg.payload?.useDevApi)
                )
                if (!readyItems) {
                    webviewView.webview.postMessage({
                        type: "loadReadyItemsResult",
                        payload: {
                            ok: false,
                            mode: requestedMode,
                            error: "Could not load ready exams/contests.",
                        },
                    })
                    return
                }
                webviewView.webview.postMessage({
                    type: "loadReadyItemsResult",
                    payload: {
                        ok: true,
                        mode: requestedMode,
                        items: readyItems,
                    },
                })
                return
            }

            if (msg.type === "quickSignInRequested") {
                if (!this.showQuickSignIn) {
                    webviewView.webview.postMessage({
                        type: "signInResult",
                        payload: {
                            ok: false,
                            message: "Quick sign in is only available in development.",
                        },
                    })
                    return
                }
                const email = process.env.JUTGE_EMAIL ?? ""
                const password = process.env.JUTGE_PASSWORD ?? ""
                if (!email || !password) {
                    webviewView.webview.postMessage({
                        type: "signInResult",
                        payload: {
                            ok: false,
                            message:
                                "Quick sign in requires JUTGE_EMAIL and JUTGE_PASSWORD env vars.",
                        },
                    })
                    return
                }

                try {
                    const result = await JutgeService.signInWithCredentials({
                        email,
                        password,
                        mode: "contest",
                        examKey: "Jutge:ProvesJordi",
                        examPassword: "PEZATIWU",
                        contestKey: "Jutge:ProvesJordi",
                        contestPassword: "PEZATIWU",
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
                return
            }

            if (msg.type !== "signInRequested") {
                return
            }

            try {
                const result = await JutgeService.signInWithCredentials({
                    email: msg.payload?.email || "",
                    password: msg.payload?.password || "",
                    mode: msg.payload?.mode,
                    examKey: msg.payload?.examKey,
                    examPassword: msg.payload?.examPassword,
                    contestKey: msg.payload?.contestKey,
                    contestPassword: msg.payload?.contestPassword,
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
