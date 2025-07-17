import fs from "fs"
import * as vscode from "vscode"

import { Problem } from "@/types"
import { StaticLogger, sanitizeTitle } from "@/utils"
import { JutgeService } from "./jutge"
import { chooseProgrammingLanguage, infoForProglang, Proglang } from "./runners/languages"
import { readFile } from "fs/promises"

type HeaderInfo = {
    problem_id: string
    handler: string
    source_modifier: string
    compiler_id: string
    title: string
    date: Date
}

export class FileService extends StaticLogger {
    static async createNewFileFor(problem: Problem): Promise<vscode.Uri | undefined> {
        const proglang = await chooseProgrammingLanguage(problem.problem_nm)
        if (!proglang) {
            return
        }

        const langInfo = infoForProglang(proglang)
        const sanitizedTitle = sanitizeTitle(problem.title)
        const defaultExtension = langInfo.extensions[0]

        const suggestedFileName = `${problem.problem_id}_${sanitizedTitle}.${defaultExtension}`
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0]
        if (!workspaceFolder) {
            vscode.window.showErrorMessage("No workspace folder open.")
            return
        }

        const uri = await vscode.window.showSaveDialog({
            defaultUri: vscode.Uri.joinPath(workspaceFolder.uri, suggestedFileName),
            filters: {
                "All files": ["*"],
            },
            saveLabel: "Create",
            title: `Create new file for ${problem.title}`,
        })
        if (!uri) {
            return
        }

        // TODO: If extension is changed by user in the save dialog, update fileLang?
        const comment = langInfo.commentPrefix

        const profileRes = JutgeService.getProfileSWR()
        const profile = profileRes.data

        const handler = problem.handler?.handler || ""
        const source_modifier = problem.handler?.source_modifier || ""
        const compilers = problem.handler?.compilers
        let compiler_id = ""
        if (Array.isArray(compilers)) {
            compiler_id = compilers[0]
        } else if (typeof compilers === "string") {
            compiler_id = compilers
        }

        const fileHeader = [
            `${comment} ${problem.title}\n`,
            `${comment} https://jutge.org/problems/${problem.problem_id}\n`,
            `${comment} ${problem.problem_id}:${handler}:${source_modifier}:${compiler_id}\n`,
            `${comment} Created on ${new Date().toLocaleString()} ${profile ? `by ${profile.name}` : ``}\n`,
            `\n`,
        ].join("")

        let body = ""
        if (proglang === Proglang.CPP) {
            body = `#include <iostream>\nusing namespace std;\n\nint main() {\n\n}\n`
        }

        try {
            fs.writeFileSync(uri.fsPath, fileHeader + body, { flag: "w" })
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to create file in ${uri.fsPath} `)
            throw error
        }
        return uri
    }

    static _r3rd = /^\/\/ ([A-Z][0-9]{5}_(?:ca|en|es|fr|de)):([a-z]*):([a-z]*):(\w*)$/
    static _r4th = /^\/\/ Created on (\d{2}\/\d{2}\/\d{4}), (\d{2}:\d{2}:\d{2}) by .*$/

    static async parseFileHeader(filePath: string): Promise<HeaderInfo> {
        const buffer = await readFile(filePath)
        const code = buffer.toString()
        const [first, _, third, fourth] = code.split(`\n`).slice(0, 4)

        let result: HeaderInfo = {
            problem_id: "",
            handler: "",
            source_modifier: "",
            compiler_id: "",
            title: "",
            date: new Date(0),
        }

        result.title = first.slice(3)
        this.log.info(`Title = ${result.title}`)

        const match3 = third.match(this._r3rd)
        if (match3) {
            this.log.info(
                `Third line = ${match3[1]}:${match3[2]}:${match3[3]}:${match3[4]}`
            )
            result.problem_id = match3[1]
            result.handler = match3[2]
            result.source_modifier = match3[3]
            result.compiler_id = match3[4]
        }

        const match4 = fourth.match(this._r4th)
        if (match4) {
            this.log.info(`Date = ${match4[1]} - ${match4[2]}`)
            result.date = new Date(`${match4[1]} ${match4[2]}`)
        }

        return result
    }
}
