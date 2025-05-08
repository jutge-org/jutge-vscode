import * as vscode from "vscode"
import fs from "fs"

import { Problem } from "@/utils/types"
import { getDefaultExtensionFromLangId, Proglang } from "@/runners/language/languages"
import { JutgeService } from "./jutge"

function sanitizeProblemTitle(title: string): string {
    title = title.replace(/ /g, "_") // Replace spaces with underscores
    title = title.replace(/[^a-zA-Z0-9_]/g, "") // Remove other special characters except underscores
    return title
}

export class FileService {
    private static async chooseFileLangFromQuickPick(problemNm: string): Promise<Proglang | undefined> {
        const fileType = await vscode.window.showQuickPick(
            Object.values(Proglang).map((lang) => ({
                label: `${lang} File`,
                description: lang,
            })),
            {
                placeHolder: "Select file type",
                title: `New file for ${problemNm}`,
            }
        )
        return fileType?.description
    }

    public static async createNewFileForProblem(problem: Problem): Promise<vscode.Uri | undefined> {
        const fileLang = await FileService.chooseFileLangFromQuickPick(problem.problem_nm)
        if (!fileLang) {
            return
        }

        const fileExtension = getDefaultExtensionFromLangId(fileLang)
        const sanitizedTitle = sanitizeProblemTitle(problem.title)
        const suggestedFileName = `${problem.problem_id}_${sanitizedTitle}.${fileExtension}`
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0]
        if (!workspaceFolder) {
            vscode.window.showErrorMessage("No workspace folder open.")
            return
        }

        const uri = await vscode.window.showSaveDialog({
            defaultUri: vscode.Uri.joinPath(workspaceFolder.uri, suggestedFileName),
            filters: {
                "All files": ["*"],
            },
            saveLabel: "Create",
            title: `Create new file for ${problem.title}`,
        })
        if (!uri) {
            return
        }

        // TODO: If extension is changed by user in the save dialog, update fileLang?
        const langComment = {
            [Proglang.CPP]: "//",
            [Proglang.PYTHON]: "#",
        }[fileLang]

        const profileRes = JutgeService.getProfileSWR()
        const profile = profileRes.data

        const fileHeader = [
            `${langComment} ${problem.problem_id}\n`,
            `${langComment} ${problem.title}\n`,
            `${langComment} https://jutge.org/problems/${problem.problem_id}\n`,
            `${langComment} Created on ${new Date().toLocaleString()} ${profile ? `by ${profile.name}` : ``}\n`,
            `\n`,
        ].join("")

        let body = ""
        if (fileLang === Proglang.CPP) {
            body = `#include <iostream>\nusing namespace std;\n\nint main() {\n\n}\n`
        }

        try {
            fs.writeFileSync(uri.fsPath, fileHeader + body, { flag: "w" })
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to create file in ${uri.fsPath} `)
            throw error
        }
        return uri
    }

    public static async showFileInColumn(
        uri: vscode.Uri,
        column: vscode.ViewColumn | undefined
    ): Promise<vscode.TextEditor | undefined> {
        const document = await vscode.workspace.openTextDocument(uri)
        return vscode.window.showTextDocument(document, column)
    }
}
