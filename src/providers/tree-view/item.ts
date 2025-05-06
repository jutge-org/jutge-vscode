import * as vscode from "vscode"

export class JutgeTreeItem extends vscode.TreeItem {
    // API-related ID for the tree item (courseKey, listKey, or problemNm).
    public itemKey?: string

    constructor(label: string, collapsibleState: vscode.TreeItemCollapsibleState) {
        super(label, collapsibleState)
    }
}
