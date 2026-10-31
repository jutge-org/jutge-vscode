/*

    JutgeService
    ------------

    This file abstracts the Jutge API so that we can apply the "stale while revalidate" 
    strategy, e.g. if we have a cached value, we can return it while we fetch the new 
    value in the background.

    This service has internal state that has to be stored and loaded on initialization,
    since we want to resume what the user was doing when he closed the window:
    - Was he signed out? -> "signed-out"
    - Was he signed in? -> "signed-in"
    - Was he in the exam password form? "pre-exam"
    - Was he in the exam already? "exam"


*/

import { isDevelopmentMode } from "@/extension"
import * as j from "@/jutge_api_client"
import { StaticLogger } from "@/loggers"
import deepEqual from "deep-equal"
import * as vscode from "vscode"

export const jutgeClient = new j.JutgeApiClient()
jutgeClient.userAgent = "jutge-vscode"

type SwrResult<T> = {
    data: T | undefined
    onUpdate: (data: T | null) => void
    // TODO: Put an onError and handle it!
}

export type ApiMode = "normal" | "exam" | "contest"
export type ExamMode = "exam" | "contest"

// Signed-in state:
// - Signed-out.
// - Signed-in in normal mode.
// - PreExam: Only step 1. you have signed in as a user, but haven't entered the exam password yet.
// - Exam: Step 1 and 2. You have signed in, and also entered the correct exam password.

export type SignedInState = "signed-out" | "signed-in" | "pre-exam" | "signed-in-exam"

export const stringToApiMode = (s: string): ApiMode => {
    if (s === "normal") {
        return "normal"
    } else if (s === "exam") {
        return "exam"
    } else if (s === "contest") {
        return "contest"
    }
    throw new Error("ApiMode should be 'normal', 'exam' or 'contest'!")
}

type SignInJutgeParams = {
    email: string
    password: string
}

type SignInPreExamParams = {
    email: string
    password: string
    mode: ExamMode
    useDevApi?: boolean
}

type EnterExamParams = {
    mode: ExamMode
    key: string
    password: string
}

type SignInResult = { ok: true } | { ok: false; error: string }

const KEY_SIGN_IN_EMAIL = "jutge-vscode.signIn.email"
const KEY_SIGN_IN_PASSWORD = "jutge-vscode.signIn.password"

type State = {
    auth: SignedInState
    userUid: string | undefined
    apiMode: ApiMode
    token: string | undefined
}

const initialState: State = {
    apiMode: "normal",
    auth: "signed-out",
    userUid: undefined,
    token: undefined,
}

const KEY_JUTGE_STATE = "jutge-vscode.state"

export class JutgeService extends StaticLogger {
    private static context_: vscode.ExtensionContext
    private static state_: State = initialState

    //
    //   API_MODES
    //   ---------
    //
    //   The API can be in 6 different modes, 3 x 2 for two dimensions:
    //   - API_MODE: normal, exam, contest (user environment).
    //   - MODE: development, production (development environment)
    //

    static URLTable: Record<"development" | "production", Record<ApiMode, string>> = {
        production: {
            normal: "https://api.jutge.org/api",
            exam: "https://exam.api.jutge.org/api",
            contest: "https://contest.api.jutge.org/api",
        },
        development: {
            normal: "https://dev.api.jutge.org/api",
            exam: "https://dev.exam.api.jutge.org/api",
            contest: "https://dev.contest.api.jutge.org/api",
        },
    }

    public static setAPIMode(strApiMode: string) {
        const devMode = isDevelopmentMode() ? "development" : "production"
        this.state_.apiMode = stringToApiMode(strApiMode)
        jutgeClient.JUTGE_API_URL = this.URLTable[devMode][this.state_.apiMode]
        console.log(`[Extension]: Setting JUTGE_API_URL to '${jutgeClient.JUTGE_API_URL}'`)
    }

    public static async invalidateToken() {
        this.state_.token = undefined
        await this.saveState()
        jutgeClient.meta = { token: "<invalidated!> ;P", user_uid: "" }
        this.log.info(`Invalidated tokens.`)
    }

