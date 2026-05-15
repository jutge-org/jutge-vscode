import * as fs from "fs"
import * as path from "path"
import * as vscode from "vscode"

import { AbstractProblem, AbstractStatus, BriefProblem } from "@/jutge_api_client"
import { Logger } from "@/loggers"
import { ConfigService } from "@/services/config"
import { JutgeService } from "@/services/jutge"
import { Veredict } from "@/services/submission"
import { IconStatus, SubmissionStatus, status2IconStatus } from "@/types"

export const examsWebviewViewType = "jutge-exams"

const ICON_STATUSES: IconStatus[] = [
    IconStatus.ACCEPTED,
    IconStatus.PRESENTATION_ERROR,
    IconStatus.REJECTED,
    IconStatus.NONE,
    IconStatus.FAILED,
]

type ProblemRow = {
    problem_nm: string
    order: number
    caption: string
    title: string
    weight: number
    iconStatus: IconStatus
}

type IconMap = Record<string, { dark: string; light: string }>

function loadIconMap(extensionUri: vscode.Uri): IconMap {
    const map: IconMap = {}
    const resourcesDir = path.join(extensionUri.fsPath, "resources")
    for (const status of ICON_STATUSES) {
        const darkPath = path.join(resourcesDir, "dark", `${status}.svg`)
        const lightPath = path.join(resourcesDir, "light", `${status}.svg`)
        let dark = ""
        let light = ""
        try {
            dark = fs.readFileSync(darkPath, "utf8")
        } catch {
            // Missing icons (e.g. failed) fall back to the "none" SVG below.
        }
        try {
            light = fs.readFileSync(lightPath, "utf8")
        } catch {
            // Missing icons fall back to the "none" SVG below.
        }
        map[status] = { dark, light }
    }
    // Fall back to "none" for any status whose SVG is missing.
    const fallback = map[IconStatus.NONE]
    for (const status of ICON_STATUSES) {
        if (!map[status].dark) {
            map[status].dark = fallback?.dark || ""
        }
        if (!map[status].light) {
            map[status].light = fallback?.light || ""
        }
    }
    return map
}

