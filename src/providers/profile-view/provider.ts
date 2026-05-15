import * as vscode from "vscode"

import { Profile } from "@/jutge_api_client"
import { jutgeClient } from "@/services/jutge"

export const profileWebviewViewType = "jutge-profile"

const PROFILE_TIMEOUT_MS = 12000
const AVATAR_TIMEOUT_MS = 12000

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
        content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data:;"
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
        .profile-header {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 4px;
            padding: 6px 0 14px;
            text-align: center;
        }
        .profile-header .avatar {
            width: 80px;
            height: 80px;
            border-radius: 50%;
            object-fit: cover;
            background: var(--vscode-input-background, rgba(127, 127, 127, 0.15));
        }
        .profile-header .avatar[hidden] {
            display: none;
        }
        .profile-header .name {
            margin-top: 6px;
            font-size: 15px;
            font-weight: 600;
            line-height: 1.2;
            word-break: break-word;
        }
        .profile-header .email {
            font-size: 12px;
            color: var(--vscode-descriptionForeground, #888888);
            opacity: 0.9;
            word-break: break-all;
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
        table.profile td a {
            color: var(--vscode-textLink-foreground, #3794ff);
            text-decoration: none;
            word-break: break-all;
        }
        table.profile td a:hover {
            color: var(--vscode-textLink-activeForeground, var(--vscode-textLink-foreground, #3794ff));
            text-decoration: underline;
        }
        table.profile tr + tr th,
        table.profile tr + tr td {
            border-top: 1px solid var(--vscode-widget-border, rgba(127, 127, 127, 0.18));
        }
    </style>
</head>
<body>
    <div id="status" class="status">Loading profile...</div>
    <div id="header" class="profile-header" hidden>
        <img id="avatar" class="avatar" alt="" hidden />
        <div id="name" class="name"></div>
        <div id="email" class="email"></div>
    </div>
    <table id="profile" class="profile" hidden></table>

    <script>
        (function() {
            const vscode = acquireVsCodeApi();
            const statusEl = document.getElementById("status");
            const headerEl = document.getElementById("header");
            const avatarEl = document.getElementById("avatar");
            const nameEl = document.getElementById("name");
            const emailEl = document.getElementById("email");
            const tableEl = document.getElementById("profile");

            const OMITTED_FIELDS = new Set([
                "user_uid",
                "name",
                "email",
                "nickname",
                "username",
                "description",
                "administrator",
                "instructor",
                "parent_email",
            ]);

            const FIELD_LABELS = {
                webpage: "Personal Site",
                affiliation: "Affiliation",
                birth_year: "Birth Year",
                max_subsxhour: "Hourly limit",
                max_subsxday: "Daily limit",
                country_id: "Country",
                timezone_id: "Timezone",
                compiler_id: "Compiler",
                language_id: "Language",
            };

            function fieldLabel(key) {
                return Object.prototype.hasOwnProperty.call(FIELD_LABELS, key)
                    ? FIELD_LABELS[key]
                    : key;
            }

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
                th.textContent = fieldLabel(key);
                tr.appendChild(th);
                const td = document.createElement("td");
                if (key === "webpage" && typeof value === "string" && value.trim() !== "") {
                    const a = document.createElement("a");
                    const trimmed = value.trim();
                    a.href = /^https?:\\/\\//i.test(trimmed) ? trimmed : "https://" + trimmed;
                    a.target = "_blank";
                    a.rel = "noopener noreferrer";
                    a.textContent = trimmed;
                    td.appendChild(a);
                } else if (value === null || value === undefined) {
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

            function renderHeader(profile, avatarUrl) {
                if (avatarUrl) {
                    avatarEl.src = avatarUrl;
                    avatarEl.hidden = false;
                } else {
                    avatarEl.removeAttribute("src");
                    avatarEl.hidden = true;
                }
                nameEl.textContent =
                    profile && typeof profile.name === "string" ? profile.name : "";
                emailEl.textContent =
                    profile && typeof profile.email === "string" ? profile.email : "";
                headerEl.hidden = !profile;
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
                    : Object.entries(profile).filter(function(entry) {
                        if (OMITTED_FIELDS.has(entry[0])) return false;
                        if (entry[0] === "webpage") {
                            return typeof entry[1] === "string" && entry[1].trim() !== "";
                        }
                        return true;
                    });
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
                    headerEl.hidden = true;
                    tableEl.hidden = true;
                    return;
                }
                if (message.type === "profileResult") {
                    const payload = message.payload || {};
                    if (payload.ok) {
                        setStatus("", false);
                        renderHeader(payload.profile, payload.avatarUrl);
                        renderTable(payload.profile);
                    } else {
                        setStatus(payload.error || "Could not load profile.", true);
                        headerEl.hidden = true;
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
            const [profile, avatarUrl] = await Promise.all([
                withTimeout(
                    jutgeClient.student.profile.get(),
                    PROFILE_TIMEOUT_MS,
                    "Timed out while fetching profile."
                ) as Promise<Profile>,
                this.fetchAvatarDataUrl_(),
            ])
            await this.webviewView.webview.postMessage({
                type: "profileResult",
                payload: { ok: true, profile, avatarUrl },
            })
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error)
            await this.webviewView.webview.postMessage({
                type: "profileResult",
                payload: { ok: false, error: message },
            })
        }
    }

    private async fetchAvatarDataUrl_(): Promise<string | null> {
        try {
            const avatar = await withTimeout(
                jutgeClient.student.profile.getAvatar(),
                AVATAR_TIMEOUT_MS,
                "Timed out while fetching avatar."
            )
            if (!avatar || !avatar.data) {
                return null
            }
            const base64 = Buffer.from(avatar.data).toString("base64")
            const mime = avatar.type || "image/png"
            return `data:${mime};base64,${base64}`
        } catch {
            return null
        }
    }
}