    static isMode(apiMode: ApiMode) {
        return this.state_.apiMode === apiMode
    }

    static getApiMode(): ApiMode {
        return this.state_.apiMode
    }

    /**
     * Probe a token against the given API host by calling `student.profile.get()`.
     * The URL and `meta` are swapped temporarily and restored on the way out.
     */
    private static async isTokenValidOnHost(
        token: string,
        api_mode: ApiMode
    ): Promise<boolean> {
        const originalMeta = jutgeClient.meta
        const originalUrl = jutgeClient.JUTGE_API_URL
        try {
            this.setAPIMode(api_mode)
            jutgeClient.meta = { token, user_uid: originalMeta?.user_uid ?? "" }
            await jutgeClient.student.profile.get()
            return true
        } catch (error) {
            this.log.info(`Token validation failed (${jutgeClient.JUTGE_API_URL}): ${error}`)
            return false
        } finally {
            jutgeClient.meta = originalMeta
            jutgeClient.JUTGE_API_URL = originalUrl
        }
    }

    // Initialization

    public static async initialize(context: vscode.ExtensionContext): Promise<void> {
        this.log.info("Initializing...")
        this.context_ = context

        // Determine which API we should be using (depending on the hosts available)

        this.state_.apiMode = "normal"
        this.log.info("Initialization complete")
    }

    // State

    static isState(state: SignedInState) {
        return this.state_.auth === state
    }

    public static loadState() {
        const json = this.context_.globalState.get<string>(KEY_JUTGE_STATE)
        let state = initialState
        if (json) {
            state = JSON.parse(json)
        }
        this.state_ = state
    }

    public static async saveState() {
        const json = JSON.stringify(this.state_)
        await this.context_.globalState.update(KEY_JUTGE_STATE, json)
    }

    static isSignedInExamOrContest() {
        return (this.isMode("exam") || this.isMode("contest")) && this.isState("signed-in-exam")
    }

    // Sign-in Email

    public static async getStoredSignInEmail(): Promise<string | undefined> {
        /** Last successful sign-in email (SecretStorage). Migrates legacy globalState `email` on first read. */
        const fromSecret = await this.context_.secrets.get(KEY_SIGN_IN_EMAIL)
        if (fromSecret !== undefined && fromSecret !== "") {
            return fromSecret
        }
        const legacy = this.context_.globalState.get<string>("email")
        if (legacy) {
            await this.context_.secrets.store(KEY_SIGN_IN_EMAIL, legacy)
            await this.context_.globalState.update("email", undefined)
            return legacy
        }
        return undefined
    }

    public static async getStoredSignInPassword(): Promise<string | undefined> {
        const v = await this.context_.secrets.get(KEY_SIGN_IN_PASSWORD)
        return v === "" ? undefined : v
    }

    public static async storeSignInCredentials(email: string, password: string): Promise<void> {
        await this.context_.secrets.store(KEY_SIGN_IN_EMAIL, email)
        await this.context_.secrets.store(KEY_SIGN_IN_PASSWORD, password)
        await this.context_.globalState.update("email", undefined)
    }

    // Context Keys

    private static async setContextKey(key: string, value: boolean): Promise<void> {
        await vscode.commands.executeCommand("setContext", `jutge-vscode.${key}`, value)
    }

    private static async setAllContextKeys(opts: {
        courses: boolean
        exam: boolean
        preExam: boolean
        contestMode: boolean
    }): Promise<void> {
        await Promise.all([
            this.setContextKey("isSignedIn.Courses", opts.courses),
            this.setContextKey("isSignedIn.Exam", opts.exam),
            this.setContextKey("isSignedIn.PreExam", opts.preExam),
            this.setContextKey("isContestMode", opts.contestMode),
        ])
    }

    // State Transitions

