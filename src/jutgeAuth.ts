import * as vscode from "vscode"
import axios from "axios"
import fs from "fs"

import { AuthenticationService } from "./client"

import { getExtensionContext } from "./context"

/**
 * Checks if a token is valid by making a request to the API.
 * Stores current axios headers to restore them after the request.
 *
 * @param token The token to check.
 * @returns A promise that resolves to a boolean indicating if the token is valid.
 */
async function isTokenValid(token: string): Promise<boolean> {
    const existingAuthHeader = axios.defaults.headers.common["Authorization"]
    try {
        axios.defaults.headers.common["Authorization"] = `Bearer ${token}`
        const tokenCheck = await AuthenticationService.check()
        axios.defaults.headers.common["Authorization"] = existingAuthHeader
        return tokenCheck.success
    } catch (error) {
        axios.defaults.headers.common["Authorization"] = existingAuthHeader
        return false
    }
}

export async function isUserAuthenticated(): Promise<boolean> {
    const context = getExtensionContext()
    const token = await context.secrets.get("jutgeToken")
    if (!token) {
        return false
    }
    return await isTokenValid(token)
}

async function getTokenFromCredentials(): Promise<string | undefined> {
    const context = getExtensionContext()

    const default_email = (await context.secrets.get("email")) || ""
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

    let credentials
    try {
        // Clear any existing token in axios headers or `login` call will fail.
        delete axios.defaults.headers.common["Authorization"]
        credentials = await AuthenticationService.login({ requestBody: { email, password } })
    } catch (error) {
        vscode.window.showErrorMessage("Jutge.org: Invalid credentials to sign in.")
        console.log("Error signing in:", error)
        return
    }

    await context.secrets.store("email", email)
    return credentials.token
}

function getTokenFromConfigFile(): string | undefined {
    // TODO: Search over several possible paths (token, token.txt, etc.)
    const tokenFile = `${process.env.HOME}/.config/jutge/token.txt`
    if (!fs.existsSync(tokenFile)) {
        return
    }
    return fs.readFileSync(tokenFile, "utf8")
}

/**
 * Tries to get a valid token from different sources.
 * The order of sources is:
 * 1. VSCode storage (previous active token).
 * 2. A file in the user's home config directory.
 *
 * @returns A promise that resolves to a valid token or undefined if none is found.
 */
export async function getTokenAtActivation(): Promise<string | undefined> {
    const context = getExtensionContext()
    const tokenSources = [
        { id: "vscode storage", fn: context.secrets.get("jutgeToken") },
        { id: "~/.config/jutge/token.txt", fn: getTokenFromConfigFile() },
    ]

    for (const source of tokenSources) {
        const token = await source.fn
        if (token && (await isTokenValid(token))) {
            console.log(`jutge-vscode: Using token from ${source.id}`)
            return token
        }
    }
}

export async function signInToJutge() {
    if (await isUserAuthenticated()) {
        vscode.window.showInformationMessage("Jutge.org: You are already signed in.")
        return
    }

    const token = await getTokenFromCredentials()
    if (token) {
        await getExtensionContext().secrets.store("jutgeToken", token)
        axios.defaults.headers.common["Authorization"] = `Bearer ${token}`

        vscode.commands.executeCommand("jutge-vscode.refreshTree")
        vscode.window.showInformationMessage("Jutge.org: You have signed in")
    }
}

export async function signOutFromJutge() {
    const context = getExtensionContext()
    await context.secrets.delete("jutgeToken")
    await context.secrets.delete("email")

    delete axios.defaults.headers.common["Authorization"]

    vscode.commands.executeCommand("jutge-vscode.refreshTree")
    vscode.window.showInformationMessage("Jutge.org: You have signed out.")
}

export function registerAuthCommands(context: vscode.ExtensionContext) {
    context.subscriptions.push(vscode.commands.registerCommand("jutge-vscode.signIn", signInToJutge))
    context.subscriptions.push(vscode.commands.registerCommand("jutge-vscode.signOut", signOutFromJutge))
}
