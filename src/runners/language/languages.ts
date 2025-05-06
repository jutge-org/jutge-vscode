import * as vscode from "vscode"
import { CppRunner } from "./cpp"
import { PythonRunner } from "./python"
import { LanguageRunner } from "./runner"

export enum Proglang {
    CPP = "C++",
    PYTHON = "Python",
}

export function getLangIdFromFilePath(filePath: string): Proglang {
    const extension = filePath.split(".").pop()
    switch (extension) {
        case "py":
            return Proglang.PYTHON
        case "cc":
        case "cpp":
            return Proglang.CPP
        default:
            vscode.window.showErrorMessage("Language not supported.")
            throw new Error("Language not supported.")
    }
}

export function getDefaultExtensionFromLangId(languageId: Proglang): string {
    switch (languageId) {
        case Proglang.PYTHON:
            return "py"
        case Proglang.CPP:
            return "cc"
        default:
            vscode.window.showErrorMessage("Language not supported.")
            throw new Error("Language not supported.")
    }
}

export function getLangRunnerFromLangId(languageId: Proglang): LanguageRunner {
    // NOTE: Not sure if vscode has native functionality to detect the language of a file.
    switch (languageId) {
        case Proglang.PYTHON:
            return new PythonRunner()
        case Proglang.CPP:
            return new CppRunner()
        default:
            vscode.window.showErrorMessage("Language not supported.")
            throw new Error("Language not supported.")
    }
}