    private static async setSignedIn(token: string, user_uid: string) {
        this.setAPIMode("normal")
        this.state_ = {
            apiMode: "normal",
            auth: "signed-in",
            token,
            userUid: user_uid,
        }
        await this.saveState()
        await this.setAllContextKeys({
            courses: true,
            exam: false,
            preExam: false,
            contestMode: false,
        })
        jutgeClient.meta = { token, user_uid }
        this.log.info(`Signed in (normal).`)
    }

    static async setPreExam(mode: ExamMode) {
        this.setAPIMode(mode)
        this.state_ = {
            apiMode: mode,
            auth: "pre-exam",
            token: undefined,
            userUid: undefined,
        }
        await this.saveState()

        await this.setAllContextKeys({
            courses: false,
            exam: false,
            preExam: true,
            contestMode: mode === "contest",
        })
        jutgeClient.meta = null
        this.log.info(`Signed in pre-exam (${mode}).`)
    }

    static async setSignedInExam(token: string, userUid: string, apiMode: ExamMode = "exam") {
        this.setAPIMode(apiMode)
        this.state_ = { apiMode, auth: "signed-in-exam", token, userUid }
        await this.saveState()

        // Once we're in the exam, the pre-exam state is no longer needed.
        await this.setAllContextKeys({
            courses: false,
            exam: true,
            preExam: false,
            contestMode: apiMode === "contest",
        })

        jutgeClient.meta = { token, user_uid: userUid }
        this.log.info(`Signed in to ${apiMode}.`)
    }

    static async setSignedOut() {
        try {
            await jutgeClient.logout()
        } catch (e) {
            if (e instanceof j.UnauthorizedError) {
                this.log.info(`Token probably expired.`)
            }
        }
        const { apiMode } = this.state_
        this.state_ = { ...initialState, apiMode }
        await this.saveState()

        await this.setAllContextKeys({
            courses: false,
            exam: false,
            preExam: false,
            contestMode: false,
        })

        this.log.info(`Signed out.`)
    }

    // State change actions

    public static async signIn({ email, password }: SignInJutgeParams): Promise<SignInResult> {
        const trimmedEmail = email.trim()
        if (!trimmedEmail) {
            return { ok: false, error: "Please enter your email." }
        }
        if (!password) {
            return { ok: false, error: "Please enter your password." }
        }
        this.setAPIMode("normal")
        try {
            const credentials = await jutgeClient.login({ email: trimmedEmail, password })
            await this.setSignedIn(credentials.token, credentials.user_uid)
            await this.storeSignInCredentials(trimmedEmail, password)
            await vscode.commands.executeCommand("jutge-vscode.refreshCoursesTree")
            await vscode.commands.executeCommand("jutge-vscode.refreshProfileTree")
            this.getProfileSWR()
            return { ok: true }
        } catch (err) {
            return { ok: false, error: this.normalizeError(err) }
        }
    }

    /**
     * Step 1 of the exam/contest sign-in: validate the user's credentials and
     * make sure the exam/contest ready list can be obtained.
     *
     * This intentionally uses `auth.getReadyExams`, which is available on the
     * exam/contest hosts and only needs the credentials (no token). In
     * particular, it never contacts `api.jutge.org`: inside a firewalled exam
     * network that host is unreachable, and only the exam/contest API is
     * allowed.
     *
     * Step 2 (`enterExam`) then calls `auth.loginExam` on the same host.
     */
    public static async enterPreExam({
        email,
        password,
        mode,
    }: SignInPreExamParams): Promise<SignInResult> {
        const trimmedEmail = email.trim()
        if (!trimmedEmail) {
            return { ok: false, error: "Please enter your email." }
        }
        if (!password) {
            return { ok: false, error: "Please enter your password." }
        }
        const originalMode = this.state_.apiMode
        this.setAPIMode(mode)
        try {
            await jutgeClient.auth.getReadyExams({
                email: trimmedEmail,
                password,
            })
            await this.storeSignInCredentials(trimmedEmail, password)
            await this.setPreExam(mode)
            return { ok: true }
        } catch (err) {
            // Keep the mode the user selected in the sign-in view, so the
            // next attempt (and the rest of the extension) stays on that host.
            this.setAPIMode(originalMode)
            return { ok: false, error: this.normalizeError(err) }
        }
    }

