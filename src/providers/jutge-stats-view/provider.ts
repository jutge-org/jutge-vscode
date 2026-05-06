import * as vscode from "vscode"

import { HomepageStats } from "@/jutge_api_client"
import { jutgeClient } from "@/services/jutge"

export const jutgeStatsTreeViewType = "jutge-home"

const HOMEPAGE_TIMEOUT_MS = 12000

class JutgeStatsTreeItem extends vscode.TreeItem {
    constructor(label: string, description?: string) {
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

function toItems(stats: HomepageStats): JutgeStatsTreeItem[] {
    return [
        new JutgeStatsTreeItem("Users", stats.users.toLocaleString()),
        new JutgeStatsTreeItem("Problems", stats.problems.toLocaleString()),
        new JutgeStatsTreeItem("Submissions", stats.submissions.toLocaleString()),
        new JutgeStatsTreeItem("Exams", stats.exams.toLocaleString()),
        new JutgeStatsTreeItem("Contests", stats.contests.toLocaleString()),
    ]
}

export class JutgeStatsTreeProvider implements vscode.TreeDataProvider<JutgeStatsTreeItem> {
    private readonly _onDidChangeTreeData = new vscode.EventEmitter<
        JutgeStatsTreeItem | undefined
    >()
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event

    private items: JutgeStatsTreeItem[] = [new JutgeStatsTreeItem("Loading homepage stats...")]

    constructor() {
        void this.refresh()
    }

    async refresh(): Promise<void> {
        this.items = [new JutgeStatsTreeItem("Loading homepage stats...")]
        this._onDidChangeTreeData.fire(undefined)

        try {
            const stats = await withTimeout(
                jutgeClient.misc.getHomepageStats(),
                HOMEPAGE_TIMEOUT_MS,
                "Timed out while fetching homepage stats."
            )
            this.items = toItems(stats)
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error)
            this.items = [new JutgeStatsTreeItem("Could not load homepage stats", message)]
        }

        this._onDidChangeTreeData.fire(undefined)
    }

    getTreeItem(element: JutgeStatsTreeItem): vscode.TreeItem {
        return element
    }

    getChildren(): Thenable<JutgeStatsTreeItem[]> {
        return Promise.resolve(this.items)
    }
}
