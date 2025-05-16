import * as vscode from "vscode"

export interface LanguageRunner {
    run(codePath: string, input: string, document: vscode.TextDocument): string
}
