import { getIconUri, globalStateGet } from "@/extension"
import * as vscode from "vscode"
import { ExamTreeElement } from "./element"

export class CourseTreeItem extends vscode.TreeItem {
    element: ExamTreeElement

    constructor(element: ExamTreeElement) {
        super(element.label)
        this.id = element.getId()
        this.element = element
        this.description = element.description
        this.collapsibleState = vscode.TreeItemCollapsibleState.None

        const icon = element.iconStatus || "none"
        this.iconPath = {
            light: getIconUri("light", `${icon}.svg`),
            dark: getIconUri("dark", `${icon}.svg`),
        }
        this.tooltip = element.key
    }
}
