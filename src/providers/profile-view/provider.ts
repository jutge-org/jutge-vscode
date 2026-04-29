import * as vscode from "vscode"

import { jutgeClient } from "@/services/jutge"

export const profileTreeViewType = "jutge-profile"

const PROFILE_TIMEOUT_MS = 12000

type JsonLike = null | boolean | number | string | JsonLike[] | { [key: string]: JsonLike }

class ProfilePropertyTreeItem extends vscode.TreeItem {
    constructor(
        public readonly keyLabel: string,
        public readonly value: JsonLike,
        public readonly fullPath: string
    ) {
        const hasChildren = typeof value === "object" && value !== null
        super(
            keyLabel,
            hasChildren
                ? vscode.TreeItemCollapsibleState.Collapsed
                : vscode.TreeItemCollapsibleState.None
        )
        this.contextValue = hasChildren ? "profile-property-node" : "profile-property-leaf"
        this.id = fullPath
        this.description = hasChildren ? undefined : this.toInlineValue_(value)
        this.tooltip = `${fullPath}: ${this.toInlineValue_(value)}`
    }

    private toInlineValue_(value: JsonLike): string {
        if (typeof value === "string") {
            return value
        }
        return JSON.stringify(value)
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

export class ProfileTreeProvider implements vscode.TreeDataProvider<ProfilePropertyTreeItem> {
    private readonly _onDidChangeTreeData = new vscode.EventEmitter<
        ProfilePropertyTreeItem | undefined
    >()
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event

    private rootValue: JsonLike = null
    private rootItems: ProfilePropertyTreeItem[] = [
        new ProfilePropertyTreeItem("Loading...", "", "$"),
    ]

    constructor() {
        void this.refresh()
    }

    async refresh(): Promise<void> {
        this.rootItems = [new ProfilePropertyTreeItem("Loading profile...", "", "$")]
        this._onDidChangeTreeData.fire(undefined)

        try {
            const profile = await withTimeout(
                jutgeClient.student.profile.get(),
                PROFILE_TIMEOUT_MS,
                "Timed out while fetching profile."
            )
            this.rootValue = profile as JsonLike
            this.rootItems = this.toRootItems_(this.rootValue)
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error)
            this.rootItems = [
                new ProfilePropertyTreeItem("Could not load profile", message, "$"),
            ]
        }

        this._onDidChangeTreeData.fire(undefined)
    }

    getTreeItem(element: ProfilePropertyTreeItem): vscode.TreeItem {
        return element
    }

    getChildren(element?: ProfilePropertyTreeItem): Thenable<ProfilePropertyTreeItem[]> {
        if (!element) {
            return Promise.resolve(this.rootItems)
        }
        return Promise.resolve(this.toChildren_(element))
    }

    private toRootItems_(value: JsonLike): ProfilePropertyTreeItem[] {
        if (Array.isArray(value)) {
            return value.map(
                (entry, index) =>
                    new ProfilePropertyTreeItem(`[${index}]`, entry, `$[${index}]`)
            )
        }
        if (typeof value === "object" && value !== null) {
            return Object.entries(value).map(
                ([key, entry]) => new ProfilePropertyTreeItem(key, entry, `$.${key}`)
            )
        }
        return [new ProfilePropertyTreeItem("value", value, "$")]
    }

    private toChildren_(element: ProfilePropertyTreeItem): ProfilePropertyTreeItem[] {
        const value = element.value
        if (Array.isArray(value)) {
            return value.map(
                (entry, index) =>
                    new ProfilePropertyTreeItem(
                        `[${index}]`,
                        entry,
                        `${element.fullPath}[${index}]`
                    )
            )
        }
        if (typeof value === "object" && value !== null) {
            return Object.entries(value).map(
                ([key, entry]) =>
                    new ProfilePropertyTreeItem(key, entry, `${element.fullPath}.${key}`)
            )
        }
        return []
    }
}
