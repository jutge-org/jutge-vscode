import * as vscode from "vscode"

export const channel = vscode.window.createOutputChannel("jutge-vscode: errors")

export const channelAddLineAndShow = (line: string) => {
    channel.appendLine(line)
    channel.show()
}
