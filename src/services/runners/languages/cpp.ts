import { ConfigService } from "@/services/config"
import { TerminalService } from "@/services/terminal"
import { getWorkingDirectory, Logger } from "@/utils"
import * as childProcess from "child_process"
import * as path from "path"
import * as vscode from "vscode"
import { handleCompilationErrors, handleRuntimeErrors } from "../errors"
import { LanguageRunner } from "../languages"

export class CppRunner extends Logger implements LanguageRunner {
    compile(codePath: string, binaryPath: string, document: vscode.TextDocument): void {
        this.log.debug(`Compiling: ${codePath}`)
        const command = ConfigService.getCppCommand()
        const flags = ConfigService.getCppFlags()
        const workingDir = getWorkingDirectory(codePath)

        // First compile via spawnSync to check for errors
        const result = childProcess.spawnSync(
            command,
            [codePath, "-o", binaryPath, ...flags],
            { cwd: workingDir }
        )

        // Check if there are compilation errors
        const hasErrors =
            result.error ||
            (result.stderr && result.stderr.length > 0) ||
            result.signal ||
            result.status !== 0

        // Only execute in terminal if there are errors
        if (hasErrors) {
            this.log.debug(`Compilation errors detected, showing in terminal`)
            TerminalService.executeCommand(
                command,
                [codePath, "-o", binaryPath, ...flags],
                true
            )
        }

        // Handle compilation errors for diagnostics
        handleCompilationErrors(result, document)
    }

    run(codePath: string, input: string, document: vscode.TextDocument): string {
        this.log.debug(`Running: ${codePath}`)
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
            result.error ||
            (result.stderr && result.stderr.length > 0) ||
            result.signal ||
            result.status !== 0

        // Only execute in terminal if there are errors
        if (hasErrors) {
            this.log.debug(`Runtime errors detected, showing in terminal`)
            TerminalService.executeCommand(`./${binaryName}`, [], true, input)
        }

        // Handle runtime errors for diagnostics
        handleRuntimeErrors(result, document)

        if (!result.stdout) {
            throw new Error(`No output from execution`)
        }
        this.log.debug(`Execution completed successfully`)
        return result.stdout.toString()
    }
}
