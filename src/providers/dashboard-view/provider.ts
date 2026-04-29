import * as vscode from "vscode"

import { AbstractProblem, RunningExam, Submission } from "@/jutge_api_client"
import { jutgeClient } from "@/services/jutge"

const DASHBOARD_REFRESH_INTERVAL_MS = 10000
const DASHBOARD_TIMEOUT_MS = 12000
const dashboardPanelViewType = "jutge-dashboard-panel"

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(message)), timeoutMs)
        promise
            .then((result) => resolve(result))
            .catch((error) => reject(error))
            .finally(() => clearTimeout(timer))
    })
}

function escapeHtml(text: string): string {
    return text
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;")
}

function asText(value: unknown): string {
    if (value === null || value === undefined) {
        return "-"
    }
    return String(value)
}

function formatDateTime(value: unknown): string {
    if (value === null || value === undefined || value === "") {
        return "-"
    }
    const date = new Date(value as string | number)
    if (Number.isNaN(date.getTime())) {
        return asText(value)
    }
    return date.toLocaleString()
}

function getEndTime(exam: RunningExam): string {
    if (exam.time_start === null || exam.time_start === undefined || exam.time_start === "") {
        return "-"
    }
    const start = new Date(exam.time_start as string | number)
    if (Number.isNaN(start.getTime())) {
        return "-"
    }
    const runningMinutes = Number(exam.running_time)
    if (!Number.isFinite(runningMinutes)) {
        return "-"
    }
    const end = new Date(start.getTime() + runningMinutes * 60 * 1000)
    return end.toLocaleString()
}

type ProblemStats = {
    totalSubmissions: number
    acceptedSubmissions: number
    latestVerdict: string
}

function extractProblemNm(problemId: string): string {
    const firstUnderscore = problemId.indexOf("_")
    if (firstUnderscore <= 0) {
        return problemId
    }
    return problemId.slice(0, firstUnderscore)
}

function buildProblemStats(
    exam: RunningExam,
    submissions: Submission[],
    abstractProblems: AbstractProblem[]
): Map<string, ProblemStats> {
    const statsByProblemNm = new Map<
        string,
        {
            totalSubmissions: number
            acceptedSubmissions: number
            latestSubmission: Submission | null
        }
    >()
    const examProblemNms = new Set(exam.problems.map((problem) => problem.problem_nm))
    const problemIdsByNm = new Map<string, Set<string>>()

    for (const abstractProblem of abstractProblems) {
        const ids = new Set(Object.keys(abstractProblem.problems || {}))
        problemIdsByNm.set(abstractProblem.problem_nm, ids)
    }

    for (const submission of submissions) {
        const submissionProblemId = submission.problem_id
        const submissionProblemNm = extractProblemNm(submissionProblemId)
        if (!examProblemNms.has(submissionProblemNm)) {
            continue
        }

        const knownIds = problemIdsByNm.get(submissionProblemNm)
        if (knownIds && knownIds.size > 0 && !knownIds.has(submissionProblemId)) {
            continue
        }

        const current = statsByProblemNm.get(submissionProblemNm) || {
            totalSubmissions: 0,
            acceptedSubmissions: 0,
            latestSubmission: null,
        }

        current.totalSubmissions += 1
        if (submission.veredict === "AC") {
            current.acceptedSubmissions += 1
        }
        if (!current.latestSubmission) {
            current.latestSubmission = submission
        } else {
            const currentTime = new Date(
                current.latestSubmission.time_in as string | number
            ).getTime()
            const nextTime = new Date(submission.time_in as string | number).getTime()
            if (
                Number.isFinite(nextTime) &&
                (!Number.isFinite(currentTime) || nextTime >= currentTime)
            ) {
                current.latestSubmission = submission
            }
        }
        statsByProblemNm.set(submissionProblemNm, current)
    }

    const result = new Map<string, ProblemStats>()
    for (const examProblem of exam.problems) {
        const current = statsByProblemNm.get(examProblem.problem_nm)
        result.set(examProblem.problem_nm, {
            totalSubmissions: current?.totalSubmissions || 0,
            acceptedSubmissions: current?.acceptedSubmissions || 0,
            latestVerdict: current?.latestSubmission?.veredict || "-",
        })
    }
    return result
}

type DashboardData = {
    exam: RunningExam
    submissions: Submission[]
    compilers: Record<string, { name: string }>
    rankingCount: number | null
    problemStats: Map<string, ProblemStats>
}

