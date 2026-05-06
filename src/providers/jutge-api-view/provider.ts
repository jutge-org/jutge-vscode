import * as vscode from "vscode"

import { ApiVersion } from "@/jutge_api_client"
import { jutgeClient } from "@/services/jutge"

export const jutgeApiTreeViewType = "jutge-api"

const API_VERSION_TIMEOUT_MS = 12000

class JutgeApiTreeItem extends vscode.TreeItem {
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

function toItems(version: ApiVersion): JutgeApiTreeItem[] {
    return [
        new JutgeApiTreeItem("Version", version.version),
        new JutgeApiTreeItem("Mode", version.mode),
        new JutgeApiTreeItem("Git hash", version.gitHash),
        new JutgeApiTreeItem("Git branch", version.gitBranch),
        new JutgeApiTreeItem("Git date", version.gitDate),
    ]
}

export class JutgeApiTreeProvider implements vscode.TreeDataProvider<JutgeApiTreeItem> {
    private readonly _onDidChangeTreeData = new vscode.EventEmitter<
        JutgeApiTreeItem | undefined
    >()
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event

    private items: JutgeApiTreeItem[] = [new JutgeApiTreeItem("Loading API version...")]

    constructor() {
        void this.refresh()
    }

    async refresh(): Promise<void> {
        this.items = [new JutgeApiTreeItem("Loading API version...")]
        this._onDidChangeTreeData.fire(undefined)

        try {
            const version = await withTimeout(
                jutgeClient.misc.getApiVersion(),
                API_VERSION_TIMEOUT_MS,
                "Timed out while fetching API version."
            )
            this.items = toItems(version)
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error)
            this.items = [new JutgeApiTreeItem("Could not load API version", message)]
        }

        this._onDidChangeTreeData.fire(undefined)
    }

    getTreeItem(element: JutgeApiTreeItem): vscode.TreeItem {
        return element
    }

    getChildren(): Thenable<JutgeApiTreeItem[]> {
        return Promise.resolve(this.items)
    }
}
