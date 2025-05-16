import { ConfigService } from "@/services/config"
import { TerminalService } from "@/services/terminal"
import { getWorkingDirectory } from "@/utils"
import * as childProcess from "child_process"
import * as vscode from "vscode"
import { LanguageRunner } from "./runner"
import { handleRuntimeErrors } from "./errors"

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
            // Pass the input to executeCommand
            TerminalService.executeCommand(command, [...flags, codePath], true, input)
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
