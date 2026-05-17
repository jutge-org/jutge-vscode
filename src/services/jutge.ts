/*
    This file abstracts the Jutge API so that we can apply the
    "stale while revalidate" strategy, e.g. if we have a cached
    value, we can return it while we fetch the new value in the
    background.
*/

import { setJutgeApiURL } from "@/extension"
import * as j from "@/jutge_api_client"
import { StaticLogger } from "@/loggers"
import deepEqual from "deep-equal"
import * as vscode from "vscode"

export const jutgeClient = new j.JutgeApiClient()
jutgeClient.useCache = false

type SwrResult<T> = {
    data: T | undefined
    onUpdate: (data: T | null) => void
    // TODO: Put an onError and handle it!
}

export type ApiMode = "normal" | "exam" | "contest"
export type ExamMode = "exam" | "contest"

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
    examKey: string
    examPassword: string
}

type SignInResult = { ok: true } | { ok: false; error: string }

const SECRET_SIGN_IN_EMAIL = "jutge-vscode.signIn.email"
const SECRET_SIGN_IN_PASSWORD = "jutge-vscode.signIn.password"

const KEY_JUTGE_TOKEN = "jutgeToken"
const KEY_PRE_EXAM_TOKEN = "jutgePreExamToken"
const KEY_EXAM_TOKEN = "jutgeExamToken"
const KEY_API_MODE = "jutgeApiMode"
const KEY_USE_DEV_API = "jutgeUseDevApi"

export class JutgeService extends StaticLogger {
    static context_: vscode.ExtensionContext
    static signedIn_: boolean = false
    static signedInPreExam_: boolean = false
    static apiMode_: ApiMode = "normal"
    static useDevApi_: boolean = false

    /* ---------- Context keys ---------- */

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

    /* ---------- Initialization ---------- */

    public static async initialize(context: vscode.ExtensionContext): Promise<void> {
        this.log.info("Initializing...")
        this.context_ = context
        const storedUseDevApi = context.globalState.get<boolean>(KEY_USE_DEV_API)
        if (typeof storedUseDevApi === "boolean") {
            this.useDevApi_ = storedUseDevApi
        }
        await this.resumeFromStorage()
        this.log.info("Initialization complete")
    }

    /* ---------- Predicates ---------- */

    static isSignedIn() {
        return this.signedIn_
    }

    static isSignedInExam() {
        return (
            this.signedIn_ &&
            !this.signedInPreExam_ &&
            (this.apiMode_ === "exam" || this.apiMode_ === "contest")
        )
    }

    static isSignedInPreExam() {
        return this.signedInPreExam_
    }

    static isExamMode() {
        return this.apiMode_ === "exam"
    }

    static isContestMode() {
        return this.apiMode_ === "contest"
    }

    static getApiMode(): ApiMode {
        return this.apiMode_
    }

    /* ---------- API mode ---------- */

    static setApiMode(mode: ApiMode, useDevApi: boolean = this.useDevApi_) {
        this.apiMode_ = mode
        this.useDevApi_ = useDevApi
        setJutgeApiURL({ mode, useDevApi })
        this.log.info(`API mode set to '${mode}' (dev=${useDevApi}).`)
    }

    private static normalizeMode(mode: string | undefined): ApiMode {
        if (mode === "exam" || mode === "contest" || mode === "normal") {
            return mode
        }
        if (mode === "jutge") {
            return "normal"
        }
        return "normal"
    }

    /* ---------- Storage (raw) ---------- */

    public static getToken() {
        return this.context_.globalState.get<string>(KEY_JUTGE_TOKEN)
    }
    public static async storeToken(token: string | undefined) {
        await this.context_.globalState.update(KEY_JUTGE_TOKEN, token)
    }

    public static getPreExamToken() {
        return this.context_.globalState.get<string>(KEY_PRE_EXAM_TOKEN)
    }
    public static async storePreExamToken(token: string | undefined) {
        await this.context_.globalState.update(KEY_PRE_EXAM_TOKEN, token)
    }

    public static getExamToken() {
        return this.context_.globalState.get<string>(KEY_EXAM_TOKEN)
    }
    public static async storeExamToken(examToken: string | undefined) {
        await this.context_.globalState.update(KEY_EXAM_TOKEN, examToken)
    }

