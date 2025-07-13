import { WebviewPanelRegistry } from "@/providers/problem-webview/panel-registry"
import { CourseDataProvider } from "@/providers/tree-view/provider"
import { JutgeService } from "@/services/jutge"
import * as vscode from "vscode"

export const commandRefreshTree = (treeProvider: CourseDataProvider) => () => {
    treeProvider.refresh()
}

export const commandShowProblem = (context: vscode.ExtensionContext) => async (problemNm: string | undefined) => {
    console.debug(`[commandShowProblem] Problem ${problemNm}`)
    if (!(await JutgeService.isUserAuthenticated())) {
        vscode.window.showErrorMessage("You need to sign in to Jutge.org to use this feature.")
        return
    }

    // If the command is called from the command palette, ask for the problem number.
    if (problemNm === undefined) {
        let pNm = undefined
        if (vscode.window.activeTextEditor && vscode.window.activeTextEditor.document) {
            let filename = vscode.window.activeTextEditor.document.fileName.split("\\").pop()
            if (filename && /[P,X][0-9]+/i.test(filename)) {
                pNm = filename.slice(0, 6)
            }
        }

        problemNm = await vscode.window.showInputBox({
            title: "Jutge Problem ID",
            placeHolder: "P12345",
            prompt: "Please write the problem ID.",
            value: pNm || "",
        })
    }

    if (problemNm) {
        WebviewPanelRegistry.createOrShow(context, problemNm)
    }
}
