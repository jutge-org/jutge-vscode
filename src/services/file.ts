import fs, { existsSync } from "fs"
import * as vscode from "vscode"

import { getWorkspaceFolder } from "@/extension"
import { CustomTestcase, Problem } from "@/types"
import { sanitizeTitle } from "@/utils"
import { readFile } from "fs/promises"
import { JutgeService } from "./jutge"
import { Proglang, chooseProgrammingLanguage, proglangInfoGet } from "./runners/languages"
import { StaticLogger } from "@/loggers"

type HeaderInfo = {
    problem_id: string
    handler: string
    source_modifier: string
    compiler_id: string
    title: string
    date: Date
}

export class FileService extends StaticLogger {
    static makeHeader(comment: string, problem: Problem) {
        const { data: profile } = JutgeService.getProfileSWR()

        const handler = problem.handler?.handler || ""
        const source_modifier = problem.handler?.source_modifier || ""
        const compilers = problem.handler?.compilers

        let compiler_id = ""
        if (Array.isArray(compilers)) {
            compiler_id = compilers[0]
        } else if (typeof compilers === "string") {
            compiler_id = compilers
        }

        return [
            `${comment} ${problem.title}\n`,
            `${comment} https://jutge.org/problems/${problem.problem_id}\n`,
            `${comment} ${problem.problem_id}:${handler}:${source_modifier}:${compiler_id}\n`,
            `${comment} Created on ${new Date().toLocaleString()} ${profile ? `by ${profile.name}` : ``}\n`,
            `\n`,
        ].join("")
    }

    static makeBody(proglang: Proglang) {
        switch (proglang) {
            case Proglang.CPP:
                return `#include <iostream>\nusing namespace std;\n\nint main() {\n\n}\n`
            default:
                return ``
        }
    }

    static makeSolutionFilename(problem: Problem, defaultExtension: string) {
        return `${problem.problem_id}_${sanitizeTitle(problem.title)}${defaultExtension}`
    }

    static makeTestcaseFilename({ problem_id, title }: Problem, index: number = 1) {
        return `${problem_id}_${sanitizeTitle(title)}.test-${index}.inp`
    }

    static async createNewTestcaseFile(
        problem: Problem
    ): Promise<vscode.Uri | undefined> {
        const workspace = getWorkspaceFolder()
        if (!workspace) {
            return
        }

        const filename = this.makeTestcaseFilename(problem)

        let fileContent = ""
        if (problem.testcases) {
            const testcase = problem.testcases[0]
            fileContent = Buffer.from(testcase.input_b64, "base64").toString("utf-8")
        }

        const uri = vscode.Uri.joinPath(workspace.uri, filename)
        try {
            fs.writeFileSync(uri.fsPath, fileContent, { flag: "w" })
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to create file in ${uri.fsPath} `)
            throw error
        }
        return uri
    }

    static async loadCustomTestcases(problem: Problem): Promise<CustomTestcase[]> {
        const customTestcases: CustomTestcase[] = []

        const workspace = getWorkspaceFolder()
        if (!workspace) {
            return []
        }

        // FIXME(pauek): Do we need more than 5??
        for (let i = 1; i <= 5; i++) {
            const filename = this.makeTestcaseFilename(problem, i)
            const { fsPath } = vscode.Uri.joinPath(workspace.uri, filename)
            if (existsSync(fsPath)) {
                const fileContent = await readFile(fsPath)
                customTestcases.push({
                    input: fileContent.toString(),
                    name: `Custom Testcase ${i}`,
                })
            }
        }

        return customTestcases
    }

    static async createNewFileFor(problem: Problem): Promise<vscode.Uri | undefined> {
        const proglang = await chooseProgrammingLanguage(problem.problem_nm)
        if (!proglang) {
            return
        }

        const { commentPrefix, extensions } = proglangInfoGet(proglang)
        const suggestedFilename = this.makeSolutionFilename(problem, extensions[0])

        const workspaceFolder = getWorkspaceFolder()
        if (!workspaceFolder) {
            return
        }

        const uri = await vscode.window.showSaveDialog({
            defaultUri: vscode.Uri.joinPath(workspaceFolder.uri, suggestedFilename),
            filters: { "All files": ["*"] },
            saveLabel: "Create",
            title: `Create new file for ${problem.title}`,
        })
        if (!uri) {
            return
        }

        const fileHeader = this.makeHeader(commentPrefix, problem)
        const fileBody = this.makeBody(proglang)
        const fileContent = fileHeader + fileBody

        try {
            fs.writeFileSync(uri.fsPath, fileContent, { flag: "w" })
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
