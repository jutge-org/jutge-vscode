import * as vscode from "vscode"

import { jutgeClient } from "@/services/jutge"

export const examPropertiesTreeViewType = "jutge-exam-properties"

const EXAM_PROPERTIES_TIMEOUT_MS = 12000

type JsonLike = null | boolean | number | string | JsonLike[] | { [key: string]: JsonLike }

class ExamPropertyTreeItem extends vscode.TreeItem {
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
        this.contextValue = hasChildren ? "exam-property-node" : "exam-property-leaf"
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

export class ExamPropertiesTreeProvider implements vscode.TreeDataProvider<ExamPropertyTreeItem> {
    private readonly _onDidChangeTreeData = new vscode.EventEmitter<
        ExamPropertyTreeItem | undefined
    >()
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event

    private rootValue: JsonLike = null
    private rootItems: ExamPropertyTreeItem[] = [
        new ExamPropertyTreeItem("Loading...", "", "$"),
    ]

    constructor() {
        void this.refresh()
    }

    async refresh(): Promise<void> {
        this.rootItems = [new ExamPropertyTreeItem("Loading exam properties...", "", "$")]
        this._onDidChangeTreeData.fire(undefined)

        try {
            const exam = await withTimeout(
                jutgeClient.student.exam.get(),
                EXAM_PROPERTIES_TIMEOUT_MS,
                "Timed out while fetching exam properties."
            )
            this.rootValue = exam as JsonLike
            this.rootItems = this.toRootItems_(this.rootValue)
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error)
            this.rootItems = [
                new ExamPropertyTreeItem("Could not load exam properties", message, "$"),
            ]
        }

        this._onDidChangeTreeData.fire(undefined)
    }

    getTreeItem(element: ExamPropertyTreeItem): vscode.TreeItem {
        return element
    }

    getChildren(element?: ExamPropertyTreeItem): Thenable<ExamPropertyTreeItem[]> {
        if (!element) {
            return Promise.resolve(this.rootItems)
        }
        return Promise.resolve(this.toChildren_(element))
    }

    private toRootItems_(value: JsonLike): ExamPropertyTreeItem[] {
        if (Array.isArray(value)) {
            return value.map(
                (entry, index) => new ExamPropertyTreeItem(`[${index}]`, entry, `$[${index}]`)
            )
        }
        if (typeof value === "object" && value !== null) {
            return Object.entries(value).map(
                ([key, entry]) => new ExamPropertyTreeItem(key, entry, `$.${key}`)
            )
        }
        return [new ExamPropertyTreeItem("value", value, "$")]
    }

    private toChildren_(element: ExamPropertyTreeItem): ExamPropertyTreeItem[] {
        const value = element.value
        if (Array.isArray(value)) {
            return value.map(
                (entry, index) =>
                    new ExamPropertyTreeItem(
                        `[${index}]`,
                        entry,
                        `${element.fullPath}[${index}]`
                    )
            )
        }
        if (typeof value === "object" && value !== null) {
            return Object.entries(value).map(
                ([key, entry]) =>
                    new ExamPropertyTreeItem(key, entry, `${element.fullPath}.${key}`)
            )
        }
        return []
    }
}
