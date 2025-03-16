import * as childProcess from "child_process"
import * as vscode from "vscode"
import { channel } from "@/utils/channel"
import { Language } from "@/utils/types"
import { getWorkingDirectory } from "@/utils/helpers"
import { ConfigService } from "@/services/ConfigService"
import { TerminalService } from "@/services/TerminalService"
import * as path from "path"

export interface LanguageRunner {
    run(codePath: string, input: string, document: vscode.TextDocument): string | null
}

export class PythonRunner implements LanguageRunner {
    run(codePath: string, input: string, document: vscode.TextDocument): string | null {
        const command = ConfigService.getPythonCommand()
        const flags = ConfigService.getPythonFlags()
        const workingDir = getWorkingDirectory(codePath)

        TerminalService.executeCommand(command, [...flags, codePath], workingDir)

        // Also run the command via spawnSync to capture the output for our logic
        const result = childProcess.spawnSync(command, [...flags, codePath], {
            input,
            timeout: 5000,
            cwd: workingDir,
        })

        // We don't need to show the errors in terminal separately since the
        // terminal execution already shows them, but we still need to handle them
        handleRuntimeErrors(result, document)

        if (result.stdout) {
            return result.stdout.toString()
        }

        return null // no output
    }
}

export class CppRunner implements LanguageRunner {
    compile(codePath: string, binaryPath: string, document: vscode.TextDocument): void {
        const command = ConfigService.getCppCommand()
        const flags = ConfigService.getCppFlags()
        const workingDir = getWorkingDirectory(codePath)

        // Execute the compilation command in the terminal
        TerminalService.executeCommand(command, [codePath, "-o", binaryPath, ...flags], workingDir)

        // Also compile via spawnSync to check for errors
        const result = childProcess.spawnSync(command, [codePath, "-o", binaryPath, ...flags], {
            cwd: workingDir,
        })

        // Still need to handle compilation errors for our diagnostics
        handleCompilationErrors(result, document)
    }

    run(codePath: string, input: string, document: vscode.TextDocument): string | null {
        const binaryPath = codePath + ".out"
        const workingDir = getWorkingDirectory(codePath)

        // Compile first
        this.compile(codePath, binaryPath, document)

        // Get the binary path relative to working directory for execution
        const binaryName = path.basename(binaryPath)

        // For binary execution, ensure we handle paths with special characters
        // Use ./ prefix for executable in current directory
        TerminalService.executeCommand(`./${binaryName}`, [], workingDir)

        // Run via spawnSync to capture output for our logic
        const result = childProcess.spawnSync(binaryPath, [], {
            input,
            timeout: 5000,
            cwd: workingDir,
        })

        // Handle runtime errors for diagnostics
        handleRuntimeErrors(result, document)

        if (result.stdout) {
            return result.stdout.toString()
        }
        return null
    }
}

export function getLangIdFromFilePath(filePath: string): Language {
    const extension = filePath.split(".").pop()
    switch (extension) {
        case "py":
            return Language.PYTHON
        case "cc":
        case "cpp":
            return Language.CPP
        default:
            vscode.window.showErrorMessage("Language not supported.")
            throw new Error("Language not supported.")
    }
}

export function getDefaultExtensionFromLangId(languageId: Language): string {
    switch (languageId) {
        case Language.PYTHON:
            return "py"
        case Language.CPP:
            return "cc"
        default:
            vscode.window.showErrorMessage("Language not supported.")
            throw new Error("Language not supported.")
    }
}

export function getLangRunnerFromLangId(languageId: Language): LanguageRunner {
    // NOTE: Not sure if vscode has native functionality to detect the language of a file.
    switch (languageId) {
        case Language.PYTHON:
            return new PythonRunner()
        case Language.CPP:
            return new CppRunner()
        default:
            vscode.window.showErrorMessage("Language not supported.")
            throw new Error("Language not supported.")
    }
}

// Create diagnostic collections at the module level
const runtimeDiagnosticCollection = vscode.languages.createDiagnosticCollection("jutge-runtime")
const compileDiagnosticCollection = vscode.languages.createDiagnosticCollection("jutge-compile")

/**
 * Handles errors that occur during the **runtime execution** of a process.
 * For more information, see `childProcess.spawnSync()` docs.
 *
 * @param result The result of the process execution.
 * @param document The document where the diagnostics should be shown
 */
function handleRuntimeErrors(result: childProcess.SpawnSyncReturns<Buffer>, document: vscode.TextDocument) {
    const diagnostics: vscode.Diagnostic[] = []

    // Try to parse stderr for line numbers if available
    const errorRegex = /.*:(\d+):(?:\d+:)?\s*(.*)/

    if (result.error) {
        let message = result.error.toString()
        if (result.error.toString().includes("ETIMEDOUT")) {
            message = `Execution timed out.\nIf you think this is a mistake, please increase the timeout time in the settings.`
        }
        // Add as a file-level error
        diagnostics.push(createDiagnostic(message, document, 0))
    }

    if (result.stderr.length > 0) {
        const stderrLines = result.stderr.toString().split("\n")

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
        diagnostics.push(createDiagnostic(message, document, 0))
    }

    if (result.status !== 0 && diagnostics.length === 0) {
        // Only add exit code if we haven't found any other errors
        const message = `Process exited with code ${result.status}.`
        diagnostics.push(createDiagnostic(message, document, 0))
    }

    // Set or clear diagnostics
    if (diagnostics.length > 0) {
        runtimeDiagnosticCollection.set(document.uri, diagnostics)
    } else {
        runtimeDiagnosticCollection.delete(document.uri)
    }
}

/**
 * Creates a diagnostic with the appropriate severity and range
 */

function createDiagnostic(message: string, document: vscode.TextDocument, lineNumber: number): vscode.Diagnostic {
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
function handleCompilationErrors(result: childProcess.SpawnSyncReturns<Buffer>, document: vscode.TextDocument) {
    const diagnostics: vscode.Diagnostic[] = []

    // Try to parse stderr for line numbers if available
    // GCC/G++ error format: <file>:<line>:<column>: error: <message>
    const errorRegex = /.*:(\d+):(?:\d+:)?\s*(.*)/

    if (result.stderr.length > 0) {
        const stderrLines = result.stderr.toString().split("\n")
        channel.appendLine(result.stderr.toString()) // Keep logging to channel for reference

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
        diagnostics.push(createDiagnostic(result.error.toString(), document, 0))
    }

    if (result.signal) {
        const message = `Process killed by the OS with signal ${result.signal}.`
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
