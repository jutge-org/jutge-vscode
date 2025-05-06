import * as vscode from "vscode"
import { CppRunner } from "./cpp"
import { PythonRunner } from "./python"
import { LanguageRunner } from "./runner"

export enum Language {
    CPP = "C++",
    PYTHON = "Python",
}

export function getLangIdFromFilePath(filePath: string): Language {
    const extension = filePath.split(".").pop()
    switch (extension) {
        case "py":
            return Language.PYTHON
        case "cc":
        case "cpp":
            return Language.CPP
        default:
            vscode.window.showErrorMessage("Language not supported.")
            throw new Error("Language not supported.")
    }
}

export function getDefaultExtensionFromLangId(languageId: Language): string {
    switch (languageId) {
        case Language.PYTHON:
            return "py"
        case Language.CPP:
            return "cc"
        default:
            vscode.window.showErrorMessage("Language not supported.")
            throw new Error("Language not supported.")
    }
}

export function getLangRunnerFromLangId(languageId: Language): LanguageRunner {
    // NOTE: Not sure if vscode has native functionality to detect the language of a file.
    switch (languageId) {
        case Language.PYTHON:
            return new PythonRunner()
        case Language.CPP:
            return new CppRunner()
        default:
            vscode.window.showErrorMessage("Language not supported.")
            throw new Error("Language not supported.")
    }
}
