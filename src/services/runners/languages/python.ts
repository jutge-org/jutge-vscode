import { Logger } from "@/loggers"
import { ConfigService } from "@/services/config"
import { TerminalService } from "@/services/terminal"
import { getExtensionDirectory, getWorkingDirectory } from "@/utils"
import * as childProcess from "child_process"
import * as vscode from "vscode"
import { copyFileSync } from "fs"
import { handleRuntimeErrors } from "../errors"
import { LanguageRunner } from "../languages"
import { getContext } from "@/extension"
import { join } from "path"

export class PythonRunner extends Logger implements LanguageRunner {
    run(codePath: string, input: string, document: vscode.TextDocument): string {
        this.log.debug(`Running code: ${codePath}`)

        const command = ConfigService.getPythonCommand()
        const flags = ConfigService.getPythonFlags()
        const extensionDir = getExtensionDirectory()
        const workingDir = getWorkingDirectory(codePath)

        // Copy the turtle.py file in case the problem is of type `graphic`
        // NOTE(pauek): This is wasteful, we should only copy the file if the python program has an import with `turtle`
        // FIXME: Only copy the `turtle.py` file if the problem is graphic and involves the `turtle` package
        // FIXME: Create a temporary directory not to pollute the user's directory with `turtle.py`
        const turtlePySourcePath = join(extensionDir, "resources", "turtle.py")
        const turtlePyDestPath = join(workingDir, "turtle.py")
        copyFileSync(turtlePySourcePath, turtlePyDestPath)

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
