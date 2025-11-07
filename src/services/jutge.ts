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

type AskPasswordParams = {
    title: string
    placeHolder: string
    prompt: string
}

export class JutgeService extends StaticLogger {
    static context_: vscode.ExtensionContext
    static signedIn_: boolean = false
    static examMode_: boolean = false

    public static async initialize(context: vscode.ExtensionContext): Promise<void> {
        this.log.info("Initializing...")
        this.context_ = context
        await this.getStoredToken()
        this.log.info("Initialization complete")
    }

    /* Signed In State */

    static isSignedIn() {
        return this.signedIn_
    }

    static isSignedInExam() {
        return this.signedIn_ && this.examMode_
    }

    static async setSignedIn(token: string) {
        this.signedIn_ = true
        await this.storeToken(token)
        await vscode.commands.executeCommand(
            "setContext",
            "jutge-vscode.isSignedIn.Courses",
            true
        )
        this.setToken(token)
        this.log.info(`Signed in.`)
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
        await vscode.commands.executeCommand(
            "setContext",
            "jutge-vscode.isSignedIn.Courses",
            false
        )
        this.log.info(`Signed out.`)
    }

    static async setSignedInExam(examToken: string) {
        this.signedIn_ = true
        await this.storeExamToken(examToken)
        await vscode.commands.executeCommand("setContext", "jutge-vscode.isSignedIn.Exam", true)
        this.setExamToken(examToken)
        this.enterExamMode()
        this.log.info(`Signed in to exam.`)
    }

    static async setSignedOutExam() {
        try {
            await jutgeClient.logout()
        } catch (e) {
            if (e instanceof j.UnauthorizedError) {
                this.log.info(`Token probably expired.`)
            }
        }
        this.exitExamMode()
        this.signedIn_ = false
        await vscode.commands.executeCommand(
            "setContext",
            "jutge-vscode.isSignedIn.Exam",
            false
        )
        this.log.info(`Signed out from exam.`)
    }

    /*

    Storage: things that we want to save for later

    */

    public static getToken() {
        return this.context_.globalState.get<string>("jutgeToken")
    }

    public static async storeToken(token: string | undefined) {
        await this.context_.globalState.update("jutgeToken", token)
    }

    public static getExamToken() {
        return this.context_.globalState.get<string>("jutgeExamToken")
    }

    public static async storeExamToken(examToken: string | undefined) {
        await this.context_.globalState.update("jutgeExamToken", examToken)
    }

    public static getEmail() {
        return this.context_.globalState.get<string>("email")
    }

    public static async storeEmail(email: string) {
        await this.context_.globalState.update("email", email)
    }

    public static logStorageKeys() {
        const keys = this.context_.globalState.keys().join(", ")
        this.log.info(`Keys in storage: ${keys}`)
    }

    public static invalidateToken() {
        this.storeExamToken(undefined)
        this.storeToken(undefined)
        jutgeClient.meta = { token: "<invalidated!> XD" }
        this.log.info(`Invalidated token.`)
    }

    //

    public static async isUserAuthenticated(): Promise<boolean> {
        const examToken = this.getExamToken()
        if (examToken && (await this.isExamTokenValid(examToken))) {
            return true
        }
        const token = this.getToken()
        if (token && (await this.isTokenValid(token))) {
            return true
        }
        return false
    }

    private static async isExamTokenValid(examToken: string): Promise<boolean> {
        /*

        NOTE(pauek): In exam mode, we should call the API at a different address,
        since any other host will be firewalled. So we set the token and the
        JUTGE_API_URL temporarily for that call (student.profile.get)

        */
        const originalMeta = jutgeClient.meta
        const originalUrl = jutgeClient.JUTGE_API_URL

        try {
            setJutgeApiURL({ examMode: true })
            jutgeClient.meta = { token: examToken }
            await jutgeClient.student.profile.get()
            return true
        } catch (error) {
            this.log.error(`Error checking if the exam token is valid: ${error}`)
        } finally {
            jutgeClient.meta = originalMeta
            jutgeClient.JUTGE_API_URL = originalUrl
        }

        return false
    }

