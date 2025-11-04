import * as vscode from "vscode"
import { CourseTreeItem } from "./item"
import { IconStatus, status2IconStatus, SubmissionStatus } from "@/types"

export type TreeItemCollapseState = "collapsed" | "expanded" | "none"
export type CourseItemType = "course" | "exam" | "list" | "problem" | "separator"

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
        return prefix ? `${this.parentPrefix()}${ELEMENT_ID_SEPARATOR}${this.key}` : this.key
    }

    updateIconStatus(status: SubmissionStatus) {
        // NOTE(pauek): Here we somewhat repliace the logic in the Jutge
        // where you determine the new status from the previous status.

        // If the old status was NONE, you just take the new status.
        // If the old status was REJECTED, you change it if you get AC.
        // If the old status was AC, it does not change.

        switch (this.iconStatus) {
            case IconStatus.NONE: {
                this.iconStatus = status2IconStatus[status]
                break
            }
            case IconStatus.REJECTED: {
                if (status === SubmissionStatus.PE) {
                    this.iconStatus = IconStatus.PRESENTATION_ERROR
                } else if (status === SubmissionStatus.AC) {
                    this.iconStatus = IconStatus.ACCEPTED
                }
                break
            }
            case IconStatus.PRESENTATION_ERROR: {
                if (status === SubmissionStatus.AC) {
                    this.iconStatus = IconStatus.ACCEPTED
                }
                break
            }
        }
    }

    constructor(type: CourseItemType, key: string, label: string, iconStatus: IconStatus) {
        this.type = type
        this.key = key
        this.label = label
        this.iconStatus = iconStatus
    }
}