    /**
     * Step 2 of the exam/contest sign-in: actually enter the chosen exam,
     * using the email/password we stored during step 1. On success, the
     * pre-exam state is discarded and the exam token is what we'll use
     * from then on.
     */
    public static async signInExamOrContest({
        mode,
        key: key,
        password: examPassword,
    }: EnterExamParams): Promise<SignInResult> {
        const trimmedKey = key.trim()
        if (!trimmedKey) {
            return {
                ok: false,
                error: `Please select ${mode === "contest" ? "a contest" : "an exam"}.`,
            }
        }
        if (!examPassword) {
            return {
                ok: false,
                error: `Please enter the ${mode === "contest" ? "contest" : "exam"} password.`,
            }
        }

        const storedEmail = await this.getStoredSignInEmail()
        const storedUserPassword = await this.getStoredSignInPassword()
        if (!storedEmail || !storedUserPassword) {
            return {
                ok: false,
                error: "Your sign-in credentials were lost. Please sign in again.",
            }
        }

        this.setAPIMode(mode)
        try {
            const credentials = await jutgeClient.loginExam({
                email: storedEmail,
                password: storedUserPassword,
                exam: trimmedKey,
                exam_password: examPassword,
            })
            await this.setSignedInExam(credentials.token, mode)
            await vscode.commands.executeCommand("jutge-vscode.refreshExamsTree")
            await vscode.commands.executeCommand("jutge-vscode.refreshExamDocumentsTree")

            if (mode === "contest") {
                await vscode.commands.executeCommand("jutge-vscode.refreshRankingTree")
            }

            return { ok: true }
        } catch (err) {
            return { ok: false, error: this.normalizeError(err) }
        }
    }

    private static normalizeError(err: unknown): string {
        let message = String(err)
        if (err instanceof Error) {
            message = err.message
            if (err.cause instanceof Error) {
                message = err.cause.message
            }
        }
        if (!message || message.trim().length === 0 || message === "[object Object]") {
            message = "Invalid credentials."
        }
        this.log.error(`Error signing in:`, message, err)
        return message
    }

    /* ---------- Ready exams ---------- */

    /**
     * List the exams (or contests) the user is allowed to enter.
     *
     * During the pre-exam stage there is no token yet, so this uses
     * `auth.getReadyExams` with the stored credentials. That endpoint lives on
     * the exam/contest hosts, which means this call stays inside the exam
     * network and never needs `api.jutge.org`.
     */
    static async getReadyExamsForMode(mode: ExamMode): Promise<string[] | undefined> {
        const originalMode = this.state_.apiMode
        try {
            const email = await this.getStoredSignInEmail()
            const password = await this.getStoredSignInPassword()
            if (!email || !password) {
                return
            }
            this.setAPIMode(mode)
            const exams = await jutgeClient.auth.getReadyExams({ email, password })
            return exams.map((e) => e.exam_key)
        } catch (error) {
            this.log.error(`Could not get exams: ${error}`)
            return
        } finally {
            this.setAPIMode(originalMode)
        }
    }

    /* ---------- Resume from storage on activation ---------- */

    public static async resumeFromStorage(): Promise<void> {
        this.loadState()

        const { apiMode, token, userUid } = this.state_
        switch (apiMode) {
            case "exam":
            case "contest": {
                const examMode: ExamMode = this.isMode("contest") ? "contest" : "exam"
                if (!token) {
                    this.log.info(`Could not resume from ${examMode} mode: no token`)
                } else if (await this.isTokenValidOnHost(token, examMode)) {
                    this.log.info(`Resuming from exam token (${examMode}).`)
                    await this.setSignedInExam(token, examMode)
                    await vscode.commands.executeCommand("jutge-vscode.refreshExamsTree")
                    await vscode.commands.executeCommand(
                        "jutge-vscode.refreshExamDocumentsTree"
                    )
                } else {
                    this.log.info(`Could not resume in ${examMode} mode: invalid token`)
                }
                break
            }
            case "normal": {
                if (!token) {
                    this.log.debug("Could not resume from normal mode: no token")
                } else if (await this.isTokenValidOnHost(token, "normal")) {
                    this.log.info(`Resuming from normal token.`)
                    await this.setSignedIn(token, userUid ?? "")
                } else {
                    this.log.info(`Could not resume in normal mode: invalid token`)
                }
                break
            }
        }
    }

