import * as vscode from "vscode"
import * as fs from "fs"
import * as path from "path"
import * as os from "os"
import * as childProcess from "child_process"

export class TerminalService {
    private static terminal: vscode.Terminal | undefined
    private static tempFiles: Set<string> = new Set()

    /**
     * Gets or creates a terminal for running tests
     */
    public static getTerminal(): vscode.Terminal {
        if (!this.terminal || this.terminal.exitStatus !== undefined) {
            this.terminal = vscode.window.createTerminal("Jutge Tests")
        }
        return this.terminal
    }

    /**
     * Escapes a string for safe use in shell commands
     * @param str The string to escape
     */
    private static escapeShellString(str: string): string {
        // Replace backslashes first (important to do this first)
        let escaped = str.replace(/\\/g, "\\\\")

        // Then handle other special characters
        escaped = escaped.replace(/(["`$!&*()\[\]{}|;'<>?])/g, "\\$1")

        // Handle spaces by wrapping in quotes if not already escaped
        if (escaped.includes(" ") && !escaped.startsWith('"') && !escaped.endsWith('"')) {
            escaped = `"${escaped}"`
        }

        return escaped
    }

    /**
     * Creates a temporary file with the given content
     * @param content The content to write to the file
     * @param prefix Optional file name prefix
     * @returns The path to the created temporary file
     */
    private static createTempFile(content: string, prefix: string = "jutge-input-"): string {
        const tmpDir = os.tmpdir()
        const tmpFileName = `${prefix}${Date.now()}.txt`
        const tmpFilePath = path.join(tmpDir, tmpFileName)

        fs.writeFileSync(tmpFilePath, content, { encoding: "utf8" })
        console.debug(`[Terminal] Created temp file: ${tmpFilePath}`)

        // Track this file for cleanup
        this.tempFiles.add(tmpFilePath)

        return tmpFilePath
    }

    /**
     * Cleans up a temporary file
     * @param filePath Path to the temporary file
     */
    private static cleanupTempFile(filePath: string): void {
        // Use try-catch to prevent errors from stopping execution
        try {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath)
                console.debug(`[Terminal] Removed temp file: ${filePath}`)
            }
            this.tempFiles.delete(filePath)
        } catch (error) {
            console.error(`[Terminal] Error removing temp file ${filePath}: ${error}`)
        }
    }

    /**
     * Executes a command in the terminal
     * @param command The command to execute
     * @param args The arguments for the command
     * @param cwd The working directory (optional)
     * @param showTerminal Whether to show the terminal (default: false)
     * @param input Optional input to provide to the command
     */
    public static executeCommand(command: string, args: string[], showTerminal: boolean = false, input?: string): void {
        const terminal = this.getTerminal()

        // Only show terminal if specifically requested
        if (showTerminal) {
            terminal.show(true)
        }

        // Escape the command
        const escapedCommand = this.escapeShellString(command)

        // Escape each argument
        const escapedArgs = args.map((arg) => this.escapeShellString(arg))

        let fullCommand: string
        let tmpFilePath: string | null = null

        // If input is provided, create a temporary file and redirect it to the command
        if (input !== undefined) {
            tmpFilePath = this.createTempFile(input)
            const escapedTmpPath = this.escapeShellString(tmpFilePath)

            // Build command with input redirection
            fullCommand = `${escapedCommand} ${escapedArgs.join(" ")} < ${escapedTmpPath}`

            // Schedule cleanup after execution
            setTimeout(() => {
                this.cleanupTempFile(tmpFilePath!)
            }, 5000) // Give it 5 seconds to ensure the command has completed
        } else {
            // Execute without input redirection
            fullCommand = `${escapedCommand} ${escapedArgs.join(" ")}`
        }

        // Execute the command
        terminal.sendText(fullCommand, true)
        console.debug(`[Terminal] Executing: ${fullCommand}`)
    }

    /**
     * Clears the terminal
     */
    public static clearTerminal(): void {
        const terminal = this.getTerminal()
        terminal.sendText("clear", true)
    }

    /**
     * Cleanup all tracked temporary files
     * Should be called when extension is deactivated
     */
    public static cleanupAllTempFiles(): void {
        for (const file of this.tempFiles) {
            this.cleanupTempFile(file)
        }
    }
}