    private static async isTokenValid(token: string): Promise<boolean> {
        const originalMeta = jutgeClient.meta
        try {
            jutgeClient.meta = { token }
            await jutgeClient.student.profile.get()
            return true
        } catch (error) {
            jutgeClient.meta = originalMeta
            return false
        }
    }

    static isExamMode() {
        return this.examMode_
    }

    private static enterExamMode() {
        setJutgeApiURL({ examMode: true })
        this.examMode_ = true
        this.log.info(`Entered exam mode.`)
    }

    private static exitExamMode() {
        setJutgeApiURL({ examMode: false })
        this.examMode_ = false
        this.log.info(`Exited exam mode.`)
    }

    private static async askEmail(): Promise<string | undefined> {
        const initial_email = this.getEmail() || ""
        const email = await vscode.window.showInputBox({
            title: "Jutge Sign-In",
            placeHolder: "your email",
            prompt: "Please enter your email at Jutge.org.",
            value: initial_email,
        })
        if (email) {
            await this.storeEmail(email)
        }
        return email
    }

    private static async askPassword({
        title,
        placeHolder,
        prompt,
    }: AskPasswordParams): Promise<string | undefined> {
        return await vscode.window.showInputBox({
            title,
            placeHolder,
            prompt,
            value: "",
            password: true,
        })
    }

    private static async pickOneOf(options: string[]) {
        return await vscode.window.showQuickPick(options)
    }

    private static async getTokenFromCredentials(): Promise<string | undefined> {
        const email = await this.askEmail()
        if (!email) {
            return
        }

        const password = await this.askPassword({
            title: "Jutge Sign-In",
            placeHolder: "your password",
            prompt: "Please write your password for Jutge.org.",
        })
        if (!password) {
            return
        }

        try {
            const credentials = await jutgeClient.login({ email, password })
            return credentials.token
        } catch (err) {
            let message = String(err)
            if (err instanceof Error) {
                message = err.message
                if (err.cause instanceof Error) {
                    message = err.cause.message
                }
            }
            this.log.error(`Error signing in`, message, err)
            vscode.window.showErrorMessage(`Jutge.org: Error signing in: ${message}`)
        }
    }

    static async getReadyExams(): Promise<string[] | undefined> {
        try {
            const exams = await jutgeClient.student.exam.getReadyExams()
            return exams.map((e) => e.exam_key)
        } catch (error) {
            vscode.window.showErrorMessage("Jutge.org: Could not get exams.")
            this.log.error(`Could not get exams: ${error}`)
            return
        }
    }

    private static async getExamTokenFromCredentials(): Promise<
        { exam_key: string; token: string } | undefined
    > {
        const email = await this.askEmail()
        if (!email) {
            return
        }

        const password = await this.askPassword({
            title: "Jutge Sign-In",
            placeHolder: "your password",
            prompt: "Please write your password for Jutge.org.",
        })
        if (!password) {
            return
        }

        this.enterExamMode()

        // Retrieve a list of exams for the user
        const exams = await this.getReadyExams()
        if (!exams) {
            this.exitExamMode()
            return
        }
        const chosenExam = await this.pickOneOf(exams)
        if (!chosenExam) {
            this.exitExamMode()
            return
        }

        const examPassword = await this.askPassword({
            title: "Exam Sign-In",
            placeHolder: "The exam password (provided by the teacher)",
            prompt: "Please write the exam password provided by the teacher",
        })
        if (!examPassword) {
            this.exitExamMode()
            return
        }

        try {
            const credentials = await jutgeClient.loginExam({
                email,
                password,
                exam: chosenExam,
                exam_password: examPassword,
            })

            return {
                exam_key: chosenExam,
                token: credentials.token,
            }
        } catch (error) {
            vscode.window.showErrorMessage("Jutge.org: Invalid credentials.")
            this.log.error(`JutgeService: Error signing in: ${error}`)
            this.exitExamMode()
            return
        }
    }

