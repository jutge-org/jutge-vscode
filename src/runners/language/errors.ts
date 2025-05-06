import { SpawnSyncReturns } from "node:child_process"
import * as vscode from "vscode"

// Create diagnostic collections at the module level
const runtimeDiagnosticCollection = vscode.languages.createDiagnosticCollection("jutge-runtime")
const compileDiagnosticCollection = vscode.languages.createDiagnosticCollection("jutge-compile")

/**
 * Creates a diagnostic with the appropriate severity and range
 */
export function createDiagnostic(
    message: string,
    document: vscode.TextDocument,
    lineNumber: number
): vscode.Diagnostic {
    const line = document.lineAt(Math.min(lineNumber, document.lineCount - 1))
    const range = line.range

    return new vscode.Diagnostic(range, message, vscode.DiagnosticSeverity.Error)
}

/**
 * Handles errors that occur during the **compilation** of a process.
 * Similar to `handleRuntimeErrors`, but does not throw if stderr is not empty.
 * For more information, see `childProcess.spawnSync()` docs.
 *
 * @param result The result of the process execution.
 * @throws Error if any error is found.
 */
export function handleCompilationErrors(result: SpawnSyncReturns<Buffer>, document: vscode.TextDocument) {
    const diagnostics: vscode.Diagnostic[] = []

    // Try to parse stderr for line numbers if available
    // GCC/G++ error format: <file>:<line>:<column>: error: <message>
    const errorRegex = /.*:(\d+):(?:\d+:)?\s*(.*)/

    if (result.stderr.length > 0) {
        const stderrLines = result.stderr.toString().split("\n")
        console.error(`[Compilation Error] ${result.stderr.toString()}`)

        for (const line of stderrLines) {
            const match = line.match(errorRegex)
            if (match) {
                // We found a line number in the error
                const [_, lineNum, errorMessage] = match
                const lineNumber = parseInt(lineNum) - 1 // Convert to 0-based
                diagnostics.push(createDiagnostic(errorMessage, document, lineNumber))
            } else if (line.trim()) {
                // No line number found, add as a file-level error
                diagnostics.push(createDiagnostic(line, document, 0))
            }
        }
    }

    if (result.error) {
        console.error(`[Compilation Error] ${result.error.toString()}`)
        diagnostics.push(createDiagnostic(result.error.toString(), document, 0))
    }

    if (result.signal) {
        const message = `Process killed by the OS with signal ${result.signal}.`
        console.error(`[Compilation Error] ${message}`)
        diagnostics.push(createDiagnostic(message, document, 0))
    }

    // Set or clear diagnostics
    if (diagnostics.length > 0) {
        compileDiagnosticCollection.set(document.uri, diagnostics)

        throw Error(`Compilation Failed: ${result.stderr.toString()}`)
    } else {
        compileDiagnosticCollection.delete(document.uri)
    }
}

/**
 * Handles errors that occur during the **runtime execution** of a process.
 * For more information, see `childProcess.spawnSync()` docs.
 *
 * @param result The result of the process execution.
 * @param document The document where the diagnostics should be shown
 */
export function handleRuntimeErrors(result: SpawnSyncReturns<Buffer>, document: vscode.TextDocument) {
    const diagnostics: vscode.Diagnostic[] = []

    // Try to parse stderr for line numbers if available
    const errorRegex = /.*:(\d+):(?:\d+:)?\s*(.*)/

    if (result.error) {
        let message = result.error.toString()
        if (result.error.toString().includes("ETIMEDOUT")) {
            message = `Execution timed out.\nIf you think this is a mistake, please increase the timeout time in the settings.`
        }
        console.error(`[Runtime Error] ${message}`)
        // Add as a file-level error
        diagnostics.push(createDiagnostic(message, document, 0))
    }

    if (result.stderr.length > 0) {
        const stderrLines = result.stderr.toString().split("\n")
        console.error(`[Runtime Error] ${result.stderr.toString()}`)

        for (const line of stderrLines) {
            const match = line.match(errorRegex)
            if (match) {
                // We found a line number in the error
                const [_, lineNum, errorMessage] = match
                const lineNumber = parseInt(lineNum) - 1 // Convert to 0-based
                diagnostics.push(createDiagnostic(errorMessage, document, lineNumber))
            } else if (line.trim()) {
                // No line number found, add as a file-level error
                diagnostics.push(createDiagnostic(line, document, 0))
            }
        }
    }

    if (result.signal) {
        const message = `Process killed by the OS with signal ${result.signal}.`
        console.error(`[Runtime Error] ${message}`)
        diagnostics.push(createDiagnostic(message, document, 0))
    }

    if (result.status !== 0 && diagnostics.length === 0) {
        // Only add exit code if we haven't found any other errors
        const message = `Process exited with code ${result.status}.`
        console.error(`[Runtime Error] ${message}`)
        diagnostics.push(createDiagnostic(message, document, 0))
    }

    // Set or clear diagnostics
    if (diagnostics.length > 0) {
        runtimeDiagnosticCollection.set(document.uri, diagnostics)
    } else {
        runtimeDiagnosticCollection.delete(document.uri)
    }
}
