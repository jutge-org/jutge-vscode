import * as assert from "assert"
import * as vscode from "vscode"

/**
 * Setup (`beforeEach`) function for integration tests that need Cody configured and activated.
 */
export async function beforeIntegrationTest(): Promise<void> {
    // Wait for extension to become ready.
    const api = vscode.extensions.getExtension("jutge.jutge-vscode")
    assert.ok(api, "Extension not found")

    await api?.activate()

    // Wait for extension to become activated.
    await new Promise((resolve) => setTimeout(resolve, 200))
}
