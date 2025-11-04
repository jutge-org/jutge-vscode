import fs, { existsSync } from "fs"
import * as vscode from "vscode"
import childProcess from "child_process"

import { getWorkspaceFolder, getWorkspaceFolderWithErrorMessage } from "@/extension"
import { StaticLogger } from "@/loggers"
import { CustomTestcase, Problem } from "@/types"
import {
    fileUriExists,
    findFirstAvailableNumberedFilename,
    getWorkingDirectory,
    sanitizeTitle,
    string2Uint8Array,
} from "@/utils"
import { readFile } from "fs/promises"
import { extname } from "path"
import { JutgeService } from "./jutge"
import {
    LanguageInfo,
    Proglang,
    chooseProgrammingLanguage,
    proglangInfoGet,
} from "./runners/languages"

const MAX_CUSTOM_TEXTCASES = 100 // FIXME(pauek): is this enough?? ;)

type HeaderInfo = {
    problem_id: string
    handler: string
    source_modifier: string
    compiler_id: string
    title: string
    date: Date
}

export class FileService extends StaticLogger {
    static makeHeader(langInfo: LanguageInfo, problem: Problem) {
        const { data: profile } = JutgeService.getProfileSWR()

        const handler = problem.handler?.handler || ""
        const source_modifier = problem.handler?.source_modifier || ""
        const compilers = problem.handler?.compilers

        let compiler_id = ""
        if (typeof compilers === "string") {
            compiler_id = compilers
        } else if (Array.isArray(compilers)) {
            compiler_id = compilers[0]
        } else {
            compiler_id = langInfo.compilers[0]
        }

        const comment = langInfo.commentPrefix
        return [
            `${comment} ${problem.title}\n`,
            `${comment} https://jutge.org/problems/${problem.problem_id}\n`,
            `${comment} ${problem.problem_id}:${handler}:${source_modifier}:${compiler_id}\n`,
            `${comment} Created on ${new Date().toLocaleString()} ${profile ? `by ${profile.name}` : ``}\n`,
            `\n`,
        ].join("")
    }

    private static async makeBodyStdNoMain_(
        langInfo: LanguageInfo,
        problemId: string
    ): Promise<Uint8Array<ArrayBufferLike>> {
        const findTemplate = async () => {
            const templateList = await JutgeService.getTemplateList(problemId)
            for (const template of templateList) {
                const ext = extname(template)
                if (langInfo.extensions.includes(ext)) {
                    return template
                }
            }
            return null
        }

        const template = await findTemplate()
        if (template === null) {
            throw new Error(`No template for language ${langInfo.proglang}`)
        }
        this.log.info(`Found template '${template}'`)

        const { data, name, type } = await JutgeService.getTemplate(problemId, template)

        this.log.info(
            `Got template '${template}': ${name} - ${type} (${data.constructor.name})`
        )

        return data
    }

    private static makeBodyStd_(langInfo: LanguageInfo): string {
        switch (langInfo.proglang) {
            case Proglang.CPP: {
                return `#include <iostream>\nusing namespace std;\n\nint main() {\n\n}\n`
            }
            default: {
                return ``
            }
        }
    }

    private static async makeBody(
        langInfo: LanguageInfo,
        problem: Problem
    ): Promise<Uint8Array<ArrayBufferLike>> {
        const { handler, problem_id: problemId } = problem
        if (handler === null) {
            throw new Error(`Problem ${problem.problem_id} does not have a handler!`)
        }
        switch (handler.handler) {
            case "std": {
                switch (handler.source_modifier) {
                    case "no_main": {
                        return this.makeBodyStdNoMain_(langInfo, problemId)
                    }
                    default: {
                        return string2Uint8Array(this.makeBodyStd_(langInfo))
                    }
                }
            }
            case "graphic": {
                return string2Uint8Array(this.makeBodyStd_(langInfo))
            }
            default: {
                throw new Error(`Handler '${handler}' not implemented yet`)
            }
        }
    }

    static makeSolutionFilename(problem: Problem, order: number, defaultExtension: string) {
        //
        // TODO(pauek): Make the ordering configurable, i.e. the user can choose if
        //   she/he wants to suffix every filename with its order in the list.
        //
        const prefix = order >= 0 ? `${String(order).padStart(2, "0")}_` : ``

        return `${prefix}${problem.problem_id}_${sanitizeTitle(problem.title)}${defaultExtension}`
    }

    static makeTestcaseFilename({ problem_id, title }: Problem, index: number = 1) {
        return `${problem_id}_${sanitizeTitle(title)}.test-${index}.inp`
    }

    static findFirstUnusedCustomTestcase(problem: Problem): vscode.Uri | null {
        const workspace = getWorkspaceFolderWithErrorMessage()
        if (!workspace) {
            return null
        }

        // Find out the first testcase which is not used yet
        let index = 1
        while (index <= MAX_CUSTOM_TEXTCASES) {
            const filename = this.makeTestcaseFilename(problem, index)
            const uri = vscode.Uri.joinPath(workspace.uri, filename)
            if (!existsSync(uri.fsPath)) {
                break
            }
            index++
        }
        if (index > MAX_CUSTOM_TEXTCASES) {
            return null
        }

        const filename = this.makeTestcaseFilename(problem, index)
        return vscode.Uri.joinPath(workspace.uri, filename)
    }

