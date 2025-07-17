import { getIconUri } from "@/extension"
import * as vscode from "vscode"
import { CourseTreeElement, TreeItemCollapseState } from "./element"

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
        if (element.command) {
            this.command = element.command
        }
        if (element.type === "problem") {
            const icon = element.iconStatus || "none"
            this.iconPath = {
                light: getIconUri("light", `${icon}.svg`),
                dark: getIconUri("dark", `${icon}.svg`),
            }
        }

        this.id = this.getId()
    }
}
