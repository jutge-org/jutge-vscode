import * as vscode from "vscode"

import { RunningExamDocument } from "@/jutge_api_client"
import { jutgeClient } from "@/services/jutge"

export const examDocumentsTreeViewType = "jutge-exam-documents"

const EXAM_DOCUMENTS_TIMEOUT_MS = 12000

class ExamDocumentTreeItem extends vscode.TreeItem {
    constructor(
        label: string,
        options?: {
            description?: string
            tooltip?: string
            documentNm?: string
        }
    ) {
        super(label, vscode.TreeItemCollapsibleState.None)
        this.description = options?.description
        this.tooltip = options?.tooltip
        if (options?.documentNm) {
            this.iconPath = new vscode.ThemeIcon("file-pdf")
            this.command = {
                command: "jutge-vscode.openExamDocument",
                title: "Open Exam Document",
                arguments: [options.documentNm, label],
            }
        }
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

function toDocumentItem(document: RunningExamDocument): ExamDocumentTreeItem {
    const tooltip = document.description?.trim()
        ? `${document.title}\n\n${document.description}`
        : document.title
    return new ExamDocumentTreeItem(document.title, {
        description: document.description || undefined,
        tooltip,
        documentNm: document.document_nm,
    })
}

export class ExamDocumentsTreeProvider implements vscode.TreeDataProvider<ExamDocumentTreeItem> {
    private readonly _onDidChangeTreeData = new vscode.EventEmitter<
        ExamDocumentTreeItem | undefined
    >()
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event

    private items: ExamDocumentTreeItem[] = [new ExamDocumentTreeItem("Loading documents...")]

    constructor() {
        void this.refresh()
    }

    async refresh(): Promise<void> {
        this.items = [new ExamDocumentTreeItem("Loading documents...")]
        this._onDidChangeTreeData.fire(undefined)

        try {
            const exam = await withTimeout(
                jutgeClient.student.exam.get(),
                EXAM_DOCUMENTS_TIMEOUT_MS,
                "Timed out while fetching exam documents."
            )
            const documents = exam.documents || []
            this.items =
                documents.length > 0
                    ? documents.map(toDocumentItem)
                    : [new ExamDocumentTreeItem("No documents")]
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error)
            this.items = [
                new ExamDocumentTreeItem("Could not load exam documents", {
                    description: message,
                }),
            ]
        }

        this._onDidChangeTreeData.fire(undefined)
    }

    getTreeItem(element: ExamDocumentTreeItem): vscode.TreeItem {
        return element
    }

    getChildren(): Thenable<ExamDocumentTreeItem[]> {
        return Promise.resolve(this.items)
    }
}
