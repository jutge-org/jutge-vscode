"use client"

import { PauseIcon, RabbitIcon, SnailIcon } from "lucide-react"
import Image from "next/image"
import { useParams } from "next/navigation"
import { useCallback, useEffect, useState } from "react"
import Page from "@/components/layout/Page"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import jutge from "@/lib/jutge"
import {
    ColorMapping,
    InstructorBriefExam,
    InstructorExamProblem,
    Ranking,
    RankingResult,
} from "@/lib/jutge_api_client"

export default function ExamRankingPage() {
    const { exam_nm } = useParams<{ exam_nm: string }>()
    return (
        <Page
            pageContext={{
                title: `Exam ${exam_nm}`,
                menu: "user",
                current: "exams",
                subTitle: `Exams ❯ ${exam_nm}`,
                subMenu: "exams",
                subCurrent: "ranking",
            }}
        >
            <ExamRankingView />
        </Page>
    )
}

function ExamRankingView() {
    const { exam_nm } = useParams<{ exam_nm: string }>()

    const [exam, setExam] = useState<InstructorBriefExam | null>(null)
    const [examProblems, setExamProblems] = useState<InstructorExamProblem[]>([])
    const [ranking, setRanking] = useState<Ranking | null>(null)
    const [colors, setColors] = useState<ColorMapping | null>(null)

    const [speed, setSpeed] = useState("0")
    const [counter, setCounter] = useState(0)

    const fetchData = useCallback(async () => {
        console.log("Fetching data for exam:", exam_nm, new Date())
        const exam = await jutge.instructor.exams.get(exam_nm)
        const examProblems = await jutge.instructor.exams.getProblems(exam_nm)
        const ranking = await jutge.instructor.exams.getRanking(exam_nm)
        const colors = await jutge.misc.getHexColors()

        setExam(exam)
        setExamProblems(examProblems)
        setRanking(ranking)
        setColors(colors)
    }, [exam_nm])

    useEffect(() => {
        fetchData()
    }, [exam_nm, fetchData])

    useEffect(() => {
        async function updateQueue() {
            const ispeed = parseInt(speed)
            setCounter(counter + 1)
            if ((ranking !== null && ispeed == 0) || counter % ispeed != 0) return
            await fetchData()
        }

        const interval = setInterval(updateQueue, 1000)

        return () => {
            clearInterval(interval)
        }
    }, [counter, speed, ranking, fetchData])

    if (exam === null || examProblems === null || ranking === null || colors === null)
        return null

    return (
        <div className="flex flex-col gap-4">
            <div className="text-sm flex flex-row items-center gap-2">
                <div className="flex-grow" />
                <div className="text-sm">Refresh:</div>
                <Select onValueChange={setSpeed} defaultValue="0">
                    <SelectTrigger className="w-36" defaultValue="0">
                        <SelectValue placeholder="Speed" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="0">
                            <div className="flex flex-row gap-2 items-center">
                                <PauseIcon className="h-4 w-4" /> None
                            </div>
                        </SelectItem>
                        <SelectItem value="30">
                            <div className="flex flex-row gap-2 items-center">
                                <SnailIcon className="h-4 w-4" /> Slow (30s)
                            </div>
                        </SelectItem>
                        <SelectItem value="10">
                            <div className="flex flex-row gap-2 items-center">
                                <RabbitIcon className="h-4 w-4" /> Fast (10s)
                            </div>
                        </SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div className="text-sm flex justify-center items-center">
                <table>
                    <tbody>
                        {examProblems.length > 0 && examProblems[0].icon && (
                            <tr>
                                <td></td>
                                <td></td>
                                <td></td>
                                {exam.avatars && <td></td>}
                                {examProblems.map((problem, index) => (
                                    <td
                                        key={index}
                                        className="bg-neutral-100 border-2 border-white rounded-lg h-12 w-12"
                                    >
                                        <div className="flex flex-col justify-center items-center">
                                            <Image
                                                src={`https://jutge.org/img/examicons/${problem.icon}.svg`}
                                                alt={problem.icon || "icon"}
                                                width={32}
                                                height={32}
                                            />
                                        </div>
                                    </td>
                                ))}
                                <td></td>
                            </tr>
                        )}
                        <tr>
                            <td></td>
                            <td></td>
                            {exam.avatars && <td></td>}
                            <td className="bg-neutral-100 border-2 border-white rounded-lg h-12 px-4 text-center font-bold">
                                Score
                            </td>
                            {examProblems.map((problem, index) => (
                                <td
                                    key={index}
                                    className="bg-neutral-100 border-2 border-white rounded-lg w-40 h-12 px-4 text-center "
                                >
                                    <a
                                        href={`https://jutge.org/problems/${problem.problem_nm}`}
                                        target="_blank"
                                        title={problem.problem_nm}
                                        className="font-bold text-primary"
                                    >
                                        {problem.caption || `P${index + 1}`}
                                    </a>
                                    {problem.weight !== null && (
                                        <>
                                            <br />
                                            {problem.weight}
                                        </>
                                    )}
                                </td>
                            ))}
                            <td className="bg-neutral-100 border-2 border-white rounded-lg px-4 text-center font-bold">
                                Score
                            </td>
                        </tr>

                        {ranking.map((row, index) => (
                            <tr key={index}>
                                <td className="bg-neutral-100 border-2 border-white rounded-lg px-2 text-right">
                                    {row.position}
                                </td>
                                <td className="bg-neutral-100 border-2 border-white rounded-lg px-2 truncate">
                                    {row.name}
                                </td>
                                {exam.avatars && (
                                    <td className="bg-neutral-100 border-2 border-white rounded-lg px-2 h-12 w-12">
                                        <Image
                                            src={`https://jutge.org/avatars/${exam.avatars}/${row.avatar}`}
                                            alt={row.avatar || "Avatar"}
                                            width={32}
                                            height={32}
                                        />
                                    </td>
                                )}

                                <td className="bg-neutral-100 border-2 border-white rounded-lg px-4">
                                    <div className="flex flex-col gap-0 items-center">
                                        <div className="font-bold">{row.score}</div>
                                        <div className="text-xs">{Math.floor(row.time)}</div>
                                    </div>
                                </td>

                                {row.rankingResults.map((result, index) => (
                                    <td
                                        key={index}
                                        className="bg-neutral-100 border-2 border-white rounded-lg w-40 px-2 text-center"
                                    >
                                        <Score result={result} colors={colors} />
                                    </td>
                                ))}

                                <td className="bg-neutral-100 border-2 border-white rounded-lg px-4">
                                    <div className="flex flex-col gap-0 items-center">
                                        <div className="font-bold">{row.score}</div>
                                        <div className="text-xs">{Math.floor(row.time)}</div>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

function Score({ result, colors }: { result: RankingResult; colors: ColorMapping }) {
    if (result.verdict === null) return null

    if (result.verdict === "AC")
        return (
            <div className="" style={{ color: colors.verdicts.AC }}>
                {/*<span className="text-blue-700">{result.historic}</span>*/}
                {Math.floor(result.time)}
                {result.wrongs !== 0 && (
                    <span className="text-xs">&nbsp;({result.wrongs})</span>
                )}
            </div>
        )

    return (
        <div className="" style={{ color: colors.verdicts[result.verdict] }}>
            {/*<span className="text-blue-700">{result.historic}</span>*/}
            {Math.floor(result.time)}
            {result.wrongs !== 0 && <span className="text-xs">&nbsp;({result.wrongs})</span>}
            <br />
            <span className="">{result.verdict}</span>
        </div>
    )
}