async function loadDashboardData(): Promise<DashboardData> {
    const [exam, submissions, compilers] = await Promise.all([
        withTimeout(
            jutgeClient.student.exam.get(),
            DASHBOARD_TIMEOUT_MS,
            "Timed out while fetching exam details."
        ),
        withTimeout(
            jutgeClient.student.submissions.getAll(),
            DASHBOARD_TIMEOUT_MS,
            "Timed out while fetching submissions."
        ),
        withTimeout(
            jutgeClient.tables.getCompilers(),
            DASHBOARD_TIMEOUT_MS,
            "Timed out while fetching compilers."
        ),
    ])

    let rankingCount: number | null = null
    if (exam.contest) {
        try {
            const ranking = await withTimeout(
                jutgeClient.student.exam.getRanking(),
                DASHBOARD_TIMEOUT_MS,
                "Timed out while fetching ranking."
            )
            rankingCount = ranking.length
        } catch {
            rankingCount = null
        }
    }

    let abstractProblems: AbstractProblem[] = []
    if (exam.problems.length > 0) {
        try {
            const byNm = await withTimeout(
                jutgeClient.problems.getAbstractProblems(
                    exam.problems.map((problem) => problem.problem_nm).join(",")
                ),
                DASHBOARD_TIMEOUT_MS,
                "Timed out while fetching abstract problems."
            )
            abstractProblems = Object.values(byNm || {})
        } catch {
            abstractProblems = []
        }
    }

    const problemStats = buildProblemStats(exam, submissions, abstractProblems)
    return {
        exam,
        submissions,
        compilers,
        rankingCount,
        problemStats,
    }
}

function panelHtml(params: { data: DashboardData }): string {
    const { data } = params
    const { exam, compilers, rankingCount, problemStats } = data

    const problemRows = exam.problems
        .map((problem) => {
            const stats = problemStats.get(problem.problem_nm)
            return `<tr>
                <td>${escapeHtml(asText(problem.caption))}</td>
                <td>${escapeHtml(asText(problem.icon))}</td>
                <td>${escapeHtml(asText(problem.weight))}</td>
                <td>${escapeHtml(problem.problem_nm)}</td>
                <td>${stats?.totalSubmissions ?? 0}</td>
                <td>${stats?.acceptedSubmissions ?? 0}</td>
                <td>${escapeHtml(stats?.latestVerdict ?? "-")}</td>
            </tr>`
        })
        .join("")

    const compilerRows = exam.compilers
        .map((compilerKey) => {
            const compilerName = compilers[compilerKey]?.name || "-"
            return `<tr>
                <td>${escapeHtml(compilerKey)}</td>
                <td>${escapeHtml(compilerName)}</td>
            </tr>`
        })
        .join("")

    const documentRows = (exam.documents || [])
        .map(
            (doc) => `<tr>
                <td>
                    <a href="#" data-document-nm="${escapeHtml(doc.document_nm)}" data-document-title="${escapeHtml(
                        doc.title
                    )}">${escapeHtml(doc.title)}</a>
                </td>
                <td>${escapeHtml(doc.description || "-")}</td>
            </tr>`
        )
        .join("")

    const rankingButton = exam.contest
        ? `<button id="open-ranking-btn" title="Open ranking">≣ Ranking</button>`
        : ""

    const rankingInfo =
        exam.contest && rankingCount !== null
            ? `<span class="hint">Entries: ${rankingCount}</span>`
            : ""

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta
        http-equiv="Content-Security-Policy"
        content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';"
    />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Exam Dashboard</title>
    <style>
        body {
            margin: 0;
            padding: 12px;
            color: var(--vscode-foreground);
            font-family: var(--vscode-font-family);
            background: var(--vscode-editor-background);
            font-size: 12px;
        }
        .toolbar {
            display: flex;
            gap: 8px;
            align-items: center;
            margin-bottom: 12px;
        }
        button {
            border: none;
            border-radius: 3px;
            padding: 4px 10px;
            color: var(--vscode-button-foreground);
            background: var(--vscode-button-background);
            cursor: pointer;
            font-family: inherit;
            font-size: inherit;
        }
        button:hover {
            background: var(--vscode-button-hoverBackground);
        }
        .hint {
            opacity: 0.8;
        }
        .section {
            margin-bottom: 14px;
        }
        .section h3 {
            margin: 0 0 6px;
            font-size: 13px;
        }
        .description,
        .instructions {
            white-space: pre-wrap;
            padding: 8px;
            border: 1px solid var(--vscode-widget-border, transparent);
            border-radius: 4px;
            background: var(--vscode-editorWidget-background);
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 4px;
        }
        th,
        td {
            border: 1px solid var(--vscode-widget-border, transparent);
            padding: 6px;
            text-align: left;
            vertical-align: top;
        }
        th {
            background: var(--vscode-sideBarSectionHeader-background, var(--vscode-editorWidget-background));
        }
    </style>
</head>
<body>
    <div class="toolbar">
        <button id="refresh-btn">Refresh</button>
        ${rankingButton}
        ${rankingInfo}
    </div>

    <div class="section">
        <h3>Exam title</h3>
        <div>${escapeHtml(exam.title || "-")}</div>
    </div>

    <div class="section">
        <h3>Description</h3>
        <div class="description">${escapeHtml(exam.description || "-")}</div>
    </div>

    <div class="section">
        <h3>Instructions</h3>
        <div class="instructions">${escapeHtml(exam.instructions || "-")}</div>
    </div>

    <div class="section">
        <h3>Schedule</h3>
        <table>
            <thead>
                <tr>
                    <th>Expected start</th>
                    <th>Start</th>
                    <th>End</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>${escapeHtml(formatDateTime(exam.exp_time_start))}</td>
                    <td>${escapeHtml(formatDateTime(exam.time_start))}</td>
                    <td>${escapeHtml(getEndTime(exam))}</td>
                </tr>
            </tbody>
        </table>
    </div>

    <div class="section">
        <h3>Problems</h3>
        <table>
            <thead>
                <tr>
                    <th>Caption</th>
                    <th>Icon</th>
                    <th>Weight</th>
                    <th>problem_nm</th>
                    <th>Total submissions</th>
                    <th>Accepted submissions</th>
                    <th>Latest verdict</th>
                </tr>
            </thead>
            <tbody>
                ${problemRows || `<tr><td colspan="7">No problems</td></tr>`}
            </tbody>
        </table>
    </div>

    <div class="section">
        <h3>Available compilers</h3>
        <table>
            <thead>
                <tr>
                    <th>Key</th>
                    <th>Name</th>
                </tr>
            </thead>
            <tbody>
                ${compilerRows || `<tr><td colspan="2">No compilers</td></tr>`}
            </tbody>
        </table>
    </div>

    <div class="section">
        <h3>Documents</h3>
        <table>
            <thead>
                <tr>
                    <th>Title</th>
                    <th>Description</th>
                </tr>
            </thead>
            <tbody>
                ${documentRows || `<tr><td colspan="2">No documents</td></tr>`}
            </tbody>
        </table>
    </div>

    <script>
        (function() {
            const vscode = acquireVsCodeApi();
            const refreshBtn = document.getElementById("refresh-btn");
            if (refreshBtn) {
                refreshBtn.addEventListener("click", () => vscode.postMessage({ type: "refresh" }));
            }
            const rankingBtn = document.getElementById("open-ranking-btn");
            if (rankingBtn) {
                rankingBtn.addEventListener("click", () => vscode.postMessage({ type: "openRanking" }));
            }
            document.querySelectorAll("a[data-document-nm]").forEach((link) => {
                link.addEventListener("click", (event) => {
                    event.preventDefault();
                    const target = event.currentTarget;
                    if (!target) {
                        return;
                    }
                    const documentNm = target.getAttribute("data-document-nm");
                    const documentTitle = target.getAttribute("data-document-title");
                    vscode.postMessage({
                        type: "openDocument",
                        payload: { documentNm, documentTitle }
                    });
                });
            });
        })();
    </script>
</body>
</html>`
}

function panelErrorHtml(message: string): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline';" />
</head>
<body>
    <p>Could not load dashboard: ${escapeHtml(message)}</p>
</body>
</html>`
}

