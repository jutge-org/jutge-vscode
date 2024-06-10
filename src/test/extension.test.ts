import * as assert from "assert"

import * as vscode from "vscode"

import { beforeIntegrationTest } from "./helpers"

suite("Extension Test Suite", () => {
    vscode.window.showInformationMessage("Start extension tests.")

    suiteSetup(async () => {
        await beforeIntegrationTest()
    })

    test("Extension should be present", () => {
        const extension = vscode.extensions.getExtension("jutge.jutge-vscode")
        assert.ok(extension, "Extension not found")
    })

    test("Extension should be activated", async () => {
        const extension = vscode.extensions.getExtension("jutge.jutge-vscode")
        assert.ok(extension?.isActive)
    })

    test("Commands should be registered", async () => {
        const commands = [
            "jutge-vscode.showProblem",
            "jutge-vscode.signIn",
            "jutge-vscode.signOut",
            "jutge-vscode.refreshTree",
        ]
        const allVscodeCommands = await vscode.commands.getCommands(true)
        const registeredCommands = allVscodeCommands.filter((command) => command.startsWith("jutge-vscode"))
        assert.equal(registeredCommands.length, commands.length)
    })
})
