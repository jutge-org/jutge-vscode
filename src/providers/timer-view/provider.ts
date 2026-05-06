import * as vscode from "vscode"
import * as fs from "fs"
import * as path from "path"

import { RunningExam } from "@/jutge_api_client"
import { jutgeClient } from "@/services/jutge"

export const timerWebviewViewType = "jutge-clock"

const EXAM_FETCH_INTERVAL_MS = 60_000

function getDayjsRuntimeScripts(): string {
    try {
        const dayjsDir = path.dirname(require.resolve("dayjs/package.json"))
        const dayjsSource = fs.readFileSync(path.join(dayjsDir, "dayjs.min.js"), "utf8")
        const durationSource = fs.readFileSync(
            path.join(dayjsDir, "plugin", "duration.js"),
            "utf8"
        )
        const relativeTimeSource = fs.readFileSync(
            path.join(dayjsDir, "plugin", "relativeTime.js"),
            "utf8"
        )
        return [
            "<script>",
            dayjsSource,
            "</script>",
            "<script>",
            durationSource,
            "</script>",
            "<script>",
            relativeTimeSource,
            "</script>",
        ].join("")
    } catch {
        return ""
    }
}

function getTimerHtml(): string {
    const dayjsRuntimeScripts = getDayjsRuntimeScripts()
    return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta
        http-equiv="Content-Security-Policy"
        content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';"
    />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Exam clock</title>
    <style>
        :root {
            color-scheme: light dark;
            font-size: 13px;
        }
        body {
            margin: 0;
            padding: 10px 8px 12px;
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            background: var(--vscode-sideBar-background);
        }
        .remaining {
            text-align: center;
            font-weight: 600;
            margin-bottom: 0px;
        }
        .timer-wrapper {
            width: 100%;
            display: flex;
            justify-content: center;
        }
        canvas {
            width: 220px;
            height: 130px;
            max-width: 100%;
        }
        .hint {
            margin-top: 0px;
            font-size: 11px;
            text-align: center;
            opacity: 0.8;
        }
    </style>
</head>
<body>
    <div id="remaining" class="remaining">Loading exam time...</div>
    <div class="timer-wrapper">
        <canvas id="timer" width="220" height="130"></canvas>
    </div>
    <div id="hint" class="hint"></div>

    ${dayjsRuntimeScripts}
    <script>
        (function() {
            const vscode = acquireVsCodeApi();
            const remainingEl = document.getElementById("remaining");
            const hintEl = document.getElementById("hint");
            const canvas = document.getElementById("timer");
            const ctx = canvas.getContext("2d");
            if (typeof dayjs === "function" && dayjs.extend) {
                if (typeof dayjs_plugin_duration !== "undefined") {
                    dayjs.extend(dayjs_plugin_duration);
                }
                if (typeof dayjs_plugin_relativeTime !== "undefined") {
                    dayjs.extend(dayjs_plugin_relativeTime);
                }
            }

            const OPENING_RAD = 0.68;
            const TICK_MS = 10000;
            const DANGER_THRESHOLD_RATIO = 0.10;
            let examData = null;
            let drawTimer = null;

            function asDate(value) {
                const d = new Date(value);
                if (Number.isNaN(d.getTime())) return null;
                return d;
            }

            function getTimes() {
                if (!examData) return null;
                const startDate = asDate(examData.time_start || examData.exp_time_start);
                if (!startDate) return null;
                const startMs = startDate.getTime();
                const totalMs = Math.max(0, Number(examData.running_time || 0)) * 60 * 1000;
                const endMs = startMs + totalMs;
                return { startMs, endMs, totalMs };
            }

            function formatDuration(ms) {
                const clamped = Math.max(0, ms);
                if (
                    typeof dayjs === "function" &&
                    dayjs.duration &&
                    typeof dayjs.duration === "function"
                ) {
                    return dayjs.duration(clamped).humanize();
                }
                const totalSeconds = Math.floor(clamped / 1000);
                const hours = Math.floor(totalSeconds / 3600);
                const minutes = Math.floor((totalSeconds % 3600) / 60);
                const seconds = totalSeconds % 60;

                if (hours > 0) return hours + "h " + minutes + "m " + seconds + "s";
                if (minutes > 0) return minutes + "m " + seconds + "s";
                return seconds + "s";
            }

            function arcAngles() {
                const start = Math.PI + OPENING_RAD;
                const end = 2 * Math.PI - OPENING_RAD;
                return { start, end, span: end - start };
            }

            function drawTimerDial(nowMs) {
                const times = getTimes();
                if (!times) {
                    remainingEl.textContent = "Could not read exam timing.";
                    hintEl.textContent = "";
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    return;
                }

                const elapsedRatioRaw = (nowMs - times.startMs) / Math.max(1, times.totalMs);
                const elapsedRatio = Math.max(0, Math.min(1, elapsedRatioRaw));
                const remainingMs = Math.max(0, times.endMs - nowMs);
                const exceededMs = Math.max(0, nowMs - times.endMs);
                const hasEnded = elapsedRatio >= 1;

                remainingEl.textContent = hasEnded
                    ? "ended " + formatDuration(exceededMs) + " ago"
                    : formatDuration(remainingMs) + " remaining";
                hintEl.textContent = hasEnded ? "Time expired" : "";

                const centerX = canvas.width / 2;
                const centerY = canvas.height * 0.95;
                const radius = 86;
                const lineWidth = 13;
                const theme = getComputedStyle(document.body);
                const normalElapsedColor =
                    theme.getPropertyValue("--vscode-editor-foreground").trim() || "#222222";
                const baseRemainingColor =
                    theme.getPropertyValue("--vscode-editorWidget-border").trim() || "#9a9a9a";
                const dangerColor = "#7a1010";
                const elapsedColor = hasEnded ? dangerColor : normalElapsedColor;

                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.lineWidth = lineWidth;
                ctx.lineCap = "round";

                const { start, span } = arcAngles();
                const elapsedEnd = start + span * elapsedRatio;
                const fullEnd = start + span;
                const dangerStart = start + span * (1 - DANGER_THRESHOLD_RATIO);
                const normalRemainingEnd = Math.min(dangerStart, fullEnd);

                ctx.beginPath();
                ctx.strokeStyle = baseRemainingColor;
                if (elapsedEnd < normalRemainingEnd) {
                    ctx.arc(centerX, centerY, radius, elapsedEnd, normalRemainingEnd);
                    ctx.stroke();
                }

                ctx.beginPath();
                ctx.strokeStyle = dangerColor;
                if (elapsedEnd < fullEnd) {
                    const dangerSegmentStart = Math.max(elapsedEnd, dangerStart);
                    if (dangerSegmentStart < fullEnd) {
                        ctx.arc(centerX, centerY, radius, dangerSegmentStart, fullEnd);
                        ctx.stroke();
                    }
                }

                ctx.beginPath();
                ctx.strokeStyle = elapsedColor;
                ctx.arc(centerX, centerY, radius, start, elapsedEnd);
                ctx.stroke();
            }

            function redraw() {
                drawTimerDial(Date.now());
            }

            function startLocalTicker() {
                if (drawTimer !== null) clearInterval(drawTimer);
                redraw();
                drawTimer = setInterval(redraw, TICK_MS);
            }

            window.addEventListener("message", function(event) {
                const message = event.data;
                if (!message || typeof message !== "object") return;

                if (message.type === "examDataResult") {
                    if (message.payload && message.payload.ok && message.payload.exam) {
                        examData = message.payload.exam;
                    } else {
                        examData = null;
                        remainingEl.textContent = "Could not load exam timing.";
                        hintEl.textContent = message.payload && message.payload.error
                            ? String(message.payload.error)
                            : "";
                    }
                    redraw();
                }
            });

            startLocalTicker();
            vscode.postMessage({ type: "requestExamData" });
        })();
    </script>
</body>
</html>`
}

export class TimerWebviewViewProvider implements vscode.WebviewViewProvider, vscode.Disposable {
    private webviewView: vscode.WebviewView | undefined
    private refreshTimer: NodeJS.Timeout | undefined

    constructor(private readonly extensionUri: vscode.Uri) {}

    resolveWebviewView(webviewView: vscode.WebviewView): void | Thenable<void> {
        this.webviewView = webviewView
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                vscode.Uri.joinPath(this.extensionUri, "src", "webview"),
                vscode.Uri.joinPath(this.extensionUri, "dist"),
            ],
        }
        webviewView.webview.html = getTimerHtml()

        this.scheduleExamRefresh_()
        void this.pushLatestExamData_()

        webviewView.onDidDispose(() => {
            this.clearRefreshTimer_()
            this.webviewView = undefined
        })

        webviewView.webview.onDidReceiveMessage(async (message: unknown) => {
            if (!message || typeof message !== "object") {
                return
            }
            const msg = message as { type?: string }
            if (msg.type === "requestExamData") {
                await this.pushLatestExamData_()
            }
        })
    }

    dispose(): void {
        this.clearRefreshTimer_()
        this.webviewView = undefined
    }

    async forceRefresh(): Promise<void> {
        await this.pushLatestExamData_()
    }

    private scheduleExamRefresh_() {
        this.clearRefreshTimer_()
        this.refreshTimer = setInterval(() => {
            void this.pushLatestExamData_()
        }, EXAM_FETCH_INTERVAL_MS)
    }

    private clearRefreshTimer_() {
        if (this.refreshTimer !== undefined) {
            clearInterval(this.refreshTimer)
            this.refreshTimer = undefined
        }
    }

    private async pushLatestExamData_(): Promise<void> {
        if (!this.webviewView) {
            return
        }
        try {
            const exam: RunningExam = await jutgeClient.student.exam.get()
            await this.webviewView.webview.postMessage({
                type: "examDataResult",
                payload: { ok: true, exam },
            })
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error)
            await this.webviewView.webview.postMessage({
                type: "examDataResult",
                payload: { ok: false, error: message },
            })
        }
    }
}