export class DashboardPanel implements vscode.Disposable {
    private static current: DashboardPanel | undefined
    private readonly panel: vscode.WebviewPanel
    private readonly intervalId: ReturnType<typeof setInterval>
    private disposed = false
    private refreshing = false

    private constructor() {
        this.panel = vscode.window.createWebviewPanel(
            dashboardPanelViewType,
            "Exam Dashboard",
            vscode.ViewColumn.Beside,
            { enableScripts: true }
        )
        this.panel.onDidDispose(() => this.dispose())
        this.panel.webview.onDidReceiveMessage(async (message: unknown) => {
            if (!message || typeof message !== "object") {
                return
            }
            const msg = message as {
                type?: string
                payload?: { documentNm?: string; documentTitle?: string }
            }
            if (msg.type === "refresh") {
                await this.refresh()
                return
            }
            if (msg.type === "openRanking") {
                await vscode.commands.executeCommand("jutge-vscode.openRankingPanel")
                return
            }
            if (msg.type === "openDocument" && msg.payload?.documentNm) {
                await vscode.commands.executeCommand(
                    "jutge-vscode.openExamDocument",
                    msg.payload.documentNm,
                    msg.payload.documentTitle
                )
            }
        })
        this.intervalId = setInterval(() => {
            void this.refresh()
        }, DASHBOARD_REFRESH_INTERVAL_MS)
        void this.refresh()
    }

    static openOrReveal(): void {
        if (DashboardPanel.current) {
            DashboardPanel.current.panel.reveal(vscode.ViewColumn.Beside, true)
            void DashboardPanel.current.refresh()
            return
        }
        DashboardPanel.current = new DashboardPanel()
    }

    dispose(): void {
        if (this.disposed) {
            return
        }
        this.disposed = true
        clearInterval(this.intervalId)
        if (DashboardPanel.current === this) {
            DashboardPanel.current = undefined
        }
        this.panel.dispose()
    }

    private async refresh(): Promise<void> {
        if (this.refreshing || this.disposed) {
            return
        }
        this.refreshing = true
        try {
            const data = await loadDashboardData()
            this.panel.webview.html = panelHtml({ data })
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error)
            this.panel.webview.html = panelErrorHtml(message)
        } finally {
            this.refreshing = false
        }
    }
}
