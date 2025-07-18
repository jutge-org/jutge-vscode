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

const jutgeClient = new j.JutgeApiClient()
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

        const token = await JutgeService.getTokenAtActivation()
        if (token) {
            this.log.debug("Token found during activation")
            await JutgeService.setToken(token)
        } else {
            this.log.debug("No valid token found during activation")
        }
        this.log.info("Initialization complete")
    }

    public static async isUserAuthenticated(): Promise<boolean> {
        const token = await JutgeService.context_.secrets.get("jutgeToken")
        if (!token) {
            return false
        }
        return await JutgeService.isTokenValid(token)
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

    private static async askEmail(): Promise<string | undefined> {
        const initial_email = (await JutgeService.context_.secrets.get("email")) || ""
        const email = await vscode.window.showInputBox({
            title: "Jutge Sign-In",
            placeHolder: "your email",
            prompt: "Please write your email for Jutge.org.",
            value: initial_email,
        })
        if (email) {
            await JutgeService.context_.secrets.store("email", email)
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
        } catch (error) {
            vscode.window.showErrorMessage("Jutge.org: Invalid credentials to sign in.")
            this.log.error(`Error signing in: ${error}`)
            return
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

        // Enter exam mode by setting headers on the client
        const oldHeaders = jutgeClient.headers
        jutgeClient.headers = {
            "jutge-host": "exam.api.jutge.org",
        }
        this.examMode_ = true

        // Retrieve a list of exams for the user
        const exams = await this.getReadyExams()
        if (!exams) {
            jutgeClient.headers = oldHeaders
            return
        }
        const chosenExam = await this.pickOneOf(exams)
        if (!chosenExam) {
            jutgeClient.headers = oldHeaders
            return
        }

        const examPassword = await this.askPassword({
            title: "Exam Sign-In",
            placeHolder: "The exam password (provided by the teacher)",
            prompt: "Please write the exam password provided by the teacher",
        })
        if (!examPassword) {
            jutgeClient.headers = oldHeaders
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
            jutgeClient.headers = oldHeaders
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

    public static async getTokenAtActivation(): Promise<string | undefined> {
        const tokenSources = [
            { id: "vscode storage", fn: JutgeService.context_.secrets.get("jutgeToken") },
            {
                id: "~/.config/jutge/token.txt",
                fn: JutgeService.getTokenFromConfigFile(),
            },
        ]

        for (const source of tokenSources) {
            const token = await source.fn
            if (token && (await JutgeService.isTokenValid(token))) {
                this.log.info(`Using token from ${source.id}`)
                return token
            }
        }
    }

    public static signIn(): void {
        const _signIn = async () => {
            if (await JutgeService.isUserAuthenticated()) {
                vscode.window.showInformationMessage(
                    "Jutge.org: You are already signed in."
                )
                return
            }

            const token = await JutgeService.getTokenFromCredentials()
            if (token) {
                await JutgeService.context_.secrets.store("jutgeToken", token)

                vscode.commands.executeCommand("jutge-vscode.refreshTree")
                vscode.window.showInformationMessage("Jutge.org: You have signed in")

                JutgeService.getProfileSWR() // cache this for later
            }
        }

        _signIn()
    }

    public static signInExam(): void {
        const _signInExam = async () => {
            if (await JutgeService.isUserAuthenticated()) {
                vscode.window.showInformationMessage(
                    "Jutge.org: You are already signed in."
                )
                return
            }

            const result = await JutgeService.getExamTokenFromCredentials()
            if (!result) {
                return
            }
            const { token, exam_key } = result
            if (token) {
                await JutgeService.context_.secrets.store("jutgeToken", token)

                vscode.commands.executeCommand("jutge-vscode.refreshTree")
                vscode.window.showInformationMessage(
                    `Jutge.org: You have entered exam ${exam_key}`
                )

                JutgeService.getProfileSWR() // cache this for later
            }
        }

        _signInExam()
    }

    public static async signOut(): Promise<void> {
        await JutgeService.context_.secrets.delete("jutgeToken")
        await JutgeService.context_.secrets.delete("email")

        await jutgeClient.logout()
        JutgeService.examMode_ = false

        vscode.commands.executeCommand("jutge-vscode.refreshTree")
        vscode.window.showInformationMessage("Jutge.org: You have signed out.")
    }

    static async setToken(token: string): Promise<void> {
        jutgeClient.meta = { token }
        await JutgeService.context_.secrets.store("jutgeToken", token)
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
                    this.context_.globalState.update(dbkey, newData)
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
        return this.SWR<j.RunningExam>("getExam", async () =>
            jutgeClient.student.exam.get()
        )
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

    static getAbstractProblemsSWR(problem_nms: string[]) {
        return this.SWR<j.AbstractProblem[]>(
            `getAbstractProblems(${problem_nms.join(`,`)})`,
            async () => {
                const abstractProblems = await jutgeClient.problems.getAbstractProblems(
                    problem_nms.join(",")
                )

                const result: j.AbstractProblem[] = []
                for (const [problem_nm, abstractProblem] of Object.entries(
                    abstractProblems
                )) {
                    if (problem_nm !== null) {
                        result.push(abstractProblem)
                    }
                }
                return result
            }
        )
    }

    static getAbstractProblemsInListSWR(listKey: string) {
        return this.SWR<j.AbstractProblem[]>(
            `getAbstractProblemsInList(${listKey})`,
            async () => {
                const [resList, resAbsProblems] = await Promise.allSettled([
                    jutgeClient.student.lists.get(listKey),
                    jutgeClient.problems.getAbstractProblemsInList(listKey),
                ])
                if (
                    resAbsProblems.status === "rejected" ||
                    resList.status === "rejected"
                ) {
                    throw new Error(
                        `[JutgeService] getAbstractProblemsInListSWR: Failed to load abs. problems or list`
                    )
                }
                const problems = resAbsProblems.value
                const listItems = resList.value.items

                // Put abstract problems in the order in which they appear in the list
                const result: j.AbstractProblem[] = []
                for (const { problem_nm } of listItems) {
                    if (problem_nm !== null && problem_nm in problems) {
                        result.push(problems[problem_nm])
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
        return this.SWR<j.Profile>(`getProfile`, async () =>
            jutgeClient.student.profile.get()
        )
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
        return jutgeClient.student.submissions.submitFull(data, file)
    }

    static async getSubmission(data: {
        problem_id: string
        submission_id: string
    }): Promise<j.Submission> {
        return jutgeClient.student.submissions.get(data)
    }
}
