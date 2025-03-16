import * as vscode from "vscode"
import * as path from "path"

export class TerminalService {
    private static terminal: vscode.Terminal | undefined

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
     * Executes a command in the terminal
     * @param command The command to execute
     * @param args The arguments for the command
     * @param cwd The working directory (optional)
     */
    public static executeCommand(command: string, args: string[], cwd?: string): void {
        const terminal = this.getTerminal()
        terminal.show(true)

        const escapedCommand = this.escapeShellString(command)
        const escapedArgs = args.map((arg) => this.escapeShellString(arg))
        terminal.sendText(`${escapedCommand} ${escapedArgs.join(" ")}`, true)
        console.log(`Executing command: ${escapedCommand} ${escapedArgs.join(" ")}`)
    }

    /**
     * Clears the terminal
     */
    public static clearTerminal(): void {
        const terminal = this.getTerminal()
        // terminal.sendText("clear", true)
    }
}
