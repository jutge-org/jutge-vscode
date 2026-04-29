import * as vscode from "vscode"

import { HomepageStats } from "@/jutge_api_client"
import { jutgeClient } from "@/services/jutge"

export const homeTreeViewType = "jutge-home"

const HOMEPAGE_TIMEOUT_MS = 12000

class HomeTreeItem extends vscode.TreeItem {
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

function toItems(stats: HomepageStats): HomeTreeItem[] {
    return [
        new HomeTreeItem("Users", stats.users.toLocaleString()),
        new HomeTreeItem("Problems", stats.problems.toLocaleString()),
        new HomeTreeItem("Submissions", stats.submissions.toLocaleString()),
        new HomeTreeItem("Exams", stats.exams.toLocaleString()),
        new HomeTreeItem("Contests", stats.contests.toLocaleString()),
    ]
}

export class HomeTreeProvider implements vscode.TreeDataProvider<HomeTreeItem> {
    private readonly _onDidChangeTreeData = new vscode.EventEmitter<HomeTreeItem | undefined>()
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event

    private items: HomeTreeItem[] = [new HomeTreeItem("Loading homepage stats...")]

    constructor() {
        void this.refresh()
    }

    async refresh(): Promise<void> {
        this.items = [new HomeTreeItem("Loading homepage stats...")]
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
            this.items = [new HomeTreeItem("Could not load homepage stats", message)]
        }

        this._onDidChangeTreeData.fire(undefined)
    }

    getTreeItem(element: HomeTreeItem): vscode.TreeItem {
        return element
    }

    getChildren(): Thenable<HomeTreeItem[]> {
        return Promise.resolve(this.items)
    }
}
