import { WebviewPanelRegistry } from "@/providers/problem/webview-panel-registry"
import { TreeViewProvider } from "@/providers/tree-view/provider"
import { JutgeService } from "@/services/jutge"
import * as vscode from "vscode"

export const commandRefreshTree = (treeProvider: TreeViewProvider) => () => {
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
        problemNm = await vscode.window.showInputBox({
            title: "Jutge Problem ID",
            placeHolder: "P12345",
            prompt: "Please write the problem ID.",
            value: "",
        })
    }

    if (problemNm) {
        WebviewPanelRegistry.createOrShow(context, problemNm)
    }
}
