import { WebviewPanelHandler } from "@/providers/web-view/panel-handler"
import { AuthService } from "@/services/auth"
import * as vscode from "vscode"

export const jutgeVSCodeShowProblemCommand =
    (context: vscode.ExtensionContext) => async (problemNm: string | undefined) => {
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

        WebviewPanelHandler.createOrShow(context.extensionUri, problemNm)
    }
