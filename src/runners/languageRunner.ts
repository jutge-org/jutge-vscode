import * as childProcess from "child_process"
import * as vscode from "vscode"
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
        console.debug(`[PythonRunner] Running code: ${codePath}`)
        const command = ConfigService.getPythonCommand()
        const flags = ConfigService.getPythonFlags()
        const workingDir = getWorkingDirectory(codePath)

        // First run via spawnSync to check for errors
        const result = childProcess.spawnSync(command, [...flags, codePath], {
            input,
            timeout: 5000,
            cwd: workingDir,
        })

        // Check if there are errors
        const hasErrors =
            result.error || (result.stderr && result.stderr.length > 0) || result.signal || result.status !== 0

        // Only execute in terminal if there are errors
        if (hasErrors) {
            console.debug(`[PythonRunner] Errors detected, showing in terminal`)
            // TerminalService.clearTerminal()
            TerminalService.executeCommand(command, [...flags, codePath], workingDir, true)
        }

        // Handle errors for diagnostics
        handleRuntimeErrors(result, document)

        if (result.stdout) {
            console.debug(`[PythonRunner] Execution completed successfully`)
            return result.stdout.toString()
        }

        console.debug(`[PythonRunner] No output from execution`)
        return null // no output
    }
}

export class CppRunner implements LanguageRunner {
    compile(codePath: string, binaryPath: string, document: vscode.TextDocument): void {
        console.debug(`[CppRunner] Compiling: ${codePath}`)
        const command = ConfigService.getCppCommand()
        const flags = ConfigService.getCppFlags()
        const workingDir = getWorkingDirectory(codePath)

        // First compile via spawnSync to check for errors
        const result = childProcess.spawnSync(command, [codePath, "-o", binaryPath, ...flags], {
            cwd: workingDir,
        })

        // Check if there are compilation errors
        const hasErrors =
            result.error || (result.stderr && result.stderr.length > 0) || result.signal || result.status !== 0

        // Only execute in terminal if there are errors
        if (hasErrors) {
            console.debug(`[CppRunner] Compilation errors detected, showing in terminal`)
            // TerminalService.clearTerminal()
            TerminalService.executeCommand(command, [codePath, "-o", binaryPath, ...flags], workingDir, true)
        }

        // Handle compilation errors for diagnostics
        handleCompilationErrors(result, document)
    }

    run(codePath: string, input: string, document: vscode.TextDocument): string | null {
        console.debug(`[CppRunner] Running: ${codePath}`)
        const binaryPath = codePath + ".out"
        const workingDir = getWorkingDirectory(codePath)

        // Compile first - this will show terminal if compile errors
        this.compile(codePath, binaryPath, document)

        // Get the binary path relative to working directory for execution
        const binaryName = path.basename(binaryPath)

        // Run via spawnSync to check for runtime errors
        const result = childProcess.spawnSync(binaryPath, [], {
            input,
            timeout: 5000,
            cwd: workingDir,
        })

        // Check if there are runtime errors
        const hasErrors =
            result.error || (result.stderr && result.stderr.length > 0) || result.signal || result.status !== 0

        // Only execute in terminal if there are errors
        if (hasErrors) {
            console.debug(`[CppRunner] Runtime errors detected, showing in terminal`)
            // If we already showed the terminal for compile errors,
            // no need to clear it again
            TerminalService.executeCommand(`./${binaryName}`, [], workingDir, true)
        }

        // Handle runtime errors for diagnostics
        handleRuntimeErrors(result, document)

        if (result.stdout) {
            console.debug(`[CppRunner] Execution completed successfully`)
            return result.stdout.toString()
        }
        console.debug(`[CppRunner] No output from execution`)
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
