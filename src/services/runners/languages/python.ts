import { Logger } from "@/loggers"
import { ConfigService } from "@/services/config"
import { TerminalService } from "@/services/terminal"
import { getWorkingDirectory } from "@/utils"
import * as childProcess from "child_process"
import * as vscode from "vscode"
import { handleRuntimeErrors } from "../errors"
import { LanguageRunner } from "../languages"

export class PythonRunner extends Logger implements LanguageRunner {
    run(codePath: string, input: string, document: vscode.TextDocument): string {
        this.log.debug(`Running code: ${codePath}`)
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
            result.error ||
            (result.stderr && result.stderr.length > 0) ||
            result.signal ||
            result.status !== 0

        // Only execute in terminal if there are errors
        if (hasErrors) {
            this.log.debug(`Errors detected, showing in terminal`)
            // Pass the input to executeCommand
            TerminalService.executeCommand(command, [...flags, codePath], true, input)
        }

        // Handle errors for diagnostics
        handleRuntimeErrors(result, document)

        if (!result.stdout) {
            this.log.debug(`No output from execution`)
            throw new Error(`No output from execution`)
        }

        this.log.debug(`Execution completed successfully`)
        return result.stdout.toString()
    }
}
