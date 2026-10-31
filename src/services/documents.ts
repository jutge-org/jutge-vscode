import vscode from "vscode"
import os from "os"
import { StaticLogger } from "@/loggers"
import { jutgeClient, JutgeService } from "./jutge"
import path from "path"
import { randomDirName } from "@/utils"

export class DocumentService extends StaticLogger {
    static docsDirUri: vscode.Uri
    static documentMap: Map<string, vscode.Uri> = new Map()

    static async newTemporaryDir() {
        try {
            // TODO(pauek): Should we erase the old one if it exists?
            this.docsDirUri = vscode.Uri.file(
                path.join(os.tmpdir(), "jutge-vscode-documents", randomDirName(10))
            )
            await vscode.workspace.fs.createDirectory(this.docsDirUri)
            this.documentMap = new Map()
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err)
            vscode.window.showErrorMessage(
                `Could not create temporary directory for exam documents: ${message}`
            )
        }
    }

    //
    static async downloadAndSaveDocument_(documentNm: string): Promise<vscode.Uri | null> {
        return await vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: `Document`,
                cancellable: false,
            },
            async (progress) => {
                try {
                    // Try to find it in the map to avoid downloading it again
                    progress.report({ message: "search cached documents..." })
                    const existingUri = this.documentMap.get(documentNm)
                    if (existingUri !== undefined) {
                        return existingUri
                    }

                    // Not in the tmp dir, download it
                    progress.report({ message: "downloading..." })
                    const { data } = await jutgeClient.student.exam.getDocumentPdf(documentNm)
                    const fileName = documentNm.replace(/[^a-zA-Z0-9._-]/g, "_")
                    const fileUri = vscode.Uri.joinPath(this.docsDirUri, `${fileName}.pdf`)

                    // Save it
                    progress.report({ message: "saving..." })
                    await vscode.workspace.fs.writeFile(fileUri, data)

                    // Cache the Uri for later
                    this.documentMap.set(documentNm, fileUri) // Do not download again
                    progress.report({ message: "Done." })
                    return fileUri
                } catch (err) {
                    const msg = err instanceof Error ? err.message : String(err)
                    vscode.window.showErrorMessage(
                        `Could not save document ${documentNm}: ${msg}`
                    )
                    return null
                }
            }
        )
    }

    static hasPdfExtensionInstalled(): boolean {
        return vscode.extensions.all.some((extension) => {
            const contributes = extension.packageJSON?.contributes
            if (!contributes) {
                return false
            }

            // 1. Check for Custom Editors registered for *.pdf
            const customEditors = contributes.customEditors || []
            const hasCustomEditor = customEditors.some((editor: any) =>
                editor.selector?.some(
                    (sel: any) =>
                        typeof sel.filenamePattern === "string" &&
                        sel.filenamePattern.toLowerCase().includes(".pdf")
                )
            )

            if (hasCustomEditor) {
                return true
            }

            // 2. Check for Languages or File Associations mapped to pdf
            const languages = contributes.languages || []
            const hasLanguageAssociation = languages.some((lang: any) =>
                lang.extensions?.some((ext: string) => ext.toLowerCase() === ".pdf")
            )

            return hasLanguageAssociation
        })
    }

    static async openPdfDocument(pdfUri: vscode.Uri) {
        const canOpenInVSCode = this.hasPdfExtensionInstalled()

        if (canOpenInVSCode) {
            // Opens in a VS Code tab using the installed PDF extension
            await vscode.commands.executeCommand("vscode.open", pdfUri)
        } else {
            // Fallback: Opens the PDF in the OS default viewer (like double-clicking in file explorer)
            const opened = await vscode.env.openExternal(pdfUri)

            if (!opened) {
                vscode.window.showErrorMessage(`Failed to open PDF file: ${pdfUri.fsPath}`)
            }
        }
    }

    static get commandOpenExamDocument() {
        return DocumentService.commandOpenExamDocument_.bind(DocumentService)
    }

    static async commandOpenExamDocument_(
        documentNm: string | undefined,
        displayTitle?: string
    ) {
        // Check for errors
        if (!JutgeService.isSignedInExamOrContest()) {
            vscode.window.showErrorMessage("You need to be signed in to an exam or contest.")
            return
        }
        if (!documentNm) {
            vscode.window.showErrorMessage("Missing document name.")
            return
        }

        // Download, save the file, and open it.
        try {
            const docUri = await this.downloadAndSaveDocument_(documentNm)
            if (docUri !== null) {
                this.openPdfDocument(docUri)
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error)
            vscode.window.showErrorMessage(
                `Could not open document "${displayTitle || documentNm}": ${message}`
            )
        }
    }
}
