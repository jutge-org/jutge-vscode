import { Logger } from "@/loggers"
import { ConfigService } from "@/services/config"
import { TerminalService } from "@/services/terminal"
import { downloadFile, getExtensionDirectory, getWorkingDirectory } from "@/utils"
import * as childProcess from "child_process"
import decompress from "decompress"
import { copyFileSync, existsSync, mkdirSync } from "fs"
import { opendir } from "fs/promises"
import { rename, rm, rmdir } from "node:fs/promises"
import * as os from "node:os"
import { basename, extname } from "node:path"
import { join } from "path"
import * as vscode from "vscode"
import { handleRuntimeErrors } from "../errors"
import { LanguageRunner } from "../languages"

export class PythonRunner extends Logger implements LanguageRunner {
    static RUNNING_DIR = `.jutge-org.python-runner`

    runningDir: string = ""
    uvBin: string = ""

    error(msg: string) {
        this.log.error(msg)
        throw new Error(msg)
    }

    getRunningDir(): string {
        return this.runningDir
    }

    setUvBinary() {
        const uv = os.platform() === "win32" ? "uv.exe" : "uv"
        this.uvBin = join(this.runningDir, "bin", uv)
    }

    async isRunningDirPrepared(): Promise<boolean> {
        // 1. `pyproject.toml` exists
        const projectFile = join(this.runningDir, "pyproject.toml")
        if (!existsSync(projectFile)) {
            return false
        }

        // 2. `.venv` directory exists
        try {
            // if I can open the directory for reading, it is there
            const venvDir = join(this.runningDir, ".venv")
            const dir = await opendir(venvDir)
            await dir.close()
            //
        } catch (e) {
            return false
        }

        this.setUvBinary()
        return true
    }

    /*

    https://github.com/astral-sh/uv/releases#release-0.12.13

    Mac:
    uv-x86_64-apple-darwin.tar.gz
    uv-aarch64-apple-darwin.tar.gz

    Windows:
    uv-x86_64-pc-windows-msvc.zip
    uv-aarch64-pc-windows-msvc.zip
    uv-i686-pc-windows-msvc.zip

    Linux:
    uv-x86_64-unknown-linux-gnu.tar.gz
    uv-aarch64-unknown-linux-gnu.tar.gz
    uv-armv7-unknown-linux-gnueabihf.tar.gz
    uv-i686-unknown-linux-gnu.tar.gz

    -- Discarded
    uv-powerpc64le-unknown-linux-gnu.tar.gz
    uv-riscv64gc-unknown-linux-musl.tar.gz
    uv-riscv64gc-unknown-linux-gnu.tar.gz
    uv-s390x-unknown-linux-gnu.tar.gz

    */

    async installUv(runningDir: string): Promise<void> {
        const __download = async (filename: string): Promise<string> => {
            const downloadUrl = `https://releases.astral.sh/github/uv/releases/download/0.12.13/${filename}`
            const targetPath = join(runningDir, filename)
            await downloadFile(downloadUrl, targetPath)
            return targetPath
        }

        const __decompressWin32 = async (path: string) => {
            // UNZIP and move uv.exe uvw.exe and uvx.exe to .bin
            await decompress(path, runningDir)

            for (const binary of ["uv.exe", "uvw.exe", "uvx.exe"]) {
                const from = join(runningDir, binary)
                const to = join(runningDir, ".bin", binary)
                await rename(from, to)
            }
        }

        const __decompressUnix = async (path: string) => {
            // .tar.gz with the same directory as the filename!
            await decompress(path, runningDir)

            // The .tar.gz files have an extra dir, with the same name
            // as the .tar.gz file, but without the extension
            const middleDirExt = basename(path)
            const firstDot = middleDirExt.indexOf(".")
            const middleDir = middleDirExt.slice(0, firstDot) // remove extension

            // Make the .bin directory if it doesn't exist
            const binDir = join(this.runningDir, "bin")
            if (!existsSync(binDir)) {
                mkdirSync(binDir)
            }

            // Copy files to .bin from the decompressed directory
            for (const binary of ["uv", "uvx"]) {
                const from = join(runningDir, middleDir, binary)
                const to = join(runningDir, "bin", binary)
                await rename(from, to)
            }

            // Remove the middleDir if it is present
            await rmdir(join(this.runningDir, middleDir))

            // Remove the downloaded file
            await rm(path)
        }

        try {
            const arch = os.machine()
            const platform = os.platform()

            // 1. Determine what file to download
            let downloadFilename = ""
            switch (platform) {
                // Windows
                case "win32": {
                    const file = await __download(`uv-${arch}-pc-windows-msvc.zip`)
                    await __decompressWin32(file)
                    break
                }

                // Apple MacOS
                case "darwin": {
                    const file = await __download(`uv-${arch}-apple-darwin.tar.gz`)
                    await __decompressUnix(file)
                    break
                }

                // Linux
                case "linux": {
                    const gnu = arch === "armv7" ? "gnueabihf" : "gnu"
                    const file = await __download(`uv-${arch}-unknown-linux-${gnu}.tar.gz`)
                    await __decompressUnix(file)
                    break
                }
            }

            // 2. Configure the location of the UV binary
            this.setUvBinary()

            //
        } catch (err) {
            throw new Error(`Could not install UV: ${err}`)
        }
    }

