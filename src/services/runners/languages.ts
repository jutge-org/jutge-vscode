import * as vscode from "vscode"
import { CppRunner } from "./languages/cpp"
import { PythonRunner } from "./languages/python"
import { basename, extname } from "path"
import { GHCRunner } from "./languages/ghc"

export enum Proglang {
    CPP = "C++",
    PYTHON = "Python",
    GHC = "GHC", // Haskell
}
export interface LanguageRunner {
    run(codePath: string, input: string, document: vscode.TextDocument): string
}

export type LanguageInfo = {
    proglang: Proglang
    runner: LanguageRunner
    extensions: string[]
    commentPrefix: string
    mimeType: string
    compilers: string[]
}

const __languages: Record<Proglang, LanguageInfo> = {
    [Proglang.PYTHON]: {
        proglang: Proglang.PYTHON,
        runner: new PythonRunner(),
        extensions: [".py"],
        commentPrefix: "#",
        mimeType: "text/x-script.phyton",
        compilers: ["Python3"],
    },
    [Proglang.CPP]: {
        proglang: Proglang.CPP,
        runner: new CppRunner(),
        extensions: [".cc", ".cpp", ".cxx", ".c++"],
        commentPrefix: "//",
        mimeType: "text/x-c",
        compilers: ["G++"],
    },
    [Proglang.GHC]: {
        proglang: Proglang.GHC,
        runner: new GHCRunner(),
        extensions: [".hs"],
        commentPrefix: "--",
        mimeType: "text/x-haskell",
        compilers: ["GHC"],
    },
}

export function proglangFindIf(
    func: (info: LanguageInfo) => boolean,
    errorMsg: string
): Proglang {
    for (const [lang, info] of Object.entries(__languages)) {
        if (func(info)) {
            return lang as Proglang
        }
    }
    throw new Error(errorMsg)
}

export function proglangFromExtension(extension: string): Proglang {
    return proglangFindIf(
        (info) => info.extensions.includes(extension),
        `Language with extension '${extension}' not supported`
    )
}

export function proglangFromCompiler(compiler_id: string): Proglang {
    return proglangFindIf(
        (info) => info.compilers.includes(compiler_id),
        `Language with compiler '${compiler_id}' not supported`
    )
}

export function proglangFromFilepath(filePath: string): Proglang {
    return proglangFromExtension(extname(basename(filePath)))
}

export function proglangInfoGet(proglang: Proglang): LanguageInfo {
    for (const [lang, info] of Object.entries(__languages)) {
        if (lang === proglang) {
            return info
        }
    }
    throw new Error(`Language not found`)
}

export async function chooseProgrammingLanguage(
    problemNm: string
): Promise<Proglang | null> {
    const fileType = await vscode.window.showQuickPick(
        Object.values(Proglang).map((lang) => ({
            label: `${lang} File`,
            description: lang,
        })),
        {
            placeHolder: "Select file type",
            title: `New file for ${problemNm}`,
        }
    )
    return fileType?.description || null
}
