import * as vscode from "vscode"

export class JutgeTreeItem extends vscode.TreeItem {
    // API-related ID for the tree item (courseKey, listKey, or problemNm).
    public itemKey: string
    public contextValue: string

    constructor(label: string, state: "collapsed" | "expanded" | "none", itemKey: string, contextValue: string) {
        super(
            label,
            {
                collapsed: vscode.TreeItemCollapsibleState.Collapsed,
                expanded: vscode.TreeItemCollapsibleState.Expanded,
                none: vscode.TreeItemCollapsibleState.None,
            }[state]
        )
        this.itemKey = itemKey
        this.contextValue = contextValue
    }
}
