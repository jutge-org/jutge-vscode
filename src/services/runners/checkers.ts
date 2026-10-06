import { ProblemHandler, TestcaseStatus } from "@/types"

export enum Checker {
    STD = "std",
    LOOSE = "loose",
    ELASTIC = "elastic",
    ELASTIC2 = "elastic2",
    UNK = "unk", //ficticious checker
}

export interface CheckerRunner {
    run(output: string, solution: string, problemHandler: ProblemHandler | null): TestcaseStatus
}

export interface CheckerInfo {
    checker: Checker
    runner: CheckerRunner
    implemented: boolean
    driver: string
}

class STDRunner implements CheckerRunner {
    run(output: string, solution: string, problemHandler: ProblemHandler) {
        return output === solution ? TestcaseStatus.PASSED : TestcaseStatus.FAILED
    }
}

class ElasticRunner implements CheckerRunner {
    run(output: string, solution: string, problemHandler: ProblemHandler) {
        if (output === solution) {
            return TestcaseStatus.PASSED
        }
        if (!problemHandler.separator) {
            return TestcaseStatus.FAILED
        }

        const aV = output.split(problemHandler.separator)
        const bV = solution.split(problemHandler.separator)

        if (aV.length !== bV.length) {
            return TestcaseStatus.FAILED
        }

        aV.sort()
        bV.sort()

        return aV.join(problemHandler.separator) === bV.join(problemHandler.separator)
            ? TestcaseStatus.PASSED
            : TestcaseStatus.FAILED
    }
}

class Elastic2Runner implements CheckerRunner {
    standarize(sol: string, s: string, starting: string, ending: string) {
        if (sol.startsWith(starting) && sol.endsWith(ending)) {
            const t = sol.slice(starting.length, -ending.length)
            return starting + t.split(s).sort().join(s) + ending
        }
        return ""
    }

    run(output: string, solution: string, problemHandler: ProblemHandler) {
        //Note (jma25l): This is way simpler than the original elastic2, as considers PE wrong.
        if (output === solution) {
            return TestcaseStatus.PASSED
        }

        if (
            !problemHandler.separator1 ||
            !problemHandler.separator2 ||
            !problemHandler.starting ||
            !problemHandler.ending
        ) {
            return TestcaseStatus.FAILED
        }

        const aV = output.split(problemHandler.separator1)
        const bV = solution.split(problemHandler.separator1)

        if (aV.length !== bV.length) {
            return TestcaseStatus.FAILED
        }

        const aV2 = aV
            .map((x) =>
                this.standarize(
                    x,
                    problemHandler.separator2 || "",
                    problemHandler.starting || "",
                    problemHandler.ending || ""
                )
            )
            .sort()
        const bV2 = bV
            .map((x) =>
                this.standarize(
                    x,
                    problemHandler.separator2 || "",
                    problemHandler.starting || "",
                    problemHandler.ending || ""
                )
            )
            .sort()

        return aV2.join(problemHandler.separator1) === bV2.join(problemHandler.separator1)
            ? TestcaseStatus.PASSED
            : TestcaseStatus.FAILED
    }
}

const __checkers: Record<Checker, CheckerInfo> = {
    [Checker.STD]: {
        checker: Checker.STD,
        runner: new STDRunner(),
        implemented: true,
        driver: "std",
    },
    [Checker.LOOSE]: {
        //Defining it splicitly, PEs are considered wrong.
        checker: Checker.LOOSE,
        runner: new STDRunner(),
        implemented: true,
        driver: "std",
    },
    [Checker.ELASTIC]: {
        checker: Checker.ELASTIC,
        runner: new ElasticRunner(),
        implemented: true,
        driver: "std",
    },
    [Checker.ELASTIC2]: {
        checker: Checker.ELASTIC2,
        runner: new Elastic2Runner(),
        implemented: true,
        driver: "std",
    },
    [Checker.UNK]: {
        checker: Checker.UNK,
        runner: new STDRunner(), // If I have nothing else, use STD.
        implemented: false,
        driver: "std",
    },
}

export function checkerFindIf(func: (info: CheckerInfo) => boolean): Checker {
    for (const [checker, info] of Object.entries(__checkers)) {
        if (func(info)) {
            return checker as Checker
        }
    }
    return Checker.STD as Checker // Default, will usually work (as much as possible)
}

export function checkerInfoGet(checker: Checker): CheckerInfo {
    for (const [check, info] of Object.entries(__checkers)) {
        if (checker === check) {
            return info as CheckerInfo
        }
    }
    return __checkers[Checker.UNK] as CheckerInfo // Not defined above
}

export function checkerInfoByName(name: string | undefined) {
    if (!name) {
        return checkerInfoGet(Checker.STD) //Default checker
    }
    return checkerInfoGet(name as Checker)
}