    static async createNewTestcaseFile(problem: Problem): Promise<vscode.Uri | undefined> {
        const workspace = getWorkspaceFolderWithErrorMessage()
        if (!workspace) {
            return
        }
        let fileUri = this.findFirstUnusedCustomTestcase(problem)
        if (!fileUri) {
            return
        }
        this.log.info(`New testcase filename: ${fileUri.fsPath}`)

        let fileContent = ""
        if (problem.testcases && problem.testcases.length > 0) {
            const testcase = problem.testcases[0]
            fileContent = Buffer.from(testcase.input_b64, "base64").toString("utf-8")
        }
        try {
            fs.writeFileSync(fileUri.fsPath, fileContent, { flag: "w" })
        } catch (error) {
            vscode.window.showErrorMessage(`Couldn't create file '${fileUri.fsPath}'`)
            throw error
        }
        return fileUri
    }

    static async loadCustomTestcases(problem: Problem): Promise<CustomTestcase[]> {
        const customTestcases: CustomTestcase[] = []

        const workspace = getWorkspaceFolder()
        if (!workspace) {
            return []
        }

        // FIXME(pauek): Do we need more than 5??
        for (let i = 1; i <= MAX_CUSTOM_TEXTCASES; i++) {
            const filename = this.makeTestcaseFilename(problem, i)
            const { fsPath } = vscode.Uri.joinPath(workspace.uri, filename)
            if (existsSync(fsPath)) {
                const fileContent = await readFile(fsPath)
                customTestcases.push({
                    input: fileContent.toString(),
                    index: i,
                })
            }
        }

        return customTestcases
    }

    static async createNewFileFor(
        problem: Problem,
        order: number
    ): Promise<vscode.Uri | undefined> {
        const proglang = await chooseProgrammingLanguage(problem.problem_nm)
        if (!proglang) {
            return
        }

        const langinfo = proglangInfoGet(proglang)
        const suggestedFilename = this.makeSolutionFilename(
            problem,
            order,
            langinfo.extensions[0]
        )

        const workspaceFolder = getWorkspaceFolderWithErrorMessage()
        if (!workspaceFolder) {
            return
        }

        let uri: vscode.Uri | undefined = vscode.Uri.joinPath(
            workspaceFolder.uri,
            suggestedFilename
        )

        if (fileUriExists(uri)) {
            //
            // NOTE(pauek): If the file already exists, we should suggest a different
            // filename so that the user doesn't overwrite the file by chance.
            // This is what addParenthesizedNumberToPath does.
            //
            const suggestedUri = vscode.Uri.from({
                scheme: uri.scheme,
                authority: uri.authority,
                fragment: uri.fragment,
                query: uri.query,
                path: findFirstAvailableNumberedFilename(uri.path),
            })

            uri = await vscode.window.showSaveDialog({
                defaultUri: suggestedUri,
                filters: { "All files": ["*"] },
                saveLabel: "Create",
                title: `Create new file for ${problem.title}`,
            })
            if (!uri) {
                // Cancelled
                return
            }
        }

        try {
            const fileHeader = string2Uint8Array(this.makeHeader(langinfo, problem))
            const fileBody = await this.makeBody(langinfo, problem)
            const fileContent = new Uint8Array([...fileHeader, ...fileBody])

            await vscode.workspace.fs.writeFile(uri, fileContent)
            //
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to create file in ${uri.fsPath} `)
            throw error
        }
        return uri
    }

    static _r3rd = /^\/\/ ([A-Z][0-9]{5}_(?:ca|en|es|fr|de)):([a-z]*):([a-z]*):(.*)$/
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
            this.log.info(`Third line = ${match3[1]}:${match3[2]}:${match3[3]}:${match3[4]}`)
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

    static readonly rmseRegex = /^[0-9.]+ \(([0-9.]+)\)$/

    static async compareImages(imgPath1: string, imgPath2: string): Promise<number | null> {
        const workingDir = getWorkingDirectory(imgPath1)

        const result = childProcess.spawnSync(
            "compare",
            ["-metric", "RMSE", imgPath1, imgPath2, "NULL:"],
            { cwd: workingDir }
        )

        const hasErrors = result.error || result.signal

        if (hasErrors) {
            const msg = `Error launching 'compare' with images '${imgPath1}' and '${imgPath2}': ${result.stderr.toString("utf-8")}`
            this.log.debug(msg)
            vscode.window.showErrorMessage(msg)
            return null
        }

        const compareResult = result.stderr.toString()
        const match = compareResult.match(this.rmseRegex)
        if (!match) {
            const msg = `Could not parse 'compare' output: ${compareResult}`
            this.log.error(msg)
            vscode.window.showErrorMessage(`Could not compare images`)
            return null
        }

        const rmse = Number(match[1])
        return rmse
    }
}
