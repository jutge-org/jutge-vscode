import * as vscode from "vscode"

import { ColorMapping, Ranking, RankingResult } from "@/jutge_api_client"
import { jutgeClient } from "@/services/jutge"

export const rankingTreeViewType = "jutge-ranking"

const RANKING_TIMEOUT_MS = 12000
const RANKING_REFRESH_INTERVAL_MS = 10000
const rankingPanelViewType = "jutge-ranking-panel"

class RankingTreeItem extends vscode.TreeItem {
    constructor(label: string | vscode.TreeItemLabel, description?: string) {
        super(label, vscode.TreeItemCollapsibleState.None)
        this.description = description
    }
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(message)), timeoutMs)
        promise
            .then((result) => resolve(result))
            .catch((error) => reject(error))
            .finally(() => clearTimeout(timer))
    })
}

function toItems(ranking: Ranking): RankingTreeItem[] {
    if (ranking.length === 0) {
        return [new RankingTreeItem("No ranking data")]
    }

    return ranking.map((entry, index) => {
        const position = entry.position ?? index + 1
        const baseLabel = `${position}. ${entry.name}  `
        const scoreText = `${entry.score}`
        const scoreChunk = `【${scoreText}】`
        const labelText = `${baseLabel}${scoreChunk}`
        return new RankingTreeItem(
            {
                label: labelText,
                highlights: [[baseLabel.length, baseLabel.length + scoreChunk.length]],
            },
            `${Math.floor(entry.time)}`
        )
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

function scoreCellHtml(result: RankingResult, colors: ColorMapping): string {
    if (result.verdict === null) {
        return ""
    }

    const verdictColor = colors.verdicts[result.verdict] ?? "var(--vscode-foreground)"
    const wrongs = result.wrongs !== 0 ? ` <span class="subtle">(${result.wrongs})</span>` : ""

    if (result.verdict === "AC") {
        return `<div style="color:${verdictColor}">${Math.floor(result.time)}${wrongs}</div>`
    }

    return `<div style="color:${verdictColor}">${Math.floor(result.time)}${wrongs}<br/>${escapeHtml(
        result.verdict
    )}</div>`
}

function rankingPanelHtml(params: { ranking: Ranking; colors: ColorMapping }): string {
    const { ranking, colors } = params
    const rows = ranking
        .map((row) => {
            const perProblem = row.rankingResults
                .map(
                    (result) => `<td class="problem-cell">${scoreCellHtml(result, colors)}</td>`
                )
                .join("")
            return `<tr>
                <td class="position">${row.position ?? ""}</td>
                <td class="name">${escapeHtml(row.name)}</td>
                <td class="score"><strong>${row.score}</strong><div class="subtle">${Math.floor(
                    row.time
                )}</div></td>
                ${perProblem}
                <td class="score"><strong>${row.score}</strong><div class="subtle">${Math.floor(
                    row.time
                )}</div></td>
            </tr>`
        })
        .join("")

    const problemCount = ranking[0]?.rankingResults.length ?? 0
    const headers = Array.from({ length: problemCount }, (_, i) => `P${i + 1}`)
        .map((title) => `<th>${title}</th>`)
        .join("")

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline';" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Contest Ranking</title>
    <style>
        body {
            margin: 0;
            padding: 12px;
            color: var(--vscode-foreground);
            font-family: var(--vscode-font-family);
            background: var(--vscode-editor-background);
        }
        .table-wrap {
            overflow: auto;
        }
        table {
            border-collapse: separate;
            border-spacing: 4px;
            font-size: 12px;
            margin: 0 auto;
        }
        th, td {
            background: var(--vscode-inputOption-activeBackground, var(--vscode-editorWidget-background));
            border-radius: 4px;
            border: 1px solid var(--vscode-widget-border, transparent);
            padding: 6px 8px;
            text-align: center;
            white-space: nowrap;
            min-height: 28px;
        }
        th {
            font-weight: 600;
        }
        td.name {
            text-align: left;
            max-width: 240px;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        .subtle {
            opacity: 0.75;
            font-size: 11px;
        }
    </style>
</head>
<body>
    <div class="table-wrap">
        <table>
            <thead>
                <tr>
                    <th></th>
                    <th></th>
                    <th>Score</th>
                    ${headers}
                    <th>Score</th>
                </tr>
            </thead>
            <tbody>
                ${rows || `<tr><td colspan="${problemCount + 4}">No ranking data</td></tr>`}
            </tbody>
        </table>
    </div>
</body>
</html>`
}

export class RankingPanel implements vscode.Disposable {
    private static current: RankingPanel | undefined
    private readonly panel: vscode.WebviewPanel
    private readonly intervalId: ReturnType<typeof setInterval>
    private disposed = false

    private constructor() {
        this.panel = vscode.window.createWebviewPanel(
            rankingPanelViewType,
            "Contest Ranking",
            vscode.ViewColumn.Beside,
            { enableScripts: false }
        )
        this.panel.onDidDispose(() => this.dispose())
        this.intervalId = setInterval(() => {
            void this.refresh()
        }, RANKING_REFRESH_INTERVAL_MS)
        void this.refresh()
    }

    static openOrReveal(): void {
        if (RankingPanel.current) {
            RankingPanel.current.panel.reveal(vscode.ViewColumn.Beside, true)
            return
        }
        RankingPanel.current = new RankingPanel()
    }

    dispose(): void {
        if (this.disposed) {
            return
        }
        this.disposed = true
        clearInterval(this.intervalId)
        if (RankingPanel.current === this) {
            RankingPanel.current = undefined
        }
        this.panel.dispose()
    }

    private async refresh(): Promise<void> {
        try {
            const [ranking, colors] = await Promise.all([
                withTimeout(
                    jutgeClient.student.exam.getRanking(),
                    RANKING_TIMEOUT_MS,
                    "Timed out while fetching contest ranking."
                ),
                withTimeout(
                    jutgeClient.misc.getHexColors(),
                    RANKING_TIMEOUT_MS,
                    "Timed out while fetching ranking colors."
                ),
            ])
            this.panel.webview.html = rankingPanelHtml({
                ranking,
                colors,
            })
        } catch (error) {
            const message = escapeHtml(error instanceof Error ? error.message : String(error))
            this.panel.webview.html = `<!DOCTYPE html><html><body><p>Could not load ranking: ${message}</p></body></html>`
        }
    }
}

export class RankingTreeProvider
    implements vscode.TreeDataProvider<RankingTreeItem>, vscode.Disposable
{
    private readonly _onDidChangeTreeData = new vscode.EventEmitter<
        RankingTreeItem | undefined
    >()
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event

    private readonly intervalId: ReturnType<typeof setInterval>
    private items: RankingTreeItem[] = [new RankingTreeItem("Loading ranking...")]

    constructor() {
        this.intervalId = setInterval(() => {
            void this.refresh()
        }, RANKING_REFRESH_INTERVAL_MS)
        void this.refresh()
    }

    dispose(): void {
        clearInterval(this.intervalId)
    }

    async refresh(): Promise<void> {
        this.items = [new RankingTreeItem("Loading ranking...")]
        this._onDidChangeTreeData.fire(undefined)

        try {
            const ranking = await withTimeout(
                jutgeClient.student.exam.getRanking(),
                RANKING_TIMEOUT_MS,
                "Timed out while fetching contest ranking."
            )
            this.items = toItems(ranking)
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error)
            this.items = [new RankingTreeItem("Could not load ranking", message)]
        }

        this._onDidChangeTreeData.fire(undefined)
    }

    getTreeItem(element: RankingTreeItem): vscode.TreeItem {
        return element
    }

    getChildren(): Thenable<RankingTreeItem[]> {
        return Promise.resolve(this.items)
    }
}
