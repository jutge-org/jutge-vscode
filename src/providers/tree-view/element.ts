import * as vscode from "vscode"
import { CourseTreeItem } from "./item"
import { IconStatus } from "@/types"

export type TreeItemCollapseState = "collapsed" | "expanded" | "none"
export type CourseItemType = "course" | "exam" | "list" | "problem"

export class CourseTreeElement {
    public type: CourseItemType
    public key: string
    public label: string
    public iconStatus: IconStatus
    public state: TreeItemCollapseState

    public command: vscode.Command | null = null
    public parent: CourseTreeElement | null = null
    public children: CourseTreeElement[] | null = null

    constructor(
        type: CourseItemType,
        key: string,
        label: string,
        state: TreeItemCollapseState,
        iconStatus: IconStatus
    ) {
        this.type = type
        this.key = key
        this.label = label
        this.state = state
        this.iconStatus = iconStatus
    }
}
