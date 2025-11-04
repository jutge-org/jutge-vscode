/*
    This file abstracts the Jutge API so that we can apply the 
    "stale while revalidate" strategy, e.g. if we have a cached 
    value, we can return it while we fetch the new value in the 
    background.
*/

import * as j from "@/jutge_api_client"
import { StaticLogger } from "@/loggers"
import deepEqual from "deep-equal"
import * as fs from "fs"
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
    static examMode_: boolean = false

    public static async initialize(context: vscode.ExtensionContext): Promise<void> {
        this.log.info("Initializing...")
        JutgeService.context_ = context
        await JutgeService.getStoredToken()
        this.log.info("Initialization complete")
    }

    /*

    Storage: things that we want to save for later

    */

    public static getToken() {
        return JutgeService.context_.globalState.get<string>("jutgeToken")
    }

    public static async storeToken(token: string | undefined) {
        await JutgeService.context_.globalState.update("jutgeToken", token)
    }

    public static getExamToken() {
        return JutgeService.context_.globalState.get<string>("jutgeExamToken")
    }

    public static async storeExamToken(examToken: string | undefined) {
        await JutgeService.context_.globalState.update("jutgeExamToken", examToken)
    }

    public static getEmail() {
        return JutgeService.context_.globalState.get<string>("email")
    }

    public static async storeEmail(email: string) {
        await JutgeService.context_.globalState.update("email", email)
    }

    public static logStorageKeys() {
        const keys = JutgeService.context_.globalState.keys().join(", ")
        this.log.info(`Keys in storage: ${keys}`)
    }

    //

    public static async isUserAuthenticated(): Promise<boolean> {
        const examToken = JutgeService.getExamToken()
        if (examToken && (await JutgeService.isExamTokenValid(examToken))) {
            return true
        }
        const token = JutgeService.getToken()
        if (token && (await JutgeService.isTokenValid(token))) {
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
            jutgeClient.JUTGE_API_URL =
                process.env.JUTGE_EXAM_API_URL || "https://exam.api.jutge.org/api"
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
        return JutgeService.examMode_
    }

    private static async askEmail(): Promise<string | undefined> {
        const initial_email = JutgeService.getEmail() || ""
        const email = await vscode.window.showInputBox({
            title: "Jutge Sign-In",
            placeHolder: "your email",
            prompt: "Please write your email for Jutge.org.",
            value: initial_email,
        })
        if (email) {
            await JutgeService.storeEmail(email)
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
        const email = await JutgeService.askEmail()
        if (!email) {
            return
        }

        const password = await JutgeService.askPassword({
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

    private static enterExamMode() {
        // Enter exam mode by setting headers on the client
        // JutgeService.oldJutgeClientHeaders_ = jutgeClient.headers
        // jutgeClient.headers = {
        //     "jutge-host": "exam.api.jutge.org",
        // }
        // TODO(pauek): Switch to this
        jutgeClient.JUTGE_API_URL =
            process.env.JUTGE_EXAM_API_URL || "https://exam.api.jutge.org/api"
        JutgeService.examMode_ = true
        this.log.info(`Entered exam mode.`)
    }

    private static exitExamMode() {
        // jutgeClient.headers = JutgeService.oldJutgeClientHeaders_
        jutgeClient.JUTGE_API_URL = process.env.JUTGE_API_URL || "https://api.jutge.org/api"
        JutgeService.examMode_ = false
        this.log.info(`Exited exam mode.`)
    }

    private static async getExamTokenFromCredentials(): Promise<
        { exam_key: string; token: string } | undefined
    > {
        const email = await JutgeService.askEmail()
        if (!email) {
            return
        }

        const password = await JutgeService.askPassword({
            title: "Jutge Sign-In",
            placeHolder: "your password",
            prompt: "Please write your password for Jutge.org.",
        })
        if (!password) {
            return
        }

        JutgeService.enterExamMode()

        // Retrieve a list of exams for the user
        const exams = await JutgeService.getReadyExams()
        if (!exams) {
            JutgeService.exitExamMode()
            return
        }
        const chosenExam = await JutgeService.pickOneOf(exams)
        if (!chosenExam) {
            JutgeService.exitExamMode()
            return
        }

        const examPassword = await JutgeService.askPassword({
            title: "Exam Sign-In",
            placeHolder: "The exam password (provided by the teacher)",
            prompt: "Please write the exam password provided by the teacher",
        })
        if (!examPassword) {
            JutgeService.exitExamMode()
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
            vscode.window.showErrorMessage("Jutge.org: Invalid credentials to sign in.")
            this.log.error(`JutgeService: Error signing in: ${error}`)
            JutgeService.exitExamMode()
            return
        }
    }

    private static getTokenFromConfigFile(): string | undefined {
        const tokenFile = `${process.env.HOME}/.config/jutge/token.txt`
        if (!fs.existsSync(tokenFile)) {
            return
        }
        return fs.readFileSync(tokenFile, "utf8")
    }

    public static async getStoredToken(): Promise<string | undefined> {
        this.logStorageKeys()

        {
            const examToken = JutgeService.getExamToken()
            this.log.info(`jutgeExamToken is ${examToken}`)
            if (examToken && (await JutgeService.isExamTokenValid(examToken))) {
                this.log.info(`Using exam token from VSCode workspaceState storage`)
                JutgeService.enterExamMode()
                await JutgeService.setExamToken(examToken)
                await vscode.commands.executeCommand(
                    "setContext",
                    "jutge-vscode.isSignedIn",
                    true
                )
                return
            }
        }

        {
            const token = JutgeService.getToken()
            if (token && (await JutgeService.isTokenValid(token))) {
                this.log.info(`Using token from VSCode storage`)
                await vscode.commands.executeCommand(
                    "setContext",
                    "jutge-vscode.isSignedIn",
                    true
                )
                await JutgeService.setToken(token)
                return
            }
        }

        this.log.debug("No valid token found during activation")
    }

    public static signIn(): void {
        const _signIn = async () => {
            if (await JutgeService.isUserAuthenticated()) {
                vscode.window.showInformationMessage("Jutge.org: You are already signed in.")
                return
            }

            const token = await JutgeService.getTokenFromCredentials()
            if (!token) {
                return
            }
            await JutgeService.storeToken(token)
            await vscode.commands.executeCommand("setContext", "jutge-vscode.isSignedIn", true)

            vscode.commands.executeCommand("jutge-vscode.refreshTree")
            vscode.window.showInformationMessage("Jutge.org: You have signed in")

            JutgeService.getProfileSWR() // cache this for later
        }

        _signIn()
    }

    public static signInExam(): void {
        const _signInExam = async () => {
            if (await JutgeService.isUserAuthenticated()) {
                vscode.window.showInformationMessage("Jutge.org: You are already signed in.")
                return
            }

            const result = await JutgeService.getExamTokenFromCredentials()
            if (!result) {
                return
            }
            const { token: examToken, exam_key } = result
            if (!examToken) {
                return
            }
            await JutgeService.storeExamToken(examToken)
            await vscode.commands.executeCommand("setContext", "jutge-vscode.isSignedIn", true)

            vscode.commands.executeCommand("jutge-vscode.refreshTree")
            vscode.window.showInformationMessage(`Jutge.org: You have entered exam ${exam_key}`)

            JutgeService.getProfileSWR() // cache this for later
        }

        _signInExam()
    }

    public static async signOut(): Promise<void> {
        if (!(await JutgeService.isUserAuthenticated())) {
            return
        }

        // Show confirmation dialog
        let dialogText = {
            placeHolder: `Please confirm that you want to sign out`,
            no: `No, keep signed in.`,
            yes: `Yes, sign out.`,
        }
        if (JutgeService.isExamMode()) {
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

        if (confirmation == dialogText.no) {
            return
        }

        if (JutgeService.isExamMode()) {
            JutgeService.exitExamMode()
        }

        // Sign-out (of everything)
        JutgeService.storeExamToken(undefined)
        JutgeService.storeToken(undefined)

        await vscode.commands.executeCommand("setContext", "jutge-vscode.isSignedIn", false)
        await jutgeClient.logout()
        vscode.commands.executeCommand("jutge-vscode.refreshTree")
        vscode.window.showInformationMessage("Jutge.org: You have signed out.")
    }

    static async setToken(token: string): Promise<void> {
        jutgeClient.meta = { token }
        await JutgeService.storeToken(token)
    }

    static async setExamToken(examToken: string): Promise<void> {
        jutgeClient.meta = { token: examToken }
        await JutgeService.storeExamToken(examToken)
    }

    // ---

    private static SWR<T>(funcCallId: string, getData: () => Promise<T>): SwrResult<T> {
        const dbkey = `JutgeService.${funcCallId}`

        const result: SwrResult<T> = {
            data: undefined,
            onUpdate: (_) => {}, // <- should be replaced later by the caller
        }

        const _revalidate = async () => {
            this.log.info(`Revalidating '${funcCallId}'...`)
            try {
                const newData: T = await getData()
                // Don't call update or save if data is identical
                if (!deepEqual(result.data, newData)) {
                    this.log.info(`Revalidated '${funcCallId}': update!`)
                    JutgeService.context_.globalState.update(dbkey, newData)
                    result.onUpdate(newData)
                } else {
                    this.log.info(`Revalidated '${funcCallId}': no changes.`)
                }
            } catch (e) {
                this.log.info(`Error getting data: ${e}`)
                result.onUpdate(null)
            }
        }

        _revalidate() // launch revalidation

        // But return what we have in cache
        result.data = JutgeService.context_.globalState.get<T>(dbkey)
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
        return JutgeService.SWR<j.RunningExam>("getExam", async () =>
            jutgeClient.student.exam.get()
        )
    }

    static getCoursesSWR() {
        return JutgeService.SWR<Record<string, j.BriefCourse>>("getCourses", async () =>
            jutgeClient.student.courses.indexEnrolled()
        )
    }

    static getCourseSWR(courseKey: string) {
        return JutgeService.SWR<{ course: j.Course; lists: j.BriefList[] }>(
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
        return JutgeService.SWR<Record<string, j.BriefList>>(`getAllLists()`, async () =>
            jutgeClient.student.lists.getAll()
        )
    }

    static async problemExists(problemNm: string) {
        const result = await jutgeClient.problems.getAbstractProblems(problemNm)
        return result[problemNm] !== undefined
    }

    static getAbstractProblemsSWR(problem_nms: string[]) {
        return JutgeService.SWR<j.AbstractProblem[]>(
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
        return JutgeService.SWR<(j.AbstractProblem | string)[]>(
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
        return JutgeService.SWR<Record<string, j.AbstractStatus>>(
            `getAllStatuses()`,
            async () => jutgeClient.student.statuses.getAll()
        )
    }

    static getTemplateListSWR(problem_id: string) {
        return JutgeService.SWR<string[]>(`getTemplates(${problem_id})`, async () =>
            jutgeClient.problems.getTemplates(problem_id)
        )
    }
    static getTemplateList(problem_id: string) {
        return JutgeService.promisify(() => JutgeService.getTemplateListSWR(problem_id))
    }

    static getTemplate(problem_id: string, template: string) {
        return jutgeClient.problems.getTemplate({ problem_id, template })
    }

    static getProfileSWR() {
        return JutgeService.SWR<j.Profile>(`getProfile`, async () =>
            jutgeClient.student.profile.get()
        )
    }

    static getAbstractProblemSWR(problemNm: string) {
        return JutgeService.SWR<j.AbstractProblem>(
            `getAbstractProblem(${problemNm})`,
            async () => jutgeClient.problems.getAbstractProblem(problemNm)
        )
    }
    static async getAbstractProblem(problemNm: string): Promise<j.AbstractProblem> {
        return JutgeService.promisify(() => JutgeService.getAbstractProblemSWR(problemNm))
    }

    static getHtmlStatementSWR(problemId: string) {
        return JutgeService.SWR<string>(`getHtmlStatement(${problemId})`, async () =>
            jutgeClient.problems.getHtmlStatement(problemId)
        )
    }

    static async getHtmlStatement(problemId: string) {
        return JutgeService.promisify(() => JutgeService.getHtmlStatementSWR(problemId))
    }

    static getProblemSupplSWR(problemId: string) {
        return JutgeService.SWR<j.ProblemSuppl>(`getProblemSuppl(${problemId})`, async () =>
            jutgeClient.problems.getProblemSuppl(problemId)
        )
    }

    static getProblemSuppl(problemId: string) {
        return JutgeService.promisify(() => JutgeService.getProblemSupplSWR(problemId))
    }

    static getSampleTestcasesSWR(problemId: string) {
        return JutgeService.SWR<j.Testcase[]>(`getSampleTestcases(${problemId})`, async () =>
            jutgeClient.problems.getSampleTestcases(problemId)
        )
    }

    static async getSampleTestcases(problemId: string) {
        return JutgeService.promisify(() => JutgeService.getSampleTestcasesSWR(problemId))
    }

    static async submit(
        file: File,
        data: {
            problem_id: string
            compiler_id: string
            annotation: string
        }
    ): Promise<j.NewSubmissionOut> {
        return jutgeClient.student.submissions.submitFull(data, file)
    }

    static async getSubmission(data: {
        problem_id: string
        submission_id: string
    }): Promise<j.Submission> {
        return jutgeClient.student.submissions.get(data)
    }
}