function getExamsHtml(iconMap: IconMap): string {
    const iconJson = JSON.stringify(iconMap).replace(/<\/script/gi, "<\\/script")
    return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta
        http-equiv="Content-Security-Policy"
        content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';"
    />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Exams</title>
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
            line-height: 1.4;
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
        .status[hidden] {
            display: none;
        }
        table.exam-problems {
            width: 100%;
            border-collapse: collapse;
            font-size: 13.8px;
        }
        table.exam-problems[hidden] {
            display: none;
        }
        table.exam-problems th,
        table.exam-problems td {
            padding: 4px 6px;
            vertical-align: middle;
            text-align: left;
        }
        table.exam-problems thead th {
            font-weight: 500;
            color: var(--vscode-descriptionForeground, #888888);
            border-bottom: 1px solid var(--vscode-widget-border, rgba(127, 127, 127, 0.25));
        }
        table.exam-problems th.points,
        table.exam-problems td.points {
            text-align: right;
            white-space: nowrap;
            width: 1%;
        }
        table.exam-problems td.icon {
            width: 1%;
            padding-right: 4px;
        }
        table.exam-problems td.icon .icon-slot {
            display: inline-block;
            width: 20px;
            height: 20px;
            margin-top: -3px;
            vertical-align: middle;
        }
        table.exam-problems td.icon .icon-slot svg {
            display: block;
            width: 100%;
            height: 100%;
        }
        table.exam-problems td.caption {
            width: 1%;
            white-space: nowrap;
            color: var(--vscode-descriptionForeground, #888888);
            padding-right: 4px;
        }
        table.exam-problems td.title {
            word-break: break-word;
        }
        table.exam-problems tbody tr {
            cursor: pointer;
        }
        table.exam-problems tbody tr:hover {
            background: var(--vscode-list-hoverBackground, rgba(127, 127, 127, 0.12));
        }
        table.exam-problems tbody tr:focus {
            outline: 1px solid var(--vscode-focusBorder);
            outline-offset: -1px;
        }
        table.exam-problems tbody tr + tr td {
            border-top: 1px solid var(--vscode-widget-border, rgba(127, 127, 127, 0.18));
        }
    </style>
</head>
<body>
    <div id="status" class="status">Loading exam problems...</div>
    <table id="problems" class="exam-problems" hidden>
        <thead>
            <tr>
                <th></th>
                <th></th>
                <th>Problem</th>
                <th class="points">Points</th>
            </tr>
        </thead>
        <tbody id="problems-body"></tbody>
    </table>

    <script>
        (function() {
            const vscode = acquireVsCodeApi();
            const statusEl = document.getElementById("status");
            const tableEl = document.getElementById("problems");
            const bodyEl = document.getElementById("problems-body");
            const ICONS = ${iconJson};

            function isLightTheme() {
                return document.body.classList.contains("vscode-light");
            }
            function iconSvg(status) {
                const entry = ICONS[status] || ICONS["none"] || { dark: "", light: "" };
                return isLightTheme() ? entry.light : entry.dark;
            }
            function refreshIcons() {
                const slots = bodyEl.querySelectorAll(".icon-slot[data-status]");
                slots.forEach(function(slot) {
                    slot.innerHTML = iconSvg(slot.getAttribute("data-status"));
                });
            }
            new MutationObserver(refreshIcons).observe(document.body, {
                attributes: true,
                attributeFilter: ["class"]
            });

            function setStatus(text, isError) {
                statusEl.textContent = text || "";
                statusEl.classList.toggle("is-error", Boolean(isError));
                statusEl.hidden = !text;
            }

            function formatPoints(weight) {
                if (typeof weight !== "number" || !isFinite(weight)) return "";
                const rounded = Math.round(weight * 100) / 100;
                return String(rounded);
            }

            function renderRows(rows) {
                bodyEl.innerHTML = "";
                rows.forEach(function(row) {
                    const tr = document.createElement("tr");
                    tr.setAttribute("data-problem-nm", row.problem_nm);
                    tr.setAttribute("data-order", String(row.order));
                    tr.setAttribute("tabindex", "0");
                    tr.title = row.problem_nm;

                    const tdIcon = document.createElement("td");
                    tdIcon.className = "icon";
                    const slot = document.createElement("span");
                    slot.className = "icon-slot";
                    slot.setAttribute("data-status", row.iconStatus);
                    slot.setAttribute("title", row.iconStatus);
                    slot.innerHTML = iconSvg(row.iconStatus);
                    tdIcon.appendChild(slot);
                    tr.appendChild(tdIcon);

                    const tdCaption = document.createElement("td");
                    tdCaption.className = "caption";
                    tdCaption.textContent = row.caption || "";
                    tr.appendChild(tdCaption);

                    const tdTitle = document.createElement("td");
                    tdTitle.className = "title";
                    tdTitle.textContent = row.title || "";
                    tr.appendChild(tdTitle);

                    const tdPoints = document.createElement("td");
                    tdPoints.className = "points";
                    tdPoints.textContent = formatPoints(row.weight);
                    tr.appendChild(tdPoints);

                    tr.addEventListener("click", function() {
                        vscode.postMessage({
                            type: "openProblem",
                            payload: { problem_nm: row.problem_nm, order: row.order }
                        });
                    });
                    tr.addEventListener("keydown", function(ev) {
                        if (ev.key === "Enter" || ev.key === " ") {
                            ev.preventDefault();
                            vscode.postMessage({
                                type: "openProblem",
                                payload: { problem_nm: row.problem_nm, order: row.order }
                            });
                        }
                    });

                    bodyEl.appendChild(tr);
                });
                tableEl.hidden = rows.length === 0;
            }

            window.addEventListener("message", function(event) {
                const message = event.data;
                if (!message || typeof message !== "object") return;
                if (message.type === "examLoading") {
                    setStatus("Loading exam problems...", false);
                    tableEl.hidden = true;
                    return;
                }
                if (message.type === "examResult") {
                    const payload = message.payload || {};
                    if (!payload.ok) {
                        setStatus(payload.error || "Could not load exam problems.", true);
                        tableEl.hidden = true;
                        return;
                    }
                    const rows = Array.isArray(payload.rows) ? payload.rows : [];
                    if (rows.length === 0) {
                        setStatus("No problems in this exam.", false);
                        tableEl.hidden = true;
                        return;
                    }
                    setStatus("", false);
                    renderRows(rows);
                }
            });

            vscode.postMessage({ type: "examViewReady" });
        })();
    </script>
</body>
</html>`
}

export class JutgeExamsWebviewViewProvider
    extends Logger
    implements vscode.WebviewViewProvider, vscode.Disposable
{
    private webviewView: vscode.WebviewView | undefined
    private currentRows: ProblemRow[] = []
    private iconMap: IconMap

    constructor(private readonly extensionUri: vscode.Uri) {
        super()
        this.iconMap = loadIconMap(extensionUri)
    }

    resolveWebviewView(webviewView: vscode.WebviewView): void | Thenable<void> {
        this.webviewView = webviewView
        webviewView.webview.options = {
            enableScripts: true,
        }
        webviewView.webview.html = getExamsHtml(this.iconMap)

        webviewView.onDidDispose(() => {
            this.webviewView = undefined
        })

        webviewView.webview.onDidReceiveMessage(async (message: unknown) => {
            if (!message || typeof message !== "object") {
                return
            }
            const msg = message as {
                type?: string
                payload?: { problem_nm?: string; order?: number }
            }
            if (msg.type === "examViewReady") {
                await this.loadAndPush_()
                return
            }
            if (msg.type === "openProblem" && msg.payload?.problem_nm) {
                await vscode.commands.executeCommand(
                    "jutge-vscode.showProblem",
                    msg.payload.problem_nm,
                    msg.payload.order ?? -1
                )
            }
        })
    }

    dispose(): void {
        this.webviewView = undefined
    }

    public refresh = async (): Promise<void> => {
        await this.loadAndPush_()
    }

    public refreshProblem({ problem_nm, status }: Veredict): void {
        const row = this.currentRows.find((r) => r.problem_nm === problem_nm)
        if (!row) {
            this.log.info(`Verdict for unknown problem '${problem_nm}'`)
            return
        }
        const newIcon = mergeIconStatus(row.iconStatus, status)
        if (newIcon === row.iconStatus) {
            return
        }
        row.iconStatus = newIcon
        void this.pushRows_()
    }

    private async loadAndPush_(): Promise<void> {
        if (!this.webviewView) {
            return
        }
        if (!JutgeService.isSignedInExam()) {
            this.currentRows = []
            await this.webviewView.webview.postMessage({
                type: "examResult",
                payload: { ok: true, rows: [] },
            })
            return
        }

        try {
            const swrExam = JutgeService.getExamSWR()
            swrExam.onUpdate = () => void this.loadAndPush_()

            const exam = swrExam.data
            if (!exam) {
                await this.webviewView.webview.postMessage({ type: "examLoading" })
                return
            }

            const problem_nms = exam.problems.map((p) => p.problem_nm)
            const swrProblems = JutgeService.getAbstractProblemsSWR(problem_nms)
            swrProblems.onUpdate = () => void this.loadAndPush_()

            const swrStatus = JutgeService.getAllStatusesSWR()
            swrStatus.onUpdate = () => void this.loadAndPush_()

            if (swrProblems.data === undefined || swrStatus.data === undefined) {
                await this.webviewView.webview.postMessage({ type: "examLoading" })
                return
            }

            const abstractProblems = swrProblems.data
            const allStatuses = swrStatus.data

            const rows: ProblemRow[] = []
            let order = 1
            for (const abstractProblem of abstractProblems) {
                const examProblem = exam.problems[order - 1]
                const caption = examProblem?.caption || ""
                const weight = examProblem?.weight ?? 1.0
                const { title, iconStatus, problem_nm } = abstractProblemSummary(
                    abstractProblem,
                    allStatuses
                )
                rows.push({ problem_nm, order, caption, title, weight, iconStatus })
                order++
            }

            this.currentRows = rows
            await this.pushRows_()
        } catch (error) {
            this.log.error(error)
            const message = error instanceof Error ? error.message : String(error)
            await this.webviewView.webview.postMessage({
                type: "examResult",
                payload: { ok: false, error: message },
            })
        }
    }

    private async pushRows_(): Promise<void> {
        if (!this.webviewView) {
            return
        }
        await this.webviewView.webview.postMessage({
            type: "examResult",
            payload: { ok: true, rows: this.currentRows },
        })
    }
}

function abstractProblemSummary(
    abstractProblem: AbstractProblem,
    allStatuses: Record<string, AbstractStatus>
): { problem_nm: string; title: string; iconStatus: IconStatus } {
    const { problem_nm, problems } = abstractProblem
    const langCode = ConfigService.getPreferredLangId()
    const preferredId = `${problem_nm}_${langCode}`

    let problem: BriefProblem | undefined
    if (preferredId in problems) {
        problem = problems[preferredId]
    } else {
        problem = Object.values(problems)[0]
    }

    const iconStatus = (allStatuses[problem_nm]?.status || "none") as IconStatus
    return { problem_nm, title: problem.title, iconStatus }
}

function mergeIconStatus(current: IconStatus, status: SubmissionStatus): IconStatus {
    switch (current) {
        case IconStatus.NONE:
            return status2IconStatus[status]
        case IconStatus.REJECTED:
            if (status === SubmissionStatus.PE) {
                return IconStatus.PRESENTATION_ERROR
            }
            if (status === SubmissionStatus.AC) {
                return IconStatus.ACCEPTED
            }
            return current
        case IconStatus.PRESENTATION_ERROR:
            if (status === SubmissionStatus.AC) {
                return IconStatus.ACCEPTED
            }
            return current
        default:
            return current
    }
}
