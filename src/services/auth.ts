import * as vscode from "vscode"
import { jutgeClient } from "@/extension"
import * as fs from "fs"

export class AuthService {
    private static context: vscode.ExtensionContext

    public static async initialize(context: vscode.ExtensionContext): Promise<void> {
        console.info("[AuthService] Initializing...")
        this.context = context

        const token = await this.getTokenAtActivation()
        if (token) {
            console.debug("[AuthService] Token found during activation")
            jutgeClient.meta = {
                token,
                exam: null,
            }
            await context.secrets.store("jutgeToken", token)
        } else {
            console.debug("[AuthService] No valid token found during activation")
        }
        console.info("[AuthService] Initialization complete")
    }

    public static async isUserAuthenticated(): Promise<boolean> {
        const token = await this.context.secrets.get("jutgeToken")
        if (!token) {
            return false
        }
        return await this.isTokenValid(token)
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
        const default_email = (await this.context.secrets.get("email")) || ""
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
            await this.context.secrets.store("email", email)
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
            { id: "vscode storage", fn: this.context.secrets.get("jutgeToken") },
            { id: "~/.config/jutge/token.txt", fn: this.getTokenFromConfigFile() },
        ]

        for (const source of tokenSources) {
            const token = await source.fn
            if (token && (await this.isTokenValid(token))) {
                console.info(`[AuthService] Using token from ${source.id}`)
                return token
            }
        }
    }

    public static async signIn(): Promise<void> {
        if (await this.isUserAuthenticated()) {
            vscode.window.showInformationMessage("Jutge.org: You are already signed in.")
            return
        }

        const token = await this.getTokenFromCredentials()
        if (token) {
            await this.context.secrets.store("jutgeToken", token)

            vscode.commands.executeCommand("jutge-vscode.refreshTree")
            vscode.window.showInformationMessage("Jutge.org: You have signed in")
        }
    }

    public static async signOut(): Promise<void> {
        await this.context.secrets.delete("jutgeToken")
        await this.context.secrets.delete("email")

        await jutgeClient.logout()

        vscode.commands.executeCommand("jutge-vscode.refreshTree")
        vscode.window.showInformationMessage("Jutge.org: You have signed out.")
    }
}
