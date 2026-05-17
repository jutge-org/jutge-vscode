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

type ExamMeta = {
    title: string
    startMs: number | null
    expectedStartMs: number | null
    totalMs: number
}

function parseTime(value: string | number | null | undefined): number | null {
    if (value === null || value === undefined) {
        return null
    }
    const ms = new Date(value).getTime()
    return Number.isNaN(ms) ? null : ms
}

function toExamMeta(exam: {
    title: string
    time_start: string | number | null
    exp_time_start: string | number
    running_time: number
}): ExamMeta {
    return {
        title: exam.title ?? "",
        startMs: parseTime(exam.time_start),
        expectedStartMs: parseTime(exam.exp_time_start),
        totalMs: Math.max(0, Number(exam.running_time || 0)) * 60_000,
    }
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
        .exam-header {
            margin: 0 0 14px;
        }
        .exam-header[hidden] {
            display: none;
        }
        .exam-header .exam-title {
            margin: 0 0 10px;
            min-height: 20px;
            font-size: 16px;
            font-weight: 600;
            line-height: 1.25;
            color: var(--vscode-foreground);
            word-break: break-word;
        }
        .timer-block.is-dead {
            opacity: 0.55;
        }
        .timer-block .timer-bar {
            width: 100%;
            height: 6px;
            border-radius: 3px;
            background: rgba(127, 127, 127, 0.22);
            overflow: hidden;
        }
        .timer-block .timer-bar-fill {
            height: 100%;
            width: 0%;
            background: var(--vscode-charts-foreground, var(--vscode-foreground));
            transition: width 600ms linear;
        }
        .timer-block .timer-bar-fill.is-danger {
            background: #c8302c;
        }
        .timer-block .timer-bar-fill.is-ended {
            background: #c8302c;
        }
        .timer-block .timer-labels {
            display: flex;
            justify-content: space-between;
            margin-top: 6px;
            font-size: 11.5px;
            color: var(--vscode-descriptionForeground, #888888);
            gap: 8px;
        }
        .timer-block .timer-labels.is-hidden {
            visibility: hidden;
        }
        .timer-block .timer-label {
            white-space: nowrap;
        }
        .timer-block .timer-label .timer-label-name {
            opacity: 0.75;
            margin-right: 4px;
        }
        .timer-block .timer-label .timer-label-value {
            color: var(--vscode-foreground);
            font-variant-numeric: tabular-nums;
        }
        .timer-block .timer-label.timer-remaining .timer-label-value.is-danger {
            color: #d33;
        }
        .exam-empty-state {
            text-align: center;
            padding: 64px 16px;
        }
        .exam-empty-state[hidden] {
            display: none;
        }
        .exam-empty-state .empty-title {
            margin: 0 0 3px;
            font-size: 14px;
            font-style: italic;
            color: var(--vscode-foreground);
        }
        .exam-empty-state .empty-subtitle {
            margin: 0;
            font-size: 12px;
            color: var(--vscode-descriptionForeground, #888888);
        }
        .exam-empty-state .empty-subtitle:empty {
            display: none;
        }
        .problems-list {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        .problems-list[hidden] {
            display: none;
        }
        .problem-card {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 10px 12px;
            border: 1px solid var(--vscode-widget-border, rgba(127, 127, 127, 0.25));
            border-radius: 6px;
            background: transparent;
            cursor: pointer;
            color: var(--vscode-foreground);
            transition: background-color 100ms ease, border-color 100ms ease;
        }
        .problem-card:hover {
            background: var(--vscode-list-hoverBackground, rgba(127, 127, 127, 0.10));
        }
        .problem-card:focus {
            outline: 1px solid var(--vscode-focusBorder);
            outline-offset: -1px;
        }
        .problem-card .icon-slot {
            flex: 0 0 auto;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 28px;
            height: 28px;
        }
        .problem-card .icon-slot svg {
            display: block;
            width: 100%;
            height: 100%;
        }
        .problem-card .card-text {
            flex: 1;
            min-width: 0;
            display: flex;
            align-items: baseline;
            gap: 8px;
        }
        .problem-card .card-caption {
            color: var(--vscode-descriptionForeground, #888888);
            font-size: 12px;
            white-space: nowrap;
        }
        .problem-card .card-title {
            flex: 1;
            min-width: 0;
            font-size: 14px;
            line-height: 1.3;
            word-break: break-word;
        }
        .problem-card .card-points {
            flex: 0 0 auto;
            font-variant-numeric: tabular-nums;
            color: var(--vscode-descriptionForeground, #888888);
            font-size: 12px;
            white-space: nowrap;
        }
        .problem-card.is-accepted {
            border-color: rgba(76, 175, 80, 0.55);
            background: rgba(76, 175, 80, 0.07);
        }
        .problem-card.is-accepted:hover {
            background: rgba(76, 175, 80, 0.14);
        }
        .problem-card.is-accepted .card-title {
            color: var(--vscode-testing-iconPassed, var(--vscode-charts-green, #4caf50));
            font-weight: 500;
        }
        .problem-card.is-accepted .card-points {
            color: var(--vscode-testing-iconPassed, var(--vscode-charts-green, #4caf50));
        }
    </style>
</head>
<body>
    <div id="status" class="status">Loading exam problems...</div>
    <header id="exam-header" class="exam-header">
        <h2 id="exam-title" class="exam-title"></h2>
        <div id="timer-block" class="timer-block is-dead">
            <div class="timer-bar">
                <div id="timer-bar-fill" class="timer-bar-fill"></div>
            </div>
            <div id="timer-labels-running" class="timer-labels is-hidden">
                <span class="timer-label timer-start">
                    <span class="timer-label-name">Start</span>
                    <span id="timer-start-value" class="timer-label-value">—</span>
                </span>
                <span class="timer-label timer-end">
                    <span class="timer-label-name">End</span>
                    <span id="timer-end-value" class="timer-label-value">—</span>
                </span>
                <span class="timer-label timer-remaining">
                    <span class="timer-label-name">Remaining</span>
                    <span id="timer-remaining-value" class="timer-label-value">—</span>
                </span>
            </div>
        </div>
    </header>
    <div id="exam-empty-state" class="exam-empty-state" hidden>
        <p id="empty-title" class="empty-title">Exam not started yet</p>
        <p id="empty-subtitle" class="empty-subtitle"></p>
    </div>
    <div id="problems" class="problems-list" hidden></div>

    <script>
        (function() {
            const vscode = acquireVsCodeApi();
            const statusEl = document.getElementById("status");
            const tableEl = document.getElementById("problems");
            const bodyEl = tableEl;
            const headerEl = document.getElementById("exam-header");
            const titleEl = document.getElementById("exam-title");
            const timerEl = document.getElementById("timer-block");
            const fillEl = document.getElementById("timer-bar-fill");
            const labelsRunningEl = document.getElementById("timer-labels-running");
            const startValEl = document.getElementById("timer-start-value");
            const endValEl = document.getElementById("timer-end-value");
            const remainingValEl = document.getElementById("timer-remaining-value");
            const emptyStateEl = document.getElementById("exam-empty-state");
            const emptyTitleEl = document.getElementById("empty-title");
            const emptySubtitleEl = document.getElementById("empty-subtitle");
            const ICONS = ${iconJson};
            const TICK_MS = 10000;
            const DANGER_THRESHOLD_RATIO = 0.10;
            let timerState = null;
            let tickHandle = null;

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

            function formatClock(ms) {
                if (typeof ms !== "number" || !isFinite(ms)) return "—";
                const d = new Date(ms);
                if (isNaN(d.getTime())) return "—";
                const hh = String(d.getHours()).padStart(2, "0");
                const mm = String(d.getMinutes()).padStart(2, "0");
                return hh + ":" + mm;
            }
            function formatRemaining(ms) {
                const clamped = Math.max(0, ms);
                const totalMinutes = Math.floor(clamped / 60000);
                const hours = Math.floor(totalMinutes / 60);
                const minutes = totalMinutes % 60;
                if (hours > 0) return hours + "h " + minutes + "m";
                if (minutes > 0) return minutes + "m";
                return "<1m";
            }

            function setHeaderPlaceholder() {
                titleEl.textContent = "";
                timerState = null;
                stopTicker();
                timerEl.classList.add("is-dead");
                fillEl.style.width = "0%";
                fillEl.classList.remove("is-danger", "is-ended");
                labelsRunningEl.classList.add("is-hidden");
            }
            function renderHeader(meta) {
                if (!meta) {
                    setHeaderPlaceholder();
                    return;
                }
                titleEl.textContent = meta.title || "";

                const hasStart = typeof meta.startMs === "number";
                const hasDuration = typeof meta.totalMs === "number" && meta.totalMs > 0;
                fillEl.classList.remove("is-danger", "is-ended");

                if (hasStart && hasDuration) {
                    timerState = {
                        startMs: meta.startMs,
                        endMs: meta.startMs + meta.totalMs,
                        totalMs: meta.totalMs
                    };
                    timerEl.classList.remove("is-dead");
                    labelsRunningEl.classList.remove("is-hidden");
                    startValEl.textContent = formatClock(timerState.startMs);
                    endValEl.textContent = formatClock(timerState.endMs);
                    redrawTimer();
                    startTicker();
                    return;
                }

                // Exam has not started yet (no real start time): dead, gray, no labels.
                timerState = null;
                stopTicker();
                timerEl.classList.add("is-dead");
                fillEl.style.width = "0%";
                labelsRunningEl.classList.add("is-hidden");
            }
            function showEmptyState(message, subtitle) {
                emptyTitleEl.textContent = message || "";
                emptySubtitleEl.textContent = subtitle || "";
                emptyStateEl.hidden = !message;
            }
            function hideEmptyState() {
                emptyStateEl.hidden = true;
            }
            function redrawTimer() {
                if (!timerState) return;
                const now = Date.now();
                const elapsed = Math.max(0, Math.min(1, (now - timerState.startMs) / timerState.totalMs));
                const remaining = Math.max(0, timerState.endMs - now);
                const ended = elapsed >= 1;
                fillEl.style.width = (elapsed * 100).toFixed(2) + "%";
                fillEl.classList.toggle("is-danger", !ended && elapsed > 1 - DANGER_THRESHOLD_RATIO);
                fillEl.classList.toggle("is-ended", ended);
                if (ended) {
                    remainingValEl.textContent = "ended";
                    remainingValEl.classList.add("is-danger");
                } else {
                    remainingValEl.textContent = formatRemaining(remaining);
                    remainingValEl.classList.toggle(
                        "is-danger",
                        remaining <= timerState.totalMs * DANGER_THRESHOLD_RATIO
                    );
                }
            }
            function startTicker() {
                stopTicker();
                tickHandle = setInterval(redrawTimer, TICK_MS);
            }
            function stopTicker() {
                if (tickHandle !== null) {
                    clearInterval(tickHandle);
                    tickHandle = null;
                }
            }

            function renderRows(rows) {
                bodyEl.innerHTML = "";
                rows.forEach(function(row) {
                    const card = document.createElement("div");
                    card.className = "problem-card";
                    if (row.iconStatus === "accepted") {
                        card.classList.add("is-accepted");
                    }
                    card.setAttribute("data-problem-nm", row.problem_nm);
                    card.setAttribute("data-order", String(row.order));
                    card.setAttribute("tabindex", "0");
                    card.setAttribute("role", "button");
                    card.title = row.problem_nm;

                    const slot = document.createElement("span");
                    slot.className = "icon-slot";
                    slot.setAttribute("data-status", row.iconStatus);
                    slot.setAttribute("title", row.iconStatus);
                    slot.innerHTML = iconSvg(row.iconStatus);
                    card.appendChild(slot);

                    const text = document.createElement("div");
                    text.className = "card-text";
                    if (row.caption) {
                        const captionEl = document.createElement("span");
                        captionEl.className = "card-caption";
                        captionEl.textContent = row.caption;
                        text.appendChild(captionEl);
                    }
                    const titleEl = document.createElement("span");
                    titleEl.className = "card-title";
                    titleEl.textContent = row.title || "";
                    text.appendChild(titleEl);
                    card.appendChild(text);

                    const pointsText = formatPoints(row.weight);
                    if (pointsText) {
                        const pointsEl = document.createElement("span");
                        pointsEl.className = "card-points";
                        pointsEl.textContent = pointsText + " pts";
                        card.appendChild(pointsEl);
                    }

                    function activate() {
                        vscode.postMessage({
                            type: "openProblem",
                            payload: { problem_nm: row.problem_nm, order: row.order }
                        });
                    }
                    card.addEventListener("click", activate);
                    card.addEventListener("keydown", function(ev) {
                        if (ev.key === "Enter" || ev.key === " ") {
                            ev.preventDefault();
                            activate();
                        }
                    });

                    bodyEl.appendChild(card);
                });
                tableEl.hidden = rows.length === 0;
            }

            window.addEventListener("message", function(event) {
                const message = event.data;
                if (!message || typeof message !== "object") return;
                if (message.type === "examLoading") {
                    setStatus("Loading exam problems...", false);
                    setHeaderPlaceholder();
                    tableEl.hidden = true;
                    hideEmptyState();
                    return;
                }
                if (message.type === "examResult") {
                    const payload = message.payload || {};
                    if (!payload.ok) {
                        setStatus(payload.error || "Could not load exam problems.", true);
                        setHeaderPlaceholder();
                        tableEl.hidden = true;
                        hideEmptyState();
                        return;
                    }
                    const meta = payload.exam || null;
                    renderHeader(meta);
                    const rows = Array.isArray(payload.rows) ? payload.rows : [];
                    const started = meta && typeof meta.startMs === "number";
                    if (meta && !started) {
                        setStatus("", false);
                        tableEl.hidden = true;
                        showEmptyState(
                            "Exam not started yet",
                            typeof meta.expectedStartMs === "number"
                                ? "expected " + formatClock(meta.expectedStartMs)
                                : ""
                        );
                        return;
                    }
                    if (rows.length === 0) {
                        hideEmptyState();
                        setStatus("", false);
                        tableEl.hidden = true;
                        return;
                    }
                    hideEmptyState();
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

// Jittered polling window for the "exam not started yet" case. With ~500
// concurrent students re-rolling the delay each tick spreads the load across
// the [POLL_MIN_MS, POLL_MAX_MS] window instead of producing a synchronized
// spike on the server.
const POLL_MIN_MS = 20_000
const POLL_MAX_MS = 40_000

function pollDelayMs(): number {
    return POLL_MIN_MS + Math.floor(Math.random() * (POLL_MAX_MS - POLL_MIN_MS))
}

export class JutgeExamsWebviewViewProvider
    extends Logger
    implements vscode.WebviewViewProvider, vscode.Disposable
{
    private webviewView: vscode.WebviewView | undefined
    private currentRows: ProblemRow[] = []
    private currentExamMeta: ExamMeta | null = null
    private iconMap: IconMap
    private startPollHandle: ReturnType<typeof setTimeout> | null = null

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
        this.stopStartPoll_()
        this.webviewView = undefined
    }

    private stopStartPoll_(): void {
        if (this.startPollHandle !== null) {
            clearTimeout(this.startPollHandle)
            this.startPollHandle = null
        }
    }

    /**
     * While the exam has not started yet, keep checking `exam.get()` so the UI
     * automatically transitions from "Exam not started" to the live timer the
     * moment the server flips `time_start`. Uses jittered timing — see
     * POLL_MIN_MS / POLL_MAX_MS.
     */
    private scheduleStartPoll_(): void {
        this.stopStartPoll_()
        if (!this.webviewView) {
            return
        }
        if (!this.currentExamMeta || this.currentExamMeta.startMs !== null) {
            return
        }
        this.startPollHandle = setTimeout(() => {
            this.startPollHandle = null
            void this.loadAndPush_()
        }, pollDelayMs())
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
            this.stopStartPoll_()
            this.currentRows = []
            this.currentExamMeta = null
            await this.webviewView.webview.postMessage({
                type: "examResult",
                payload: { ok: true, rows: [], exam: null },
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
            this.currentExamMeta = toExamMeta(exam)

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
        } finally {
            this.scheduleStartPoll_()
        }
    }

    private async pushRows_(): Promise<void> {
        if (!this.webviewView) {
            return
        }
        await this.webviewView.webview.postMessage({
            type: "examResult",
            payload: { ok: true, rows: this.currentRows, exam: this.currentExamMeta },
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
