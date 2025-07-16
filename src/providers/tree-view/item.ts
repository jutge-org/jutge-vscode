import * as vscode from "vscode"
import { CourseTreeElement, TreeItemCollapseState } from "./element"
import { join } from "path"
import { IconStatus } from "@/types"

const stateToTreeState_: Record<TreeItemCollapseState, vscode.TreeItemCollapsibleState> =
    {
        collapsed: vscode.TreeItemCollapsibleState.Collapsed,
        expanded: vscode.TreeItemCollapsibleState.Expanded,
        none: vscode.TreeItemCollapsibleState.None,
    }

export class CourseTreeItem extends vscode.TreeItem {
    element: CourseTreeElement

    parentPrefix(): string {
        let prefix = ``
        let { parent: elem } = this.element
        while (elem) {
            prefix = `${elem.key}:${prefix}`
            elem = elem.parent
        }
        return prefix
    }

    getId(): string {
        const { type, key } = this.element
        return `${this.parentPrefix()}:${type}:${key}`
    }

    constructor(element: CourseTreeElement) {
        super(element.label, stateToTreeState_[element.state])
        this.element = element
        this.id = this.getId()
    }
}
