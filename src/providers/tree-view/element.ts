import * as vscode from "vscode"
import { CourseTreeItem } from "./item"
import { IconStatus } from "@/types"

export type TreeItemCollapseState = "collapsed" | "expanded" | "none"
export type CourseItemType = "course" | "exam" | "list" | "problem"

export const ELEMENT_ID_SEPARATOR = "/"

export class CourseTreeElement {
    public type: CourseItemType
    public key: string
    public label: string
    public iconStatus: IconStatus

    public parent: CourseTreeElement | null = null
    public children: CourseTreeElement[] | null = null

    parentPrefix(): string {
        let prefix = ``
        let { parent: elem } = this
        while (elem) {
            prefix = prefix ? `${elem.key}${ELEMENT_ID_SEPARATOR}${prefix}` : elem.key
            elem = elem.parent
        }
        return prefix
    }

    getId(): string {
        const prefix = this.parentPrefix()
        return prefix
            ? `${this.parentPrefix()}${ELEMENT_ID_SEPARATOR}${this.key}`
            : this.key
    }

    constructor(
        type: CourseItemType,
        key: string,
        label: string,
        iconStatus: IconStatus
    ) {
        this.type = type
        this.key = key
        this.label = label
        this.iconStatus = iconStatus
    }
}
