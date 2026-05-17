import * as vscode from "vscode"
import { ExamMode, JutgeService } from "@/services/jutge"

export const signInWebviewViewType = "jutge-sign-in"

type Mode = "jutge" | "exam" | "contest"

type SignInHtmlOptions = {
    scriptUri: string
    cspSource: string
}

function getSignInHtml({ scriptUri, cspSource }: SignInHtmlOptions): string {
    return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta
        http-equiv="Content-Security-Policy"
        content="default-src 'none'; style-src 'unsafe-inline'; script-src ${cspSource} 'unsafe-inline';"
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
        input[type="password"] {
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
        input:focus {
            outline: 1px solid var(--vscode-focusBorder);
            outline-offset: -1px;
        }
        vscode-single-select {
            display: block;
            width: 100%;
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
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        .tab--primary {
            flex: 3;
            font-weight: 600;
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
        .tab .tab-icon {
            display: none;
            line-height: 1;
            vertical-align: middle;
        }
        .tab .tab-icon svg {
            width: 16px;
            height: 16px;
            vertical-align: middle;
        }
        @media (max-width: 320px) {
            .tab:not(.tab--primary) .tab-text {
                display: none;
            }
            .tab:not(.tab--primary) .tab-icon {
                display: inline;
            }
        }
        .host-row {
            margin: 0 0 14px;
            text-align: center;
            font-size: 12px;
        }
        .host-row .host-url {
            font-family: var(--vscode-editor-font-family, monospace);
            font-size: 120%;
            word-break: break-all;
            color: var(--vscode-textLink-foreground, #3794ff);
            text-decoration: none;
            cursor: pointer;
        }
        .host-row .host-url:hover {
            color: var(--vscode-textLink-activeForeground, var(--vscode-textLink-foreground, #3794ff));
            text-decoration: underline;
        }
        .host-row .host-url:focus {
            outline: 1px solid var(--vscode-focusBorder);
            outline-offset: 2px;
        }
        .pre-exam-banner {
            margin: 0 0 14px;
            padding: 8px 10px;
            border-radius: 4px;
            background: color-mix(in srgb, var(--vscode-textLink-foreground, #3794ff) 8%, transparent);
            font-size: 12px;
            line-height: 1.5;
        }
        .pre-exam-banner .pre-exam-banner-label {
            color: var(--vscode-descriptionForeground);
            margin-right: 4px;
        }
        .pre-exam-banner .pre-exam-banner-value {
            font-weight: 600;
        }
        .conditional {
            display: none;
        }
        body[data-state="not-signed-in"] .state-not-signed-in {
            display: block;
        }
        body[data-state="not-signed-in"] .state-pre-exam {
            display: none;
        }
        body[data-state="pre-exam"] .state-pre-exam {
            display: block;
        }
        body[data-state="pre-exam"] .state-not-signed-in {
            display: none;
        }
        .state-not-signed-in,
        .state-pre-exam {
            display: none;
        }
        form {
            margin: 0;
        }
        .action-button-row {
            width: 100%;
            margin-top: 12px;
            margin-bottom: 8px;
        }
        button.action-btn {
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
        button.action-btn:hover:not(:disabled) {
            background: var(--vscode-button-hoverBackground);
        }
        button.action-btn:disabled {
            opacity: 0.55;
            cursor: not-allowed;
        }
        button.action-btn:disabled:hover {
            background: var(--vscode-button-background);
        }
        .link-row {
            margin-top: 10px;
            text-align: center;
        }
        .link-row a {
            color: var(--vscode-textLink-foreground, #3794ff);
            text-decoration: none;
            font-size: 12px;
            cursor: pointer;
        }
        .link-row a:hover {
            text-decoration: underline;
        }
        .banner {
            display: none;
            opacity: 0;
            box-sizing: border-box;
            width: 100%;
            margin-top: 10px;
            padding: 8px 10px;
            font-size: 12px;
            line-height: 1.45;
            text-align: center;
            border-radius: 4px;
            border: 1px solid transparent;
            transition:
                opacity 400ms ease,
                display 400ms allow-discrete;
        }
        .banner.is-visible {
            display: block;
            opacity: 1;
        }
        @starting-style {
            .banner.is-visible {
                opacity: 0;
            }
        }
        .banner.banner--error {
            color: #ffffff;
            background: #c8302c;
            border: none;
        }
        .banner.banner--success {
            color: var(--vscode-testing-iconPassed, var(--vscode-gitDecoration-addedResourceForeground));
            background: var(
                --vscode-inputValidation-infoBackground,
                color-mix(in srgb, var(--vscode-testing-iconPassed, #73c991) 14%, transparent)
            );
            border-color: var(
                --vscode-inputValidation-infoBorder,
                var(--vscode-testing-iconPassed, #73c991)
            );
        }
    </style>
</head>
<body data-state="not-signed-in">
    <!-- ===== NOT_SIGNED_IN ===== -->
    <div class="state-not-signed-in">
        <div class="tabs" role="tablist">
            <button type="button" class="tab tab--primary is-active" role="tab" data-mode="jutge" aria-selected="true">Jutge.org</button>
            <button type="button" class="tab" role="tab" data-mode="exam" aria-selected="false" aria-label="Exam">
                <span class="tab-text">Exam</span>
                <span class="tab-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"/><path d="M22 10v6"/><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"/></svg></span>
            </button>
            <button type="button" class="tab" role="tab" data-mode="contest" aria-selected="false" aria-label="Contest">
                <span class="tab-text">Contest</span>
                <span class="tab-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 14.66v1.626a2 2 0 0 1-.976 1.696A5 5 0 0 0 7 21.978"/><path d="M14 14.66v1.626a2 2 0 0 0 .976 1.696A5 5 0 0 1 17 21.978"/><path d="M18 9h1.5a1 1 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M6 9a6 6 0 0 0 12 0V3a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1z"/><path d="M6 9H4.5a1 1 0 0 1 0-5H6"/></svg></span>
            </button>
        </div>
        <div class="host-row">
            <a class="host-url" id="host-url" href="#" target="_blank" rel="noopener noreferrer"></a>
        </div>
        <form id="base-form">
            <div class="field">
                <label class="field-label" for="email">Email</label>
                <input type="text" id="email" name="email" autocomplete="username" />
            </div>
            <div class="field">
                <label class="field-label" for="password">Password</label>
                <input type="password" id="password" name="password" autocomplete="current-password" />
            </div>
            <div class="action-button-row">
                <button type="submit" class="action-btn" id="base-btn">Sign in</button>
            </div>
            <div id="base-banner" class="banner" role="status" aria-live="polite"></div>
        </form>
    </div>

    <!-- ===== PRE_EXAM ===== -->
    <div class="state-pre-exam">
        <div class="pre-exam-banner">
            <div>
                <span class="pre-exam-banner-label">Signed in as</span>
                <span class="pre-exam-banner-value" id="pre-exam-email">—</span>
            </div>
            <div>
                <span class="pre-exam-banner-label">Mode</span>
                <span class="pre-exam-banner-value" id="pre-exam-mode-label">—</span>
            </div>
        </div>
        <form id="enter-form">
            <div class="field">
                <label class="field-label" for="exam-key">
                    <span id="exam-key-label">Exam name</span>
                </label>
                <vscode-single-select id="exam-key" name="exam-key">
                    <vscode-option value="">—</vscode-option>
                </vscode-single-select>
            </div>
            <div id="custom-key-field" class="field" style="display: none;">
                <input type="text" id="custom-key" name="custom-key" autocomplete="off" placeholder="Custom name" />
            </div>
            <div class="field">
                <label class="field-label" for="exam-password">
                    <span id="exam-password-label">Exam password</span>
                </label>
                <input type="password" id="exam-password" name="exam-password" autocomplete="off" />
            </div>
            <div class="action-button-row">
                <button type="submit" class="action-btn" id="enter-btn">Enter exam</button>
            </div>
            <div id="enter-banner" class="banner" role="status" aria-live="polite"></div>
        </form>
        <div class="link-row">
            <a href="#" id="sign-out-pre-exam">Sign out</a>
        </div>
    </div>

    <script src="${scriptUri}"></script>
    <script>
        (function () {
            const vscode = acquireVsCodeApi();

            // ----- DOM refs -----
            const bodyEl = document.body;
            const hostUrlEl = document.getElementById("host-url");
            const baseFormEl = document.getElementById("base-form");
            const baseBtnEl = document.getElementById("base-btn");
            const baseBannerEl = document.getElementById("base-banner");
            const emailEl = document.getElementById("email");
            const passwordEl = document.getElementById("password");

            const enterFormEl = document.getElementById("enter-form");
            const enterBtnEl = document.getElementById("enter-btn");
            const enterBannerEl = document.getElementById("enter-banner");
            const preExamEmailEl = document.getElementById("pre-exam-email");
            const preExamModeLabelEl = document.getElementById("pre-exam-mode-label");
            const examKeyEl = document.getElementById("exam-key");
            const customKeyFieldEl = document.getElementById("custom-key-field");
            const customKeyEl = document.getElementById("custom-key");
            const examKeyLabelEl = document.getElementById("exam-key-label");
            const examPasswordLabelEl = document.getElementById("exam-password-label");
            const enterPasswordEl = document.getElementById("exam-password");
            const signOutPreExamEl = document.getElementById("sign-out-pre-exam");

            // ----- State -----
            let isBasePending = false;
            let isEnterPending = false;
            let preExamMode = "exam";

            const HOST_URL_BY_MODE = {
                jutge: "https://jutge.org",
                exam: "https://exam.jutge.org",
                contest: "https://contest.jutge.org"
            };
            const CUSTOM_KEY_VALUE = "—Custom name—";

            // ----- Banner helpers -----
            function setBanner(el, text, kind) {
                const str = text == null ? "" : String(text);
                el.textContent = str;
                el.classList.remove("banner--error", "banner--success");
                if (!str.trim()) {
                    el.classList.remove("is-visible");
                    return;
                }
                el.classList.add(kind === "success" ? "banner--success" : "banner--error");
                el.classList.add("is-visible");
            }
            function clearBanner(el) {
                el.textContent = "";
                el.classList.remove("is-visible", "banner--error", "banner--success");
            }

            // ----- Tabs -----
            function activeMode() {
                const t = document.querySelector(".tab.is-active");
                return t ? t.getAttribute("data-mode") : "jutge";
            }
            function setActiveTab(targetMode) {
                document.querySelectorAll(".tab").forEach(function (t) {
                    const active = t.getAttribute("data-mode") === targetMode;
                    t.classList.toggle("is-active", active);
                    t.setAttribute("aria-selected", active ? "true" : "false");
                });
                updateHostUrl();
                updateBaseButtonLabel();
            }
            function updateHostUrl() {
                const m = activeMode();
                const url = HOST_URL_BY_MODE[m] || HOST_URL_BY_MODE.jutge;
                hostUrlEl.textContent = url;
                hostUrlEl.setAttribute("href", url);
            }
            function updateBaseButtonLabel() {
                if (isBasePending) {
                    baseBtnEl.textContent = "Signing in...";
                    return;
                }
                const m = activeMode();
                baseBtnEl.textContent = m === "jutge" ? "Sign in" : "Continue";
            }

            // ----- Step 1: base sign-in -----
            function setBasePending(pending) {
                isBasePending = pending;
                baseBtnEl.disabled = pending;
                updateBaseButtonLabel();
            }

            baseFormEl.addEventListener("submit", function (ev) {
                ev.preventDefault();
                clearBanner(baseBannerEl);
                setBasePending(true);
                vscode.postMessage({
                    type: "signInBaseRequested",
                    payload: {
                        email: emailEl.value,
                        password: passwordEl.value,
                        mode: activeMode()
                    }
                });
            });
            document.querySelectorAll(".tab").forEach(function (t) {
                t.addEventListener("click", function () {
                    const targetMode = t.getAttribute("data-mode");
                    if (!targetMode || targetMode === activeMode()) {
                        return;
                    }
                    clearBanner(baseBannerEl);
                    setActiveTab(targetMode);
                });
            });
            baseFormEl.addEventListener("input", function () {
                clearBanner(baseBannerEl);
            });

            // ----- Step 2: enter exam -----
            function setEnterPending(pending) {
                isEnterPending = pending;
                enterBtnEl.disabled = pending;
                enterBtnEl.textContent = pending
                    ? (preExamMode === "contest" ? "Entering contest..." : "Entering exam...")
                    : (preExamMode === "contest" ? "Enter contest" : "Enter exam");
            }
            function setExamItems(items) {
                examKeyEl.innerHTML = "";
                const placeholder = document.createElement("vscode-option");
                placeholder.value = "";
                placeholder.textContent = preExamMode === "contest"
                    ? "Select a contest..."
                    : "Select an exam...";
                examKeyEl.appendChild(placeholder);
                if (Array.isArray(items)) {
                    items.forEach(function (item) {
                        const o = document.createElement("vscode-option");
                        o.value = item;
                        o.textContent = item;
                        examKeyEl.appendChild(o);
                    });
                }
                const custom = document.createElement("vscode-option");
                custom.value = CUSTOM_KEY_VALUE;
                custom.textContent = CUSTOM_KEY_VALUE;
                examKeyEl.appendChild(custom);
                examKeyEl.value = "";
                updateCustomKeyFieldVisibility();
            }
            function updateCustomKeyFieldVisibility() {
                const showCustom = examKeyEl.value === CUSTOM_KEY_VALUE;
                customKeyFieldEl.style.display = showCustom ? "block" : "none";
                if (!showCustom) {
                    customKeyEl.value = "";
                }
            }
            function selectedExamKey() {
                if (examKeyEl.value !== CUSTOM_KEY_VALUE) {
                    return examKeyEl.value;
                }
                return customKeyEl.value;
            }
            examKeyEl.addEventListener("change", updateCustomKeyFieldVisibility);
            enterFormEl.addEventListener("input", function () {
                clearBanner(enterBannerEl);
            });
            enterFormEl.addEventListener("submit", function (ev) {
                ev.preventDefault();
                clearBanner(enterBannerEl);
                setEnterPending(true);
                vscode.postMessage({
                    type: "enterExamRequested",
                    payload: {
                        examKey: selectedExamKey(),
                        examPassword: enterPasswordEl.value
                    }
                });
            });
            signOutPreExamEl.addEventListener("click", function (ev) {
                ev.preventDefault();
                vscode.postMessage({ type: "signOutPreExamRequested" });
            });

            // ----- Apply state pushed by the extension -----
            function applySignInState(payload) {
                const p = payload || {};
                if (p.state === "pre-exam") {
                    preExamMode = p.mode === "contest" ? "contest" : "exam";
                    bodyEl.setAttribute("data-state", "pre-exam");
                    preExamEmailEl.textContent = p.email || "";
                    preExamModeLabelEl.textContent =
                        preExamMode === "contest" ? "Contest" : "Exam";
                    examKeyLabelEl.textContent =
                        preExamMode === "contest" ? "Contest name" : "Exam name";
                    examPasswordLabelEl.textContent =
                        preExamMode === "contest" ? "Contest password" : "Exam password";
                    setExamItems(p.items || []);
                    setEnterPending(false);
                    clearBanner(enterBannerEl);
                    if (p.itemsError) {
                        setBanner(enterBannerEl, p.itemsError, "error");
                    }
                    return;
                }
                // not-signed-in
                bodyEl.setAttribute("data-state", "not-signed-in");
                if (typeof p.email === "string") {
                    emailEl.value = p.email;
                }
                if (typeof p.password === "string") {
                    passwordEl.value = p.password;
                }
                setBasePending(false);
                clearBanner(baseBannerEl);
                setActiveTab(activeMode());
            }

            window.addEventListener("message", function (event) {
                const message = event.data;
                if (!message) return;
                if (message.type === "signInState") {
                    applySignInState(message.payload);
                    return;
                }
                if (message.type === "signInBaseResult") {
                    const p = message.payload || {};
                    setBasePending(false);
                    if (p.ok) {
                        // Extension will follow up with a "signInState" message for PRE_EXAM.
                        return;
                    }
                    setBanner(baseBannerEl, p.error || "Could not sign in.", "error");
                    return;
                }
                if (message.type === "enterExamResult") {
                    const p = message.payload || {};
                    setEnterPending(false);
                    if (p.ok) {
                        // The webview will disappear via the context-key transition.
                        return;
                    }
                    setBanner(enterBannerEl, p.error || "Could not enter.", "error");
                    return;
                }
                if (message.type === "readyExamsUpdate") {
                    const p = message.payload || {};
                    setExamItems(p.items || []);
                    if (p.error) {
                        setBanner(enterBannerEl, p.error, "error");
                    }
                    return;
                }
            });

            updateHostUrl();
            updateBaseButtonLabel();
            vscode.postMessage({ type: "signInWebviewReady" });
        })();
    </script>
</body>
</html>`
}

type SignInBaseRequestPayload = {
    email?: string
    password?: string
    mode?: string
}

type EnterExamRequestPayload = {
    examKey?: string
    examPassword?: string
}

export class SignInWebviewViewProvider implements vscode.WebviewViewProvider {
    private webviewView_: vscode.WebviewView | undefined

    constructor(private readonly extensionUri: vscode.Uri) {}

    resolveWebviewView(webviewView: vscode.WebviewView): void | Thenable<void> {
        this.webviewView_ = webviewView
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                vscode.Uri.joinPath(this.extensionUri, "src", "webview"),
                vscode.Uri.joinPath(this.extensionUri, "dist"),
            ],
        }
        const scriptUri = webviewView.webview.asWebviewUri(
            vscode.Uri.joinPath(this.extensionUri, "dist", "webview", "signin-elements.js")
        )
        webviewView.webview.html = getSignInHtml({
            scriptUri: scriptUri.toString(),
            cspSource: webviewView.webview.cspSource,
        })

        webviewView.onDidDispose(() => {
            this.webviewView_ = undefined
        })

        webviewView.webview.onDidReceiveMessage(async (message: unknown) => {
            if (!message || typeof message !== "object") {
                return
            }
            const msg = message as { type?: string; payload?: unknown }
            switch (msg.type) {
                case "signInWebviewReady":
                    await this.pushInitialState_()
                    return
                case "signInBaseRequested":
                    await this.handleSignInBase_(msg.payload as SignInBaseRequestPayload)
                    return
                case "enterExamRequested":
                    await this.handleEnterExam_(msg.payload as EnterExamRequestPayload)
                    return
                case "signOutPreExamRequested":
                    await JutgeService.signOutPreExam()
                    await this.pushInitialState_()
                    return
                default:
                    return
            }
        })
    }

    private post_(message: unknown): void {
        this.webviewView_?.webview.postMessage(message)
    }

    private async pushInitialState_(): Promise<void> {
        if (JutgeService.isSignedInPreExam()) {
            await this.pushPreExamState_()
            return
        }
        const [email, password] = await Promise.all([
            JutgeService.getStoredSignInEmail(),
            JutgeService.getStoredSignInPassword(),
        ])
        this.post_({
            type: "signInState",
            payload: {
                state: "not-signed-in",
                email: email ?? "",
                password: password ?? "",
            },
        })
    }

    private async pushPreExamState_(): Promise<void> {
        const mode = JutgeService.getApiMode()
        const examMode: ExamMode = mode === "contest" ? "contest" : "exam"
        const email = (await JutgeService.getStoredSignInEmail()) ?? ""
        const items = await JutgeService.getReadyExamsForMode(examMode)
        this.post_({
            type: "signInState",
            payload: {
                state: "pre-exam",
                mode: examMode,
                email,
                items: items ?? [],
                itemsError:
                    items === undefined
                        ? examMode === "contest"
                            ? "Could not load ready contests."
                            : "Could not load ready exams."
                        : undefined,
            },
        })
    }

    private async handleSignInBase_(
        payload: SignInBaseRequestPayload | undefined
    ): Promise<void> {
        const mode = (payload?.mode as Mode | undefined) ?? "jutge"
        const email = payload?.email || ""
        const password = payload?.password || ""

        if (mode === "exam" || mode === "contest") {
            const result = await JutgeService.signInPreExam({
                email,
                password,
                mode,
                useDevApi: false,
            })
            this.post_({
                type: "signInBaseResult",
                payload: { ok: result.ok, mode, error: result.ok ? undefined : result.error },
            })
            if (result.ok) {
                await this.pushPreExamState_()
            }
            return
        }

        // Normal Jutge sign-in.
        const result = await JutgeService.signInJutge({ email, password })
        this.post_({
            type: "signInBaseResult",
            payload: {
                ok: result.ok,
                mode: "jutge",
                error: result.ok ? undefined : result.error,
            },
        })
    }

    private async handleEnterExam_(
        payload: EnterExamRequestPayload | undefined
    ): Promise<void> {
        const mode = JutgeService.getApiMode()
        const examMode: ExamMode = mode === "contest" ? "contest" : "exam"
        const result = await JutgeService.enterExam({
            mode: examMode,
            examKey: payload?.examKey || "",
            examPassword: payload?.examPassword || "",
        })
        this.post_({
            type: "enterExamResult",
            payload: { ok: result.ok, error: result.ok ? undefined : result.error },
        })
    }
}