    /* ---------- Sign-out actions ---------- */

    /**
     * Leave the SIGNED_IN_NO_EXAM state (pre-exam) without confirmation. Used
     * when the user clicks "Cancel" / "Sign out" in the exam-selection step.
     */
    public static async signOutPreExam(): Promise<void> {
        await this.setSignedOut()
    }

    public static async confirmSignOut() {
        let dialogText = {
            placeHolder: `Please confirm that you want to sign out`,
            no: `No, keep signed in.`,
            yes: `Yes, sign out.`,
        }
        if (this.isMode("exam") || this.isMode("contest")) {
            dialogText = {
                placeHolder: `Please confirm that you want to finish the exam`,
                no: `No, keep doing the exam.`,
                yes: `Yes, finish the exam.`,
            }
        }
        const confirmation = await vscode.window.showQuickPick(
            [dialogText.no, dialogText.yes],
            {
                title: "Confirmation",
                placeHolder: dialogText.placeHolder,
            }
        )
        return confirmation === dialogText.yes
    }

    public static async signOut(options?: {
        askConfirmation: boolean
        message: string
    }): Promise<void> {
        try {
            const askConfirmation = options?.askConfirmation ?? false
            if (askConfirmation && !(await this.confirmSignOut())) {
                return
            }
            await this.saveState()
            await this.setSignedOut()

            vscode.commands.executeCommand("jutge-vscode.refreshCoursesTree")
            if (typeof options?.message === "string" && options.message.trim().length > 0) {
                vscode.window.showInformationMessage(`Jutge.org: ${options.message}`)
            }
        } catch (e) {
            console.error(e)
            this.log.info(`Error signing out: ${e}`)
        }
    }

    public static async signOutExam(options?: {
        askConfirmation: boolean
        message: string
    }): Promise<void> {
        try {
            const askConfirmation = options?.askConfirmation ?? true
            if (askConfirmation && !(await this.confirmSignOut())) {
                return
            }
            await this.saveState()
            await this.setSignedOut()

            vscode.commands.executeCommand("jutge-vscode.refreshExamsTree")
            const message = options?.message || "You have signed out"
            vscode.window.showInformationMessage(`Jutge.org: ${message}`)
        } catch (e) {
            console.error(e)
        }
    }

    // ---

    //
    // NOTE(pauek): We use a common pattern to speed up content loading: "Stale While Revalidate".
    // This means that we will get the cached version of any content and return it right away,
    // while revalidating if the content is new in the background. If the content is new, we
    // refresh it on screen (and save the new version), otherwise we do nothing. This helps a lot
    // in keeping the extension responsive for content that has already been downloaded recently
    // and at the same time keeping up with changes.
    //
    private static SWR<T>(funcCallId: string, getData: () => Promise<T>): SwrResult<T> {
        const dbkey = `this.${funcCallId}`

        const result: SwrResult<T> = {
            data: undefined,
            onUpdate: (_) => {
                // <- should be replaced later by the caller
                this.log.warn(`onUpdate not replaced by the caller (${funcCallId})`)
            },
        }

        const _revalidate = async () => {
            this.log.info(`Revalidating '${funcCallId}'...`)
            try {
                const newData: T = await getData()
                // Don't call update or save if data is identical
                if (!deepEqual(result.data, newData)) {
                    this.log.info(`Revalidated '${funcCallId}': update!`)
                    this.context_.globalState.update(dbkey, newData)
                    result.onUpdate(newData)
                } else {
                    this.log.info(`Revalidated '${funcCallId}': no changes.`)
                }
            } catch (e) {
                if (e instanceof j.UnauthorizedError) {
                    this.log.info(`Token might have expired (UnauthorizedError). Signing out.`)
                    this.signOut({
                        askConfirmation: false,
                        message: "Token has expired",
                    })
                } else {
                    this.log.info(`Error getting data: ${e}`)
                }
                result.onUpdate(null)
            }
        }

        _revalidate() // launch revalidation

        // But return what we have in cache
        result.data = this.context_.globalState.get<T>(dbkey)
        return result
    }