    async prepareRunningDir(): Promise<void> {
        const __uv = async (...params: string[]): Promise<void> => {
            const result = childProcess.spawnSync(this.uvBin, params, {
                cwd: this.runningDir,
            })
            const err = result.error
            if (err) {
                this.error(`Error preparing running dir: ${err.message}`)
            }
            const { status } = result
            if (status !== 0) {
                this.error(`Error preparing running dir: ${result.stderr}`)
            }
        }

        // Install `uv` and prepare the running directory
        await this.installUv(this.runningDir)

        // Initialize dir only with `pyproject.toml`
        await __uv("init", "--bare", "--name", "python-runner")

        // Create a virtual environment
        await __uv("venv")

        // Install `yogi`
        await __uv("pip", "install", "yogi")
    }

    async ensurePreparedRunningDir(): Promise<void> {
        const extensionDir = getExtensionDirectory()

        // Look for a folder called `workingDir/.jutge-org-python-runner`
        if (!existsSync(this.runningDir)) {
            mkdirSync(this.runningDir)
        }

        if (!(await this.isRunningDirPrepared())) {
            await this.prepareRunningDir()
        }

        // Copy the turtle.py file in case the problem is of type `graphic`
        const turtlePySourcePath = join(extensionDir, "resources", "turtle.py")
        const turtlePyDestPath = join(this.runningDir, "turtle.py")
        copyFileSync(turtlePySourcePath, turtlePyDestPath)
    }

    async run(codePath: string, input: string, document: vscode.TextDocument): Promise<string> {
        this.log.debug(`Running code: ${codePath}`)

        const command = ConfigService.getPythonCommand()
        const flags = ConfigService.getPythonFlags()
        const workingDir = getWorkingDirectory(codePath)

        // Running dir preparation (install uv, init, venv, add yogi)
        this.runningDir = join(workingDir, PythonRunner.RUNNING_DIR)
        await this.ensurePreparedRunningDir()

        // Copy program
        const destPath = join(this.runningDir, "main.py")
        copyFileSync(codePath, destPath)

        // First run via spawnSync to check for errors
        const result = childProcess.spawnSync(
            this.uvBin,
            ["run", "python", ...flags, "main.py"],
            {
                input,
                timeout: 5000,
                cwd: this.runningDir,
            }
        )

        // Check if there are errors
        const hasErrors =
            result.error ||
            (result.stderr && result.stderr.length > 0) ||
            result.signal ||
            result.status !== 0

        // Only execute in terminal if there are errors
        if (hasErrors) {
            this.log.debug(`Errors detected, showing in terminal`)
            const stderr = new TextDecoder().decode(result.stderr)
            this.log.debug(stderr)
            // Pass the input to executeCommand
            TerminalService.executeCommand(
                this.uvBin,
                ["run", "python", ...flags, "main.py"],
                true,
                input
            )
            this.error(`Execution failed`)
        }

        // Handle errors for diagnostics
        handleRuntimeErrors(result, document)

        if (!result.stdout) {
            this.error(`No output from execution`)
        }

        this.log.debug(`Execution completed successfully`)

        // TODO: Maybe erase `turtle.py`?

        return result.stdout.toString()
    }
}
