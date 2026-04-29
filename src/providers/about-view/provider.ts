import * as vscode from "vscode"

export const aboutTreeViewType = "jutge-about"

export class AboutTreeProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
    getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
        return element
    }

    getChildren(): Thenable<vscode.TreeItem[]> {
        return Promise.resolve([])
    }
}