    private static async promisify<T>(swrFunc: () => SwrResult<T>): Promise<T> {
        return new Promise((resolve, reject) => {
            try {
                const res = swrFunc()
                if (res.data !== undefined) {
                    resolve(res.data)
                } else {
                    res.onUpdate = (data) => {
                        if (data === null) {
                            reject(`Could not load data`)
                        } else {
                            resolve(data)
                        }
                    }
                }
            } catch (e) {
                reject(e)
            }
        })
    }

    static getExamSWR() {
        return this.SWR<j.RunningExam>("getExam", async () => jutgeClient.student.exam.get())
    }

    static getCoursesSWR() {
        return this.SWR<Record<string, j.BriefCourse>>("getCourses", async () =>
            jutgeClient.student.courses.indexEnrolled()
        )
    }

    static getCourseSWR(courseKey: string) {
        return this.SWR<{ course: j.Course; lists: j.BriefList[] }>(
            `getCourse(${courseKey})`,
            async () => {
                const [courseRes, listsRes] = await Promise.allSettled([
                    jutgeClient.student.courses.getEnrolled(courseKey),
                    jutgeClient.student.lists.getAll(),
                ])
                if (courseRes.status === "rejected" || listsRes.status === "rejected") {
                    this.log.error(`getCourse: Could not load course or all lists`)
                    throw new Error(
                        `[JutgeService] getCourse: Could not load course or all lists`
                    )
                }
                const course = courseRes.value
                const allLists = listsRes.value
                return {
                    course,
                    lists: course.lists.map((key) => allLists[key]),
                }
            }
        )
    }

    static getAllListsSWR() {
        return this.SWR<Record<string, j.BriefList>>(`getAllLists()`, async () =>
            jutgeClient.student.lists.getAll()
        )
    }

    static async problemExists(problemNm: string) {
        const result = await jutgeClient.problems.getAbstractProblems(problemNm)
        return result[problemNm] !== undefined
    }

    static getAbstractProblemsSWR(problem_nms: string[]) {
        return this.SWR<j.AbstractProblem[]>(
            `getAbstractProblems(${problem_nms.join(`,`)})`,
            async () => {
                const abstractProblems = await jutgeClient.problems.getAbstractProblems(
                    problem_nms.join(",")
                )

                // IMPORTANT: In exams, the problems need to be in the _same_ order
                // in which the original array `problem_nms` was, so we should sort
                // the result to match that order!

                const result: j.AbstractProblem[] = []
                for (const problem_nm of problem_nms) {
                    const abstractProblem = abstractProblems[problem_nm]
                    if (!abstractProblem) {
                        this.log.error(
                            `INTERNAL ERROR: Problem ${problem_nm} not found in results!`
                        )
                    }
                    result.push(abstractProblem)
                }
                return result
            }
        )
    }

