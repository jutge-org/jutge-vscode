import * as vscode from "vscode"

import { Profile } from "@/jutge_api_client"
import { jutgeClient } from "@/services/jutge"

export const profileWebviewViewType = "jutge-profile"

const PROFILE_TIMEOUT_MS = 12000

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(message)), timeoutMs)
        promise
            .then((result) => resolve(result))
            .catch((error) => reject(error))
            .finally(() => clearTimeout(timer))
    })
}

function getProfileHtml(): string {
    return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta
        http-equiv="Content-Security-Policy"
        content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';"
    />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Profile</title>
    <style>
        :root {
            color-scheme: light dark;
            font-size: 13px;
        }
        body {
            margin: 0;
            padding: 8px 10px 12px;
            color: var(--vscode-foreground);
            font-family: var(--vscode-font-family);
            line-height: 1.45;
            background: var(--vscode-sideBar-background);
        }
        .status {
            padding: 4px 0;
            font-size: 12px;
            color: var(--vscode-descriptionForeground, #888888);
        }
        .status.is-error {
            color: var(--vscode-errorForeground, #d33);
        }
        table.profile {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
        }
        table.profile th,
        table.profile td {
            padding: 4px 8px 4px 0;
            vertical-align: top;
            text-align: left;
        }
        table.profile th {
            font-weight: 500;
            color: var(--vscode-descriptionForeground, #888888);
            white-space: nowrap;
            width: 1%;
        }
        table.profile td {
            color: var(--vscode-foreground);
            word-break: break-word;
        }
        table.profile td.empty-value {
            opacity: 0.6;
            font-style: italic;
        }
        table.profile tr + tr th,
        table.profile tr + tr td {
            border-top: 1px solid var(--vscode-widget-border, rgba(127, 127, 127, 0.18));
        }
    </style>
</head>
<body>
    <div id="status" class="status">Loading profile...</div>
    <table id="profile" class="profile" hidden></table>

    <script>
        (function() {
            const vscode = acquireVsCodeApi();
            const statusEl = document.getElementById("status");
            const tableEl = document.getElementById("profile");

            function setStatus(text, isError) {
                statusEl.textContent = text || "";
                statusEl.classList.toggle("is-error", Boolean(isError));
                statusEl.hidden = !text;
            }

            function inlineValue(value) {
                if (typeof value === "string") return value;
                return JSON.stringify(value);
            }

            function appendRow(key, value) {
                const tr = document.createElement("tr");
                const th = document.createElement("th");
                th.textContent = key;
                tr.appendChild(th);
                const td = document.createElement("td");
                if (value === null || value === undefined) {
                    td.textContent = "null";
                    td.classList.add("empty-value");
                } else if (typeof value === "string" && value === "") {
                    td.textContent = "(empty)";
                    td.classList.add("empty-value");
                } else {
                    td.textContent = inlineValue(value);
                }
                tr.appendChild(td);
                tableEl.appendChild(tr);
            }

            function renderTable(profile) {
                tableEl.innerHTML = "";
                if (profile === null || profile === undefined || typeof profile !== "object") {
                    appendRow("value", profile);
                    tableEl.hidden = false;
                    return;
                }
                const entries = Array.isArray(profile)
                    ? profile.map(function(v, i) { return ["[" + i + "]", v]; })
                    : Object.entries(profile);
                entries.forEach(function(entry) {
                    appendRow(entry[0], entry[1]);
                });
                tableEl.hidden = false;
            }

            window.addEventListener("message", function(event) {
                const message = event.data;
                if (!message || typeof message !== "object") return;
                if (message.type === "profileLoading") {
                    setStatus("Loading profile...", false);
                    tableEl.hidden = true;
                    return;
                }
                if (message.type === "profileResult") {
                    const payload = message.payload || {};
                    if (payload.ok) {
                        setStatus("", false);
                        renderTable(payload.profile);
                    } else {
                        setStatus(payload.error || "Could not load profile.", true);
                        tableEl.hidden = true;
                    }
                }
            });

            vscode.postMessage({ type: "profileViewReady" });
        })();
    </script>
</body>
</html>`
}

export class ProfileWebviewViewProvider implements vscode.WebviewViewProvider {
    private webviewView: vscode.WebviewView | undefined

    resolveWebviewView(webviewView: vscode.WebviewView): void | Thenable<void> {
        this.webviewView = webviewView
        webviewView.webview.options = {
            enableScripts: true,
        }
        webviewView.webview.html = getProfileHtml()

        webviewView.onDidDispose(() => {
            this.webviewView = undefined
        })

        webviewView.webview.onDidReceiveMessage(async (message: unknown) => {
            if (!message || typeof message !== "object") {
                return
            }
            const msg = message as { type?: string }
            if (msg.type === "profileViewReady") {
                await this.loadAndPushProfile_()
            }
        })
    }

    async refresh(): Promise<void> {
        await this.loadAndPushProfile_()
    }

    private async loadAndPushProfile_(): Promise<void> {
        if (!this.webviewView) {
            return
        }
        await this.webviewView.webview.postMessage({ type: "profileLoading" })
        try {
            const profile: Profile = await withTimeout(
                jutgeClient.student.profile.get(),
                PROFILE_TIMEOUT_MS,
                "Timed out while fetching profile."
            )
            await this.webviewView.webview.postMessage({
                type: "profileResult",
                payload: { ok: true, profile },
            })
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error)
            await this.webviewView.webview.postMessage({
                type: "profileResult",
                payload: { ok: false, error: message },
            })
        }
    }
}
