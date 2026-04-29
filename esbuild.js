const { build, context } = require("esbuild")

//@ts-check
/** @typedef {import('esbuild').BuildOptions} BuildOptions **/

/** @type BuildOptions */
const baseConfig = {
    bundle: true,
    minify: process.env.NODE_ENV === "production",
    sourcemap: process.env.NODE_ENV !== "production",
    alias: {
        "@": "./src",
    },
}

// Config for extension source code (to be run in a Node-based context)
/** @type BuildOptions */
const extensionConfig = {
    ...baseConfig,
    platform: "node",
    mainFields: ["module", "main"],
    format: "cjs",
    entryPoints: ["./src/extension.ts"],
    outfile: "./dist/extension.js",
    external: ["vscode"],
}

// Config for webview source code (to be run in a web-based context)
/** @type BuildOptions */
const webviewConfig = {
    ...baseConfig,
    target: "esnext",
    format: "esm",
    entryPoints: ["./src/webview/main.ts"],
    outfile: "./dist/webview/main.js",
}

const createWatchLoggerPlugin = (name) => ({
    name: `${name}-watch-logger`,
    setup(build) {
        build.onStart(() => {
            console.log(`[watch] ${name} build started`)
        })
        build.onEnd((result) => {
            if (result.errors.length === 0) {
                console.log(`[watch] ${name} build finished`)
            }
        })
    },
})

// Build script
;(async () => {
    const args = process.argv.slice(2)
    try {
        if (args.includes("--watch")) {
            // Build and watch extension and webview code
            console.log("[watch] build started")
            const extensionContext = await context({
                ...extensionConfig,
                plugins: [createWatchLoggerPlugin("extension")],
            })
            const webviewContext = await context({
                ...webviewConfig,
                plugins: [createWatchLoggerPlugin("webview")],
            })

            await extensionContext.watch()
            await webviewContext.watch()
            console.log("[watch] build finished")

            process.on("SIGINT", async () => {
                await extensionContext.dispose()
                await webviewContext.dispose()
                process.exit(0)
            })
        } else {
            // Build extension and webview code
            await build(extensionConfig)
            await build(webviewConfig)
            console.log("[watch] build complete")
        }
    } catch (err) {
        process.stderr.write(err?.stderr || `${err}\n`)
        process.exit(1)
    }
})()