    static getAbstractProblemsInListSWR(listKey: string) {
        return this.SWR<(j.AbstractProblem | string)[]>(
            `getAbstractProblemsInList(${listKey})`,
            async () => {
                const [resList, resAbsProblems] = await Promise.allSettled([
                    jutgeClient.student.lists.get(listKey),
                    jutgeClient.problems.getAbstractProblemsInList(listKey),
                ])
                if (resAbsProblems.status === "rejected" || resList.status === "rejected") {
                    throw new Error(
                        `[JutgeService] getAbstractProblemsInListSWR: Failed to load abs. problems or list`
                    )
                }
                const problems = resAbsProblems.value
                const listItems = resList.value.items

                // Put abstract problems in the order in which they appear in the list
                const result: (j.AbstractProblem | string)[] = []
                for (const { problem_nm, description } of listItems) {
                    if (problem_nm === null && description !== null) {
                        result.push(description) // a separator
                    } else if (problem_nm !== null && problem_nm in problems) {
                        result.push(problems[problem_nm]) // a problem
                    }
                }

                return result
            }
        )
    }

    static getAllStatusesSWR() {
        return this.SWR<Record<string, j.AbstractStatus>>(`getAllStatuses()`, async () =>
            jutgeClient.student.statuses.getAll()
        )
    }

    static getAllSubmissionsSWR() {
        return this.SWR<j.Submission[]>(`getAllSubmissions()`, async () =>
            jutgeClient.student.submissions.getAll()
        )
    }

    static getTemplateListSWR(problem_id: string) {
        return this.SWR<string[]>(`getTemplates(${problem_id})`, async () =>
            jutgeClient.problems.getTemplates(problem_id)
        )
    }
    static getTemplateList(problem_id: string) {
        return this.promisify(() => this.getTemplateListSWR(problem_id))
    }

    static getTemplate(problem_id: string, template: string) {
        return jutgeClient.problems.getTemplate({ problem_id, template })
    }

    static getProfileSWR() {
        return this.SWR<j.Profile>(`getProfile`, async () => jutgeClient.student.profile.get())
    }

    static getAbstractProblemSWR(problemNm: string) {
        return this.SWR<j.AbstractProblem>(`getAbstractProblem(${problemNm})`, async () =>
            jutgeClient.problems.getAbstractProblem(problemNm)
        )
    }
    static async getAbstractProblem(problemNm: string): Promise<j.AbstractProblem> {
        return this.promisify(() => this.getAbstractProblemSWR(problemNm))
    }

    static getHtmlStatementSWR(problemId: string) {
        return this.SWR<string>(`getHtmlStatement(${problemId})`, async () =>
            jutgeClient.problems.getHtmlStatement(problemId)
        )
    }

    static async getHtmlStatement(problemId: string) {
        return this.promisify(() => this.getHtmlStatementSWR(problemId))
    }

    static getProblemSupplSWR(problemId: string) {
        return this.SWR<j.ProblemSuppl>(`getProblemSuppl(${problemId})`, async () =>
            jutgeClient.problems.getProblemSuppl(problemId)
        )
    }

    static getProblemSuppl(problemId: string) {
        return this.promisify(() => this.getProblemSupplSWR(problemId))
    }

    static getSampleTestcasesSWR(problemId: string) {
        return this.SWR<j.Testcase[]>(`getSampleTestcases(${problemId})`, async () =>
            jutgeClient.problems.getSampleTestcases(problemId)
        )
    }

    static async getSampleTestcases(problemId: string) {
        return this.promisify(() => this.getSampleTestcasesSWR(problemId))
    }

    static async submit(
        file: File,
        data: {
            problem_id: string
            compiler_id: string
            annotation: string
            extraSubmissionInfo: any
        }
    ): Promise<j.NewSubmissionOut> {
        try {
            const result = await jutgeClient.student.submissions.submitFull(data, [file])
            return result
        } catch (e) {
            if (e instanceof j.UnauthorizedError) {
                this.signOut({
                    askConfirmation: false,
                    message: "Token expired.",
                })
            }
            throw e
        }
    }

    static async getSubmission(data: {
        problem_id: string
        submission_id: string
    }): Promise<j.Submission> {
        return jutgeClient.student.submissions.get(data)
    }
    static async getSubmissionScoring(data: {
        problem_id: string
        submission_id: string
    }): Promise<j.Scoring> {
        return jutgeClient.student.submissions.getScoring(data)
    }
}