    public static getStoredApiMode(): ApiMode {
        return this.normalizeMode(this.context_.globalState.get<string>(KEY_API_MODE))
    }
    public static async storeApiMode(mode: ApiMode) {
        await this.context_.globalState.update(KEY_API_MODE, mode)
    }

    public static async storeUseDevApi(useDevApi: boolean) {
        await this.context_.globalState.update(KEY_USE_DEV_API, useDevApi)
    }

    /** Last successful sign-in email (SecretStorage). Migrates legacy globalState `email` on first read. */
    public static async getStoredSignInEmail(): Promise<string | undefined> {
        const fromSecret = await this.context_.secrets.get(SECRET_SIGN_IN_EMAIL)
        if (fromSecret !== undefined && fromSecret !== "") {
            return fromSecret
        }
        const legacy = this.context_.globalState.get<string>("email")
        if (legacy) {
            await this.context_.secrets.store(SECRET_SIGN_IN_EMAIL, legacy)
            await this.context_.globalState.update("email", undefined)
            return legacy
        }
        return undefined
    }

    public static async getStoredSignInPassword(): Promise<string | undefined> {
        const v = await this.context_.secrets.get(SECRET_SIGN_IN_PASSWORD)
        return v === "" ? undefined : v
    }

    public static async storeSignInCredentials(email: string, password: string): Promise<void> {
        await this.context_.secrets.store(SECRET_SIGN_IN_EMAIL, email)
        await this.context_.secrets.store(SECRET_SIGN_IN_PASSWORD, password)
        await this.context_.globalState.update("email", undefined)
    }

    public static logStorageKeys() {
        const keys = this.context_.globalState.keys().join(", ")
        this.log.info(`Keys in storage: ${keys}`)
    }

    public static invalidateToken() {
        this.storeExamToken(undefined)
        this.storePreExamToken(undefined)
        this.storeToken(undefined)
        jutgeClient.meta = { token: "<invalidated!> XD" }
        this.log.info(`Invalidated tokens.`)
    }

    /* ---------- Token validation ---------- */

    /**
     * Probe a token against the given API host by calling `student.profile.get()`.
     * The URL and `meta` are swapped temporarily and restored on the way out.
     */
    private static async isTokenValidOnHost(
        token: string,
        mode: ApiMode,
        useDevApi: boolean
    ): Promise<boolean> {
        const originalMeta = jutgeClient.meta
        const originalUrl = jutgeClient.JUTGE_API_URL
        try {
            setJutgeApiURL({ mode, useDevApi })
            jutgeClient.meta = { token }
            await jutgeClient.student.profile.get()
            return true
        } catch (error) {
            this.log.info(`Token validation failed (mode=${mode}, dev=${useDevApi}): ${error}`)
            return false
        } finally {
            jutgeClient.meta = originalMeta
            jutgeClient.JUTGE_API_URL = originalUrl
        }
    }

    /* ---------- State transitions ---------- */

    private static async setSignedInJutge(token: string) {
        this.setApiMode("normal", this.useDevApi_)
        this.signedIn_ = true
        this.signedInPreExam_ = false
        await this.storeToken(token)
        await this.storeApiMode("normal")
        await this.setAllContextKeys({
            courses: true,
            exam: false,
            preExam: false,
            contestMode: false,
        })
        jutgeClient.meta = { token }
        this.log.info(`Signed in (normal).`)
    }

    static async setSignedInPreExam(token: string, mode: ExamMode) {
        this.setApiMode(mode, this.useDevApi_)
        this.signedIn_ = false
        this.signedInPreExam_ = true
        await this.storePreExamToken(token)
        await this.storeApiMode(mode)
        await this.setAllContextKeys({
            courses: false,
            exam: false,
            preExam: true,
            contestMode: mode === "contest",
        })
        jutgeClient.meta = { token }
        this.log.info(`Signed in pre-exam (${mode}).`)
    }

    static async setSignedInExam(examToken: string, mode: ExamMode = "exam") {
        this.setApiMode(mode, this.useDevApi_)
        this.signedIn_ = true
        this.signedInPreExam_ = false
        await this.storeExamToken(examToken)
        await this.storeApiMode(mode)
        // Once we're in the exam, the pre-exam token is no longer needed.
        await this.storePreExamToken(undefined)
        await this.setAllContextKeys({
            courses: false,
            exam: true,
            preExam: false,
            contestMode: mode === "contest",
        })
        jutgeClient.meta = { token: examToken }
        this.log.info(`Signed in to ${mode}.`)
    }

