import { IconStatus, status2IconStatus, SubmissionStatus } from "@/types"

export class ExamTreeElement {
    public key: string
    public label: string
    public description: string
    public iconStatus: IconStatus
    public order: number = -1

    getId(): string {
        return this.key
    }

    updateIconStatus(status: SubmissionStatus) {
        // NOTE(pauek): Here we somewhat replace the logic in the Jutge
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

    constructor(key: string, label: string, iconStatus: IconStatus, description?: string) {
        this.key = key
        this.label = label
        this.iconStatus = iconStatus
        this.description = description || ""
    }
}
