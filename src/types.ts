import { Testcase } from "@/jutge_api_client"

export enum LanguageCode {
    ca = "ca",
    es = "es",
    en = "en",
    fr = "fr",
    de = "de",
}

export enum TestcaseStatus {
    RUNNING = "running",
    PASSED = "passed",
    FAILED = "failed",
}

export enum IconStatus {
    ACCEPTED = "accepted",
    PRESENTATION_ERROR = "presentation_error",
    REJECTED = "rejected",
    NONE = "none",
}

export const status2IconStatus: Record<SubmissionStatus, IconStatus> = {
    AC: IconStatus.ACCEPTED,
    PE: IconStatus.PRESENTATION_ERROR,
    WA: IconStatus.REJECTED,
    IC: IconStatus.REJECTED,
    CE: IconStatus.REJECTED,
    EE: IconStatus.REJECTED,
    TLE: IconStatus.REJECTED,
    Pending: IconStatus.NONE,
}

export enum SubmissionStatus {
    AC = "AC",
    WA = "WA",
    IC = "IC",
    PE = "PE",
    CE = "CE",
    EE = "EE",
    TLE = "TLE",
    PENDING = "Pending",
}

export type ProblemHandler = {
    handler: string
    source_modifier: string
    compilers: string
}

export type Problem = {
    problem_id: string
    problem_nm: string
    title: string
    language_id: null | string
    statementHtml: string | null
    testcases: Testcase[] | null
    handler: ProblemHandler | null
}

export type InputExpected = {
    input: string
    expected: string
}

export type TestcaseRun = {
    status: TestcaseStatus
    output: string
}

export type VSCodeToWebviewMessage = {
    command: VSCodeToWebviewCommand
    data: any
}

export enum VSCodeToWebviewCommand {
    UPDATE_TESTCASE = "update-testcase",
    UPDATE_SUBMISSION_STATUS = "update-submission-status",
}

export type WebviewToVSCodeMessage = {
    command: WebviewToVSCodeCommand
    data: any
}

export enum WebviewToVSCodeCommand {
    NEW_FILE = "new-file",
    OPEN_FILE = "open-file",
    SUBMIT_TO_JUTGE = "submit-to-jutge",
    RUN_ALL_TESTCASES = "run-all-testcases",
    RUN_TESTCASE = "run-testcase",
    ADD_NEW_TESTCASE = "add-new-testcase",
    SHOW_DIFF = "show-diff",
}