    static async setSignedOut() {
        try {
            await jutgeClient.logout()
        } catch (e) {
            if (e instanceof j.UnauthorizedError) {
                this.log.info(`Token probably expired.`)
            }
        }
        this.signedIn_ = false
        this.signedInPreExam_ = false
        this.setApiMode("normal", this.useDevApi_)
        await this.storeApiMode("normal")
        await this.setAllContextKeys({
            courses: false,
            exam: false,
            preExam: false,
            contestMode: false,
        })
        this.log.info(`Signed out.`)
    }

    /* ---------- Public sign-in actions ---------- */

    public static async signInJutge({
        email,
        password,
    }: SignInJutgeParams): Promise<SignInResult> {
        const trimmedEmail = email.trim()
        if (!trimmedEmail) {
            return { ok: false, error: "Please enter your email." }
        }
        if (!password) {
            return { ok: false, error: "Please enter your password." }
        }
        this.setApiMode("normal", this.useDevApi_)
        try {
            const credentials = await jutgeClient.login({ email: trimmedEmail, password })
            await this.setSignedInJutge(credentials.token)
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
     * Step 1 of the exam/contest sign-in: authenticate with the user's normal
     * Jutge credentials so we can list the user's exams in step 2.
     *
     * NOTE: `auth.login` only exists on the **normal** Jutge domain — the
     * `exam` and `contest` hosts only accept `auth.loginExam`. So we call
     * `auth.login` against `api.jutge.org` (using `setApiMode("normal")`),
     * and then `setSignedInPreExam` swaps the URL to the exam/contest host
     * with the same token loaded into `meta`. Later calls — `getReadyExams`
     * (auth: any, cross-host token OK) and `auth.loginExam` (available on
     * the exam/contest hosts) — then talk to the right server.
     *
     * Caveat: this requires reachability of `api.jutge.org` during step 1.
     * Inside a firewalled exam network only the exam/contest host is
     * reachable; that case needs a different flow we haven't designed yet.
     */
    public static async signInPreExam({
        email,
        password,
        mode,
        useDevApi,
    }: SignInPreExamParams): Promise<SignInResult> {
        const trimmedEmail = email.trim()
        if (!trimmedEmail) {
            return { ok: false, error: "Please enter your email." }
        }
        if (!password) {
            return { ok: false, error: "Please enter your password." }
        }
        const nextUseDevApi = Boolean(useDevApi)
        this.setApiMode("normal", nextUseDevApi)
        await this.storeUseDevApi(nextUseDevApi)
        try {
            const credentials = await jutgeClient.login({ email: trimmedEmail, password })
            await this.storeSignInCredentials(trimmedEmail, password)
            await this.setSignedInPreExam(credentials.token, mode)
            return { ok: true }
        } catch (err) {
            this.setApiMode("normal", this.useDevApi_)
            return { ok: false, error: this.normalizeError(err) }
        }
    }

    /**
     * Step 2 of the exam/contest sign-in: actually enter the chosen exam,
     * using the email/password we stored during step 1. On success, the
     * pre-exam token is discarded and the exam token is what we'll use
     * from then on.
     */
    public static async enterExam({
        mode,
        examKey,
        examPassword,
    }: EnterExamParams): Promise<SignInResult> {
        const cleanKey = (examKey || "").trim()
        if (!cleanKey) {
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

        const email = await this.getStoredSignInEmail()
        const password = await this.getStoredSignInPassword()
        if (!email || !password) {
            return {
                ok: false,
                error: "Your sign-in credentials were lost. Please sign in again.",
            }
        }

        this.setApiMode(mode, this.useDevApi_)
        try {
            const credentials = await jutgeClient.loginExam({
                email,
                password,
                exam: cleanKey,
                exam_password: examPassword,
            })
            await this.setSignedInExam(credentials.token, mode)
            await vscode.commands.executeCommand("jutge-vscode.refreshExamsTree")
            await vscode.commands.executeCommand("jutge-vscode.refreshExamPropertiesTree")
            await vscode.commands.executeCommand("jutge-vscode.refreshExamDocumentsTree")
            if (mode === "contest") {
                await vscode.commands.executeCommand("jutge-vscode.refreshRankingTree")
            }
            this.getProfileSWR()
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
     * List the exams (or contests) the currently signed-in user is allowed to
     * enter. Requires either a pre-exam token, an exam token, or a normal
     * Jutge token already loaded into `jutgeClient.meta` for the right host.
     */
    static async getReadyExamsForMode(
        mode: ExamMode,
        useDevApi: boolean = this.useDevApi_
    ): Promise<string[] | undefined> {
        const originalMode = this.apiMode_
        const originalUseDevApi = this.useDevApi_
        try {
            this.setApiMode(mode, useDevApi)
            const exams = await jutgeClient.student.exam.getReadyExams()
            return exams.map((e) => e.exam_key)
        } catch (error) {
            this.log.error(`Could not get exams: ${error}`)
            return
        } finally {
            this.setApiMode(originalMode, originalUseDevApi)
        }
    }

    /* ---------- Resume from storage on activation ---------- */

    public static async resumeFromStorage(): Promise<void> {
        const storedMode = this.getStoredApiMode()

        // 1) A full exam token is the most specific — try it first.
        const examToken = this.getExamToken()
        if (examToken) {
            const examMode: ExamMode = storedMode === "contest" ? "contest" : "exam"
            if (await this.isTokenValidOnHost(examToken, examMode, this.useDevApi_)) {
                this.log.info(`Resuming from exam token (${examMode}).`)
                await this.setSignedInExam(examToken, examMode)
                return
            }
        }

        // 2) Pre-exam token — only meaningful when the stored mode is exam/contest.
        //    The token was issued by `auth.login` on the **normal** host (see
        //    `signInPreExam`), so we validate it against that host even though
        //    the user intends to use it on the exam/contest host.
        if (storedMode === "exam" || storedMode === "contest") {
            const preExamToken = this.getPreExamToken()
            if (
                preExamToken &&
                (await this.isTokenValidOnHost(preExamToken, "normal", this.useDevApi_))
            ) {
                this.log.info(`Resuming from pre-exam token (intended mode=${storedMode}).`)
                await this.setSignedInPreExam(preExamToken, storedMode)
                return
            }
        }

        // 3) Normal Jutge token.
        const token = this.getToken()
        if (token && (await this.isTokenValidOnHost(token, "normal", this.useDevApi_))) {
            this.log.info(`Resuming from normal token.`)
            await this.setSignedInJutge(token)
            return
        }

        this.log.debug("No valid token found during activation")
    }

    /* ---------- Sign-out actions ---------- */

    /**
     * Leave the SIGNED_IN_NO_EXAM state (pre-exam) without confirmation. Used
     * when the user clicks "Cancel" / "Sign out" in the exam-selection step.
     */
    public static async signOutPreExam(): Promise<void> {
        await this.storePreExamToken(undefined)
        await this.setSignedOut()
    }

    public static async confirmSignOut() {
        let dialogText = {
            placeHolder: `Please confirm that you want to sign out`,
            no: `No, keep signed in.`,
            yes: `Yes, sign out.`,
        }
        if (this.isExamMode() || this.isContestMode()) {
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
            if (askConfirmation) {
                if (!(await this.confirmSignOut())) {
                    return
                }
            }
            await this.storeExamToken(undefined)
            await this.storePreExamToken(undefined)
            await this.storeToken(undefined)
            await this.setSignedOut()
            vscode.commands.executeCommand("jutge-vscode.refreshCoursesTree")
            if (typeof options?.message === "string" && options.message.trim().length > 0) {
                vscode.window.showInformationMessage(`Jutge.org: ${options.message}`)
            }
        } catch (e) {
            console.error(e)
        }
    }

    public static async signOutExam(options?: {
        askConfirmation: boolean
        message: string
    }): Promise<void> {
        try {
            const askConfirmation = options?.askConfirmation ?? true
            if (askConfirmation) {
                if (!(await this.confirmSignOut())) {
                    return
                }
            }
            await this.storeExamToken(undefined)
            await this.storePreExamToken(undefined)
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

                const result: j.AbstractProblem[] = []
                for (const [problem_nm, abstractProblem] of Object.entries(abstractProblems)) {
                    if (problem_nm !== null) {
                        result.push(abstractProblem)
                    }
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
}
