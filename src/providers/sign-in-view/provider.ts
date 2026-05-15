import * as vscode from "vscode"
import { JutgeService } from "@/services/jutge"

export const signInWebviewViewType = "jutge-sign-in"

type SignInHtmlOptions = {
    isDevelopmentMode: boolean
    scriptUri: string
    cspSource: string
}

function getSignInHtml({ isDevelopmentMode, scriptUri, cspSource }: SignInHtmlOptions): string {
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
        .conditional {
            display: none;
        }
        .conditional.visible {
            display: block;
        }
        form#sign-in-form {
            margin: 0;
        }
        .actions {
            margin-top: 48px;
        }
        .action-button-row {
            width: 100%;
            margin-top: 12px;
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
        .sign-in-banner {
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
        .sign-in-banner.is-visible {
            display: block;
            opacity: 1;
        }
        @starting-style {
            .sign-in-banner.is-visible {
                opacity: 0;
            }
        }
        .sign-in-banner.sign-in-banner--error {
            color: #ffffff;
            background: #c8302c;
            border: none;
        }
        .sign-in-banner.sign-in-banner--success {
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
<body>
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
            <vscode-single-select id="exam-name" name="exam-name">
                <vscode-option value="">Select an exam...</vscode-option>
            </vscode-single-select>
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
            <vscode-single-select id="contest-name" name="contest-name">
                <vscode-option value="">Select a contest...</vscode-option>
            </vscode-single-select>
        </div>
        <div id="contest-custom-name-field" class="field" style="display: none;">
            <input type="text" id="contest-custom-name" name="contest-custom-name" autocomplete="off" />
        </div>
        <div class="field">
            <label class="field-label" for="contest-password">Contest password</label>
            <input type="password" id="contest-password" name="contest-password" autocomplete="off" />
        </div>
    </div>

        <div class="action-button-row">
            <button type="submit" class="sign-in-btn" id="sign-in-btn">Sign in</button>
        </div>

        <div
            id="sign-in-message-jutge"
            class="sign-in-banner"
            role="status"
            aria-live="polite"
            data-message-mode="jutge"
        ></div>
        <div
            id="sign-in-message-exam"
            class="sign-in-banner"
            role="status"
            aria-live="polite"
            data-message-mode="exam"
        ></div>
        <div
            id="sign-in-message-contest"
            class="sign-in-banner"
            role="status"
            aria-live="polite"
            data-message-mode="contest"
        ></div>
    </form>
    <div class="actions">
        ${quickSignInRow}
        ${useDevApiCheckboxRow}
    </div>

    <script src="${scriptUri}"></script>
    <script>
        (function () {
            var vscode = acquireVsCodeApi();
            var pendingTimer = null;
            var isLoadingOptions = false;
            var signInPending = false;
            var pendingSignInMode = null;
            var SIGN_IN_BANNER_MODES = ["jutge", "exam", "contest"];
            function bannerEl(tabMode) {
                return document.getElementById("sign-in-message-" + tabMode);
            }
            function syncBannerVisibility() {
                SIGN_IN_BANNER_MODES.forEach(function (m) {
                    var el = bannerEl(m);
                    if (!el) {
                        return;
                    }
                    var hasContent = Boolean(el.textContent && el.textContent.trim());
                    el.classList.toggle("is-visible", hasContent && mode() === m);
                });
            }
            function clearBanner(tabMode) {
                var el = bannerEl(tabMode);
                if (!el) {
                    return;
                }
                el.textContent = "";
                el.classList.remove("sign-in-banner--error", "sign-in-banner--success");
                syncBannerVisibility();
            }
            function clearAllBanners() {
                SIGN_IN_BANNER_MODES.forEach(clearBanner);
            }
            function setBanner(tabMode, text, kind) {
                var el = bannerEl(tabMode);
                if (!el) {
                    return;
                }
                var str = text == null ? "" : String(text);
                el.textContent = str;
                el.classList.remove("sign-in-banner--error", "sign-in-banner--success");
                if (!str.trim()) {
                    syncBannerVisibility();
                    return;
                }
                el.classList.add(kind === "success" ? "sign-in-banner--success" : "sign-in-banner--error");
                syncBannerVisibility();
            }
            function signInResultTargetMode(payload) {
                var m = payload && payload.mode;
                if (m === "jutge" || m === "exam" || m === "contest") {
                    return m;
                }
                return mode();
            }
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
                    var url = HOST_URL_BY_MODE[mode()] || HOST_URL_BY_MODE.jutge;
                    el.textContent = url;
                    el.setAttribute("href", url);
                }
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
                var option = document.createElement("vscode-option");
                option.value = "";
                option.textContent = text;
                list.appendChild(option);
            }
            function addOthersOption(list) {
                var option = document.createElement("vscode-option");
                option.value = "—Custom name—";
                option.textContent = "—Custom name—";
                list.appendChild(option);
            }
            function setLoadingOptions(loading) {
                isLoadingOptions = loading;
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
                syncBannerVisibility();
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
            document.getElementById("sign-in-form").addEventListener("input", clearAllBanners);
            document.getElementById("sign-in-form").addEventListener("change", clearAllBanners);
            document.getElementById("sign-in-form").addEventListener("submit", function (ev) {
                ev.preventDefault();
                if (isLoadingOptions) {
                    setBanner(mode(), "Please wait until exams/contests are loaded.", "error");
                    return;
                }
                pendingSignInMode = mode();
                clearBanner(pendingSignInMode);
                setPending(true);
                clearPendingTimer();
                pendingTimer = setTimeout(function () {
                    setPending(false);
                    var m = pendingSignInMode || mode();
                    pendingSignInMode = null;
                    var timeoutMsg =
                        m === "exam"
                            ? "Exam sign-in timed out. Please try again."
                            : m === "contest"
                              ? "Contest sign-in timed out. Please try again."
                              : "Jutge.org sign-in timed out. Please try again.";
                    setBanner(m, timeoutMsg, "error");
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
                    pendingSignInMode = "contest";
                    clearBanner("contest");
                    setPending(true);
                    clearPendingTimer();
                    pendingTimer = setTimeout(function () {
                        setPending(false);
                        pendingSignInMode = null;
                        setBanner(
                            "contest",
                            "Contest sign-in timed out. Please try again.",
                            "error"
                        );
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
                    pendingSignInMode = null;
                    var payload = message.payload || {};
                    var text = payload.message;
                    if (!payload.ok && (!text || !String(text).trim())) {
                        var tm = signInResultTargetMode(payload);
                        if (tm === "exam") {
                            text = "Could not sign in to this exam. Check your details and try again.";
                        } else if (tm === "contest") {
                            text = "Could not sign in to this contest. Check your details and try again.";
                        } else {
                            text = "Could not sign in to Jutge.org. Check your details and try again.";
                        }
                    }
                    setBanner(signInResultTargetMode(payload), text, payload.ok ? "success" : "error");
                    return;
                }
                if (message.type === "loadReadyItemsResult") {
                    var payload = message.payload || {};
                    var targetMode = payload.mode;
                    var input = targetMode === "contest"
                        ? document.getElementById("contest-name")
                        : document.getElementById("exam-name");
                    if (payload.ok) {
                        clearBanner(targetMode);
                    }
                    clearOptions(input);
                    if (payload.ok && Array.isArray(payload.items) && payload.items.length > 0) {
                        addDefaultOption(
                            input,
                            targetMode === "contest" ? "Select a contest..." : "Select an exam..."
                        );
                        payload.items.forEach(function(item) {
                            var option = document.createElement("vscode-option");
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
                        setBanner(
                            targetMode,
                            payload.error
                                || (targetMode === "contest"
                                    ? "Could not load ready contests."
                                    : "Could not load ready exams."),
                            "error"
                        );
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
        const scriptUri = webviewView.webview.asWebviewUri(
            vscode.Uri.joinPath(this.extensionUri, "dist", "webview", "signin-elements.js")
        )
        webviewView.webview.html = getSignInHtml({
            isDevelopmentMode: this.showQuickSignIn,
            scriptUri: scriptUri.toString(),
            cspSource: webviewView.webview.cspSource,
        })
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
                            error:
                                requestedMode === "contest"
                                    ? "Could not load ready contests."
                                    : "Could not load ready exams.",
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
                            mode: "contest",
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
                            mode: "contest",
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
                            mode: "contest",
                            message: result.ok ? "Signed in successfully." : result.error,
                        },
                    })
                } catch (error) {
                    const text =
                        error instanceof Error && error.message
                            ? error.message
                            : "Contest quick sign-in failed. Please try again."
                    webviewView.webview.postMessage({
                        type: "signInResult",
                        payload: { ok: false, mode: "contest", message: text },
                    })
                }
                return
            }

            if (msg.type !== "signInRequested") {
                return
            }

            const signInMode =
                msg.payload?.mode === "contest" ||
                msg.payload?.mode === "exam" ||
                msg.payload?.mode === "jutge"
                    ? msg.payload.mode
                    : "jutge"

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
                        mode: signInMode,
                        message: result.ok ? "Signed in successfully." : result.error,
                    },
                })
            } catch (error) {
                const text =
                    error instanceof Error && error.message
                        ? error.message
                        : signInMode === "exam"
                          ? "Could not sign in to this exam. Please try again."
                          : signInMode === "contest"
                            ? "Could not sign in to this contest. Please try again."
                            : "Could not sign in to Jutge.org. Please try again."
                webviewView.webview.postMessage({
                    type: "signInResult",
                    payload: { ok: false, mode: signInMode, message: text },
                })
            }
        })
    }
}
