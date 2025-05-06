import { WebviewPanelRegistry } from "@/providers/problem/webview-panel-registry"
import { TreeViewProvider } from "@/providers/tree-view/provider"
import { AuthService } from "@/services/auth"
import * as vscode from "vscode"

export const commandRefreshTree = (treeProvider: TreeViewProvider) => () => {
    treeProvider.refresh()
}

export const commandShowProblem = (context: vscode.ExtensionContext) => async (problemNm: string | undefined) => {
    console.debug(`[commandShowProblem] Problem ${problemNm}`)
    if (!(await AuthService.isUserAuthenticated())) {
        vscode.window.showErrorMessage("You need to sign in to Jutge.org to use this feature.")
        return
    }

    // If the command is called from the command palette, ask for the problem number.
    if (!problemNm) {
        const inputProblemNm = await vscode.window.showInputBox({
            title: "Jutge Problem",
            placeHolder: "P12345",
            prompt: "Please write the problem number.",
            value: "",
        })
        if (!inputProblemNm) {
            return
        }
        problemNm = inputProblemNm
    }

    WebviewPanelRegistry.createOrShow(context.extensionUri, problemNm)
}
