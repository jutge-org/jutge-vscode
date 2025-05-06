import { ConfigService } from "@/services/ConfigService"
import { TerminalService } from "@/services/TerminalService"
import { getWorkingDirectory } from "@/utils/helpers"
import * as childProcess from "child_process"
import * as path from "path"
import * as vscode from "vscode"
import { handleCompilationErrors, handleRuntimeErrors } from "./errors"
import { LanguageRunner } from "./runner"

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
            TerminalService.executeCommand(command, [codePath, "-o", binaryPath, ...flags], true)
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

        const binaryName = path.basename(binaryPath)
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
            TerminalService.executeCommand(`./${binaryName}`, [], true, input)
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