    public static async getStoredToken(): Promise<string | undefined> {
        // this.logStorageKeys()

        {
            const examToken = this.getExamToken()
            this.log.info(`jutgeExamToken is ${examToken}`)
            if (examToken && (await this.isExamTokenValid(examToken))) {
                this.log.info(`Using exam token from VSCode storage`)
                await this.setSignedInExam(examToken)
                return
            }
        }

        {
            const token = this.getToken()
            if (token && (await this.isTokenValid(token))) {
                this.log.info(`Using token from VSCode storage`)
                await this.setSignedIn(token)
                return
            }
        }

        this.log.debug("No valid token found during activation")
    }

    public static signIn(): void {
        const _signIn = async () => {
            const token = await this.getTokenFromCredentials()
            if (!token) {
                return
            }

            await this.setSignedIn(token)

            vscode.commands.executeCommand("jutge-vscode.refreshCoursesTree")
            vscode.window.showInformationMessage("Jutge.org: You have signed in.")

            this.getProfileSWR() // cache this for later
        }

        if (!this.isSignedIn()) {
            _signIn()
        } else {
            vscode.window.showInformationMessage("Jutge.org: You are already signed in.")
        }
    }

    public static signInExam(): void {
        const _signInExam = async () => {
            const result = await this.getExamTokenFromCredentials()
            if (!result) {
                return
            }
            const { token: examToken, exam_key } = result
            if (!examToken) {
                return
            }

            await this.setSignedInExam(examToken)

            this.getProfileSWR() // cache this for later

            vscode.commands.executeCommand("jutge-vscode.refreshCoursesTree")
            vscode.window.showInformationMessage(
                `Jutge.org: You have entered exam ${exam_key}.`
            )
        }

        if (!this.isSignedIn()) {
            _signInExam()
        } else {
            vscode.window.showInformationMessage("Jutge.org: You are already in an exam.")
        }
    }

    public static async confirmSignOut() {
        let dialogText = {
            placeHolder: `Please confirm that you want to sign out`,
            no: `No, keep signed in.`,
            yes: `Yes, sign out.`,
        }
        if (this.isExamMode()) {
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
            const askConfirmation = options?.askConfirmation || true
            if (askConfirmation) {
                if (!(await this.confirmSignOut())) {
                    return
                }
            }

            // Sign-out (of everything)
            if (this.isExamMode()) {
                this.exitExamMode()
            }

            this.storeExamToken(undefined)
            this.storeToken(undefined)

            await this.setSignedOut()

            vscode.commands.executeCommand("jutge-vscode.refreshCoursesTree")

            const message = options?.message || "You have signed out"
            vscode.window.showInformationMessage(`Jutge.org: ${message}`)
        } catch (e) {
            console.error(e)
        }
    }

    public static async signOutExam(options?: {
        askConfirmation: boolean
        message: string
    }): Promise<void> {
        try {
            const askConfirmation = options?.askConfirmation || true
            if (askConfirmation) {
                if (!(await this.confirmSignOut())) {
                    return
                }
            }

            // Sign-out (of everything)
            if (this.isExamMode()) {
                this.exitExamMode()
            }

            this.storeExamToken(undefined)
            await this.setSignedOut()

            vscode.commands.executeCommand("jutge-vscode.refreshExamsTree")

            const message = options?.message || "You have signed out"
            vscode.window.showInformationMessage(`Jutge.org: ${message}`)
        } catch (e) {
            console.error(e)
        }
    }

    static async setToken(token: string): Promise<void> {
        jutgeClient.meta = { token }
        await this.storeToken(token)
    }

    static async setExamToken(examToken: string): Promise<void> {
        jutgeClient.meta = { token: examToken }
        await this.storeExamToken(examToken)
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
            const result = await jutgeClient.student.submissions.submitFull(data, file)
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
