import { getIconUri, globalStateGet } from "@/extension"
import * as vscode from "vscode"
import { CourseItemType, CourseTreeElement, TreeItemCollapseState } from "./element"

const stateToTreeState_: Record<TreeItemCollapseState, vscode.TreeItemCollapsibleState> = {
    collapsed: vscode.TreeItemCollapsibleState.Collapsed,
    expanded: vscode.TreeItemCollapsibleState.Expanded,
    none: vscode.TreeItemCollapsibleState.None,
}

const defaultStateFor_: Record<CourseItemType, vscode.TreeItemCollapsibleState> = {
    course: vscode.TreeItemCollapsibleState.Collapsed,
    list: vscode.TreeItemCollapsibleState.Collapsed,
    problem: vscode.TreeItemCollapsibleState.None,
    separator: vscode.TreeItemCollapsibleState.None,
    exam: vscode.TreeItemCollapsibleState.Expanded,
}

export class CourseTreeItem extends vscode.TreeItem {
    element: CourseTreeElement

    constructor(element: CourseTreeElement) {
        super(element.label)
        this.id = element.getId()
        this.element = element

        const state = globalStateGet(`itemState:${this.id}`) as TreeItemCollapseState
        const defaultState = defaultStateFor_[this.element.type]
        this.collapsibleState = state ? stateToTreeState_[state] : defaultState

        if (element.type === "problem") {
            const icon = element.iconStatus || "none"
            this.iconPath = {
                light: getIconUri("light", `${icon}.svg`),
                dark: getIconUri("dark", `${icon}.svg`),
            }
            this.tooltip = element.key
        } else if (element.type === "separator") {
            this.label = "⬩"
            this.description = element.label
            this.tooltip = element.label
        }
    }
}
