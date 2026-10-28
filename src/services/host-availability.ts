import { StaticLogger } from "@/loggers"

export type SignInMode = "jutge" | "exam" | "contest"

export type HostAvailability = Record<SignInMode, boolean>

export const SIGN_IN_MODES: SignInMode[] = ["jutge", "exam", "contest"]

export const SIGN_IN_HOST_URL_BY_MODE: Record<SignInMode, string> = {
    jutge: "https://jutge.org",
    exam: "https://exam.jutge.org",
    contest: "https://contest.jutge.org",
}

const PROBE_TIMEOUT_MS = 4000
const CACHE_TTL_MS = 15_000

/**
 * Detects which Jutge.org hosts are reachable from the current network.
 *
 * This is important in exam environments, where a firewall may only allow
 * traffic to the exam (or contest) host. We ask each host for the headers of
 * its main page, so a tab is only enabled when its host can actually be used.
 */
export class HostAvailabilityService extends StaticLogger {
    private static cached_: { availability: HostAvailability; timestamp: number } | undefined

    public static async detect(options?: { force?: boolean }): Promise<HostAvailability> {
        const now = Date.now()
        if (
            !options?.force &&
            this.cached_ !== undefined &&
            now - this.cached_.timestamp < CACHE_TTL_MS
        ) {
            return this.cached_.availability
        }

        const entries = await Promise.all(
            SIGN_IN_MODES.map(async (mode) => {
                const available = await this.probeHost_(SIGN_IN_HOST_URL_BY_MODE[mode])
                return [mode, available] as const
            })
        )
        const availability = Object.fromEntries(entries) as HostAvailability
        this.cached_ = { availability, timestamp: Date.now() }
        return availability
    }

    private static async probeHost_(url: string): Promise<boolean> {
        try {
            const response = await fetch(url, {
                method: "HEAD",
                redirect: "follow",
                signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
            })
            // Any HTTP response below 500 means the host is reachable. In
            // particular, 401/403/404 still prove that we reached the server.
            const available = response.status < 500
            this.log.info(
                `Host '${url}' is ${available ? "available" : "unavailable"} ` +
                    `(HTTP ${response.status}).`
            )
            return available
        } catch (error) {
            this.log.info(`Host '${url}' is unavailable: ${error}`)
            return false
        }
    }
}
