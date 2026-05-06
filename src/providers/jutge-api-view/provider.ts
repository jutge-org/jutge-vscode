import * as vscode from "vscode"

import { ApiVersion, RequestInformation, Time } from "@/jutge_api_client"
import { jutgeClient } from "@/services/jutge"

export const jutgeApiTreeViewType = "jutge-api"

const API_REQUEST_TIMEOUT_MS = 12000

class JutgeApiTreeItem extends vscode.TreeItem {
    readonly children: JutgeApiTreeItem[]

    constructor(label: string, description?: string, children: JutgeApiTreeItem[] = []) {
        super(
            label,
            children.length > 0
                ? vscode.TreeItemCollapsibleState.Expanded
                : vscode.TreeItemCollapsibleState.None
        )
        this.description = description
        this.children = children
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

function toItems(
    version: ApiVersion,
    requestInformation: RequestInformation,
    time: Time
): JutgeApiTreeItem[] {
    return [
        new JutgeApiTreeItem("Version", undefined, [
            new JutgeApiTreeItem("Version", version.version),
            new JutgeApiTreeItem("Mode", version.mode),
            new JutgeApiTreeItem("Git hash", version.gitHash),
            new JutgeApiTreeItem("Git branch", version.gitBranch),
            new JutgeApiTreeItem("Git date", version.gitDate),
        ]),
        new JutgeApiTreeItem("Request", undefined, [
            new JutgeApiTreeItem("URL", requestInformation.url),
            new JutgeApiTreeItem("IP", requestInformation.ip),
            new JutgeApiTreeItem("Domain", requestInformation.domain),
        ]),
        new JutgeApiTreeItem("Time", undefined, [
            new JutgeApiTreeItem("Full time", time.full_time),
            new JutgeApiTreeItem("Timestamp (int)", String(time.int_timestamp)),
            new JutgeApiTreeItem("Timestamp (float)", String(time.float_timestamp)),
            new JutgeApiTreeItem("Time", time.time),
            new JutgeApiTreeItem("Date", time.date),
        ]),
    ]
}

export class JutgeApiTreeProvider implements vscode.TreeDataProvider<JutgeApiTreeItem> {
    private readonly _onDidChangeTreeData = new vscode.EventEmitter<
        JutgeApiTreeItem | undefined
    >()
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event

    private rootItems: JutgeApiTreeItem[] = [new JutgeApiTreeItem("Loading API information...")]

    constructor() {
        void this.refresh()
    }

    async refresh(): Promise<void> {
        this.rootItems = [new JutgeApiTreeItem("Loading API information...")]
        this._onDidChangeTreeData.fire(undefined)

        try {
            const [version, requestInformation, time] = await Promise.all([
                withTimeout(
                    jutgeClient.misc.getApiVersion(),
                    API_REQUEST_TIMEOUT_MS,
                    "Timed out while fetching API version."
                ),
                withTimeout(
                    jutgeClient.misc.getRequestInformation(),
                    API_REQUEST_TIMEOUT_MS,
                    "Timed out while fetching request information."
                ),
                withTimeout(
                    jutgeClient.misc.getTime(),
                    API_REQUEST_TIMEOUT_MS,
                    "Timed out while fetching time information."
                ),
            ])
            this.rootItems = toItems(version, requestInformation, time)
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error)
            this.rootItems = [new JutgeApiTreeItem("Could not load API information", message)]
        }

        this._onDidChangeTreeData.fire(undefined)
    }

    getTreeItem(element: JutgeApiTreeItem): vscode.TreeItem {
        return element
    }

    getChildren(element?: JutgeApiTreeItem): Thenable<JutgeApiTreeItem[]> {
        return Promise.resolve(element ? element.children : this.rootItems)
    }
}
