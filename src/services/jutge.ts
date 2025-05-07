/*
    This file abstracts the Jutge API so that we can apply the 
    "stale while revalidate" strategy, e.g. if we have a cached 
    value, we can return it while we fetch the new value in the 
    background.
*/

import * as j from "@/jutge_api_client"
import * as fs from "fs"
import * as vscode from "vscode"
import deepEqual from "deep-equal"

const jutgeClient = new j.JutgeApiClient()

type StaleWhileRevalidateResult<T> = {
    data: T | undefined
    onUpdate: (data: T) => void
}

export class JutgeService {
    static context_: vscode.ExtensionContext

    public static async initialize(context: vscode.ExtensionContext): Promise<void> {
        console.info("[AuthService] Initializing...")
        JutgeService.context_ = context

        const token = await JutgeService.getTokenAtActivation()
        if (token) {
            console.debug("[AuthService] Token found during activation")
            await JutgeService.setToken(token)
        } else {
            console.debug("[AuthService] No valid token found during activation")
        }
        console.info("[AuthService] Initialization complete")
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
            jutgeClient.meta = { token, exam: null }
            await jutgeClient.student.profile.get()
            return true
        } catch (error) {
            jutgeClient.meta = originalMeta
            return false
        }
    }

    private static async getTokenFromCredentials(): Promise<string | undefined> {
        const default_email = (await JutgeService.context_.secrets.get("email")) || ""

        const email = await vscode.window.showInputBox({
            title: "Jutge Sign-In",
            placeHolder: "your email",
            prompt: "Please write your email for Jutge.org.",
            value: default_email,
        })
        if (!email) {
            return
        }

        const password = await vscode.window.showInputBox({
            title: "Jutge Sign-In",
            placeHolder: "your password",
            prompt: "Please write your password for Jutge.org.",
            value: "",
            password: true,
        })
        if (!password) {
            return
        }

        try {
            const credentials = await jutgeClient.login({ email, password })
            await JutgeService.context_.secrets.store("email", email)
            return credentials.token
        } catch (error) {
            vscode.window.showErrorMessage("Jutge.org: Invalid credentials to sign in.")
            console.error(`AuthService: Error signing in: ${error}`, "AuthService")
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
            { id: "~/.config/jutge/token.txt", fn: JutgeService.getTokenFromConfigFile() },
        ]

        for (const source of tokenSources) {
            const token = await source.fn
            if (token && (await JutgeService.isTokenValid(token))) {
                console.info(`[AuthService] Using token from ${source.id}`)
                return token
            }
        }
    }

    public static signIn(): void {
        const _signIn = async () => {
            if (await JutgeService.isUserAuthenticated()) {
                vscode.window.showInformationMessage("Jutge.org: You are already signed in.")
                return
            }

            const token = await JutgeService.getTokenFromCredentials()
            if (token) {
                await JutgeService.context_.secrets.store("jutgeToken", token)

                vscode.commands.executeCommand("jutge-vscode.refreshTree")
                vscode.window.showInformationMessage("Jutge.org: You have signed in")
            }
        }

        _signIn()
    }

    public static async signOut(): Promise<void> {
        const _signOut = async () => {
            await JutgeService.context_.secrets.delete("jutgeToken")
            await JutgeService.context_.secrets.delete("email")

            await jutgeClient.logout()

            vscode.commands.executeCommand("jutge-vscode.refreshTree")
            vscode.window.showInformationMessage("Jutge.org: You have signed out.")
        }

        _signOut()
    }

    static async setToken(token: string): Promise<void> {
        jutgeClient.meta = { token, exam: null }
        await JutgeService.context_.secrets.store("jutgeToken", token)
    }

    // ---

    static staleWhileRevalidate<T>(key: string, getData: () => Promise<T>): StaleWhileRevalidateResult<T> {
        const result: StaleWhileRevalidateResult<T> = {
            data: undefined,
            onUpdate: (_) => {}, // <- should be replaced later by the caller
        }

        const _revalidate = async () => {
            const newData: T = await getData()
            // Don't call update or save if data is identical
            if (!deepEqual(result.data, newData)) {
                this.context_.globalState.update(key, newData)
                result.onUpdate(newData)
            }
        }

        _revalidate() // launch revalidation

        // But return what we have in cache
        result.data = this.context_.globalState.get<T>(key)
        return result
    }

    static getCourses() {
        return this.staleWhileRevalidate<Record<string, j.BriefCourse>>("getCourses", async () =>
            jutgeClient.student.courses.indexEnrolled()
        )
    }

    static getCourse(courseKey: string) {
        return this.staleWhileRevalidate<{ course: j.Course; lists: j.BriefList[] }>(
            `getCourse(${courseKey})`,
            async () => {
                const [courseRes, listsRes] = await Promise.allSettled([
                    jutgeClient.student.courses.getEnrolled(courseKey),
                    jutgeClient.student.lists.getAll(),
                ])
                if (courseRes.status === "rejected" || listsRes.status === "rejected") {
                    throw new Error(`[JutgeService] getCourse: Could not load course or all lists`)
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

    static getAllLists() {
        return this.staleWhileRevalidate<Record<string, j.BriefList>>(`getAllLists()`, async () =>
            jutgeClient.student.lists.getAll()
        )
    }

    static getAbstractProblemsInList(listKey: string) {
        return this.staleWhileRevalidate<Record<string, j.AbstractProblem>>(
            `getAbstractProblemsInListWithStatus(${listKey})`,
            async () => jutgeClient.problems.getAbstractProblemsInList(listKey)
        )
    }

    static getAllStatuses() {
        return this.staleWhileRevalidate<Record<string, j.AbstractStatus>>(`getAllStatuses()`, async () =>
            jutgeClient.student.statuses.getAll()
        )
    }

    static getProfile() {
        return this.staleWhileRevalidate<j.Profile>(`getProfile`, async () => jutgeClient.student.profile.get())
    }

    static getAbstractProblem(problemNm: string) {
        return this.staleWhileRevalidate<j.AbstractProblem>(`getAbstractProblem(${problemNm})`, async () =>
            jutgeClient.problems.getAbstractProblem(problemNm)
        )
    }

    static getHtmlStatement(problemId: string) {
        return this.staleWhileRevalidate<string>(`getHtmlStatement(${problemId})`, async () =>
            jutgeClient.problems.getHtmlStatement(problemId)
        )
    }

    static getProblemSuppl(problemId: string) {
        return this.staleWhileRevalidate<j.ProblemSuppl>(`getProblemSuppl(${problemId})`, async () =>
            jutgeClient.problems.getProblemSuppl(problemId)
        )
    }

    static getSampleTestcases(problemId: string) {
        return this.staleWhileRevalidate<j.Testcase[]>(`getSampleTestcases(${problemId})`, async () =>
            jutgeClient.problems.getSampleTestcases(problemId)
        )
    }

    static async submit(data: {
        problem_id: string
        compiler_id: string
        code: string
        annotation: string
    }): Promise<string> {
        return jutgeClient.student.submissions.submit(data)
    }

    static async getSubmission(data: { problem_id: string; submission_id: string }): Promise<j.Submission> {
        return jutgeClient.student.submissions.get(data)
    }
}
