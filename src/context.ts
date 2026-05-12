import * as vscode from "vscode"

/// Keep a global copy of the context for the whole extension to use
/// (Could this be wrong? We assume that the context is the same object all the time)

let context_: vscode.ExtensionContext | undefined = undefined

export const setContext_ = (context: vscode.ExtensionContext) => {
    context_ = context
}

export const getContext = (): vscode.ExtensionContext => {
    if (!context_) {
        throw new Error(`Context is undefined!!!`)
    }
    return context_
}
