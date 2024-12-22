/**
This file has been automatically generated at 2024-12-22T17:25:18.527Z

Name:    Jutge API
Version: 2.0.0

Description:

Jutge API

*/

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-namespace */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-inner-declarations */

/*
In order to use this module we recommend you to use bun. See https://bun.sh/

You should also install these dependencies:

    bun add yaml chalk @inquirer/prompts
*/

interface Meta {
    token: string
    exam: string | null
}

interface Download {
    content: Uint8Array
    name: string
    type: string
}

// default value for the Jutge API URL

const JUTGE_API_URL = process.env.JUTGE_API_URL || "https://api.jutge.org/api";

// global variable to store the meta information
export let meta: Meta | undefined = undefined;

/**
 * Sets the meta information used by the API client
 * @param token The authentication token
 * @param exam The exam identifier (optional)
 */
export function setMeta(token: string, exam: string | null = null): void {
    meta = {
        token,
        exam,
    };
}

// exceptions
export class UnauthorizedError extends Error {
    name: string = "UnauthorizedError";
    constructor(public message: string = "Unauthorized") {
        super(message);
    }
}

export class InfoError extends Error {
    name: string = "InfoError";
    constructor(public message: string) {
        super(message);
    }
}

export class NotFoundError extends Error {
    name: string = "NotFoundError";
    constructor(public message: string) {
        super(message);
    }
}

export class InputError extends Error {
    name: string = "InputError";
    constructor(public message: string) {
        super(message);
    }
}

export class ProtocolError extends Error {
    name: string = "ProtocolError";
    constructor(public message: string) {
        super(message);
    }
}

/** Function that sends a request to the API and returns the response **/

async function execute(func: string, input: any, ifiles: File[] = []): Promise<[any, Download[]]> {
    // prepare form
    const iform = new FormData();
    const idata = { func, input, meta: meta };
    iform.append("data", JSON.stringify(idata));
    for (const index in ifiles) {iform.append(`file_${index}`, ifiles[index]);}

    // send request
    const response = await fetch(JUTGE_API_URL, {
        method: "POST",
        body: iform,
    });

    // process response
    const contentType = response.headers.get("content-type")?.split(";")[0].toLowerCase();
    if (contentType !== "multipart/form-data") {
        throw new ProtocolError("The content type is not multipart/form-data");
    }

    const oform = await response.formData();
    const odata = oform.get("data");
    const { output, error, duration, operation_id, time } = JSON.parse(odata as string);

    if (error) {
        throwError(error, operation_id);
    }

    // extract ofiles
    const ofiles = [];
    for (const [key, value] of Object.entries(oform)) {
        if (value instanceof File) {
            ofiles.push({
                content: new Uint8Array(await value.arrayBuffer()),
                name: value.name,
                type: value.type,
            });
        }
    }

    return [output, ofiles];
}

function throwError(error: Record<string, any>, operation_id: string | undefined) {
    const message = error.message || "Unknown error";
    if (error.name === "UnauthorizedError") {
        throw new UnauthorizedError(message);
    } else if (error.name === "InfoError") {
        throw new InfoError(message);
    } else if (error.name === "NotFoundError") {
        throw new NotFoundError(message);
    } else if (error.name === "InputError") {
        throw new InputError(message);
    } else {
        throw new Error(message);
    }
}

export async function login(email: string, password: string): Promise<string> {
    try {
        const [credentials] = await execute("auth.login", { email, password });

        meta = {
            token: credentials.token,
            exam: null,
        };

        return credentials.token;
    } catch (error) {
        throw new UnauthorizedError("Cannot log in. Please check your credentials.");
    }
}

export async function logout(): Promise<void> {
    try {
        execute("auth.logout", null);
    } catch (error) {
        console.error("Error logging out");
    }
    meta = { token: "", exam: null };
}

export type CredentialsIn = {
    email: string
    password: string
}

export type CredentialsOut = {
    token: string
    expiration: string | string | string
    user_uid: string
}

export type Time = {
    full_time: string
    int_timestamp: number
    float_timestamp: number
    time: string
    date: string
}

export type HomepageStats = {
    users: number
    problems: number
    submissions: number
}

export type Language = {
    language_id: string
    eng_name: string
    own_name: string
}

export type Languages = Record<string, Language>

export type Country = {
    country_id: string
    eng_name: string
}

export type Countries = Record<string, Country>

export type Compiler = {
    compiler_id: string
    name: string
    language: string
    extension: string
    description: string | null
    version: string | null
    flags1: string | null
    flags2: string | null
    type: string | null
    warning: string | null
    status: string | null
    notes: string | null
}

export type Compilers = Record<string, Compiler>

export type Driver = {
    driver_id: string
}

export type Drivers = Record<string, Driver>

export type Verdict = {
    verdict_id: string
    name: string
    description: string
}

export type Verdicts = Record<string, Verdict>

export type Proglang = {
    proglang_id: string
}

export type Proglangs = Record<string, Proglang>

export type Tables = {
    languages: Languages
    countries: Countries
    compilers: Compilers
    drivers: Drivers
    verdicts: Verdicts
    proglangs: Proglangs
}

export type BriefAbstractProblem = {
    problem_nm: string
    author: string | null
    author_email: string | null
    public: number | null
    official: number | null
    compilers: string | null
    driver_id: string | null
    type: string | null
    deprecation: string | null
}

export type BriefProblem = {
    problem_id: string
    problem_nm: string
    language_id: string
    title: string
    original_language_id: string
    translator: string | null
    translator_email: string | null
    checked: number | null
}

export type BriefProblemDict = Record<string, BriefProblem>

export type AbstractProblem = {
    problem_nm: string
    author: string | null
    author_email: string | null
    public: number | null
    official: number | null
    compilers: string | null
    driver_id: string | null
    type: string | null
    deprecation: string | null
    problems: BriefProblemDict
}

export type Problem = {
    problem_id: string
    problem_nm: string
    language_id: string
    title: string
    original_language_id: string
    translator: string | null
    translator_email: string | null
    checked: number | null
    abstract_problem: BriefAbstractProblem
}

export type AbstractProblems = Record<string, AbstractProblem>

export type AbstractProblemExtras = {
    compilers_with_ac: string[]
    proglangs_with_ac: string[]
}

export type ProblemExtras = {
    compilers_with_ac: string[]
    proglangs_with_ac: string[]
    official_solution_checks: Record<string, boolean>
    handler: any
}

export type Testcase = {
    name: string
    input_b64: string
    correct_b64: string
}

export type Testcases = Testcase[]

export type AllKeys = {
    problems: string[]
    enrolled_courses: string[]
    available_courses: string[]
    lists: string[]
}

export type Profile = {
    user_uid: string
    email: string
    name: string
    username: string | null
    nickname: string | null
    webpage: string | null
    description: string | null
    affiliation: string | null
    birth_year: number
    max_subsxhour: number
    max_subsxday: number
    administrator: number
    instructor: number
    parent_email: string | null
    country_id: string | null
    timezone_id: string
    compiler_id: string | null
    language_id: string | null
}

export type NewProfile = {
    name: string
    birth_year: number
    nickname: string
    webpage: string
    affiliation: string
    description: string
    country_id: string
    timezone_id: string
}

export type PasswordUpdate = {
    oldPassword: string
    newPassword: string
}

export type TypeA = {
    a: string
}

export type TypeB = {
    a: string
}

export type DateValue = {
    date: number
    value: number
}

export type HeatmapCalendar = DateValue[]

export type Distribution = Record<string, number>

export type Distributions = {
    verdicts: Distribution
    compilers: Distribution
    proglangs: Distribution
    submissions_by_hour: Distribution
    submissions_by_weekday: Distribution
}

export type DashboardStats = Record<string, number | string>

export type Dashboard = {
    stats: DashboardStats
    heatmap: HeatmapCalendar
    distributions: Distributions
}

export type Submission = {
    problem_id: string
    submission_id: string
    compiler_id: string
    annotation: string | null
    state: string
    time_in: string | string | string
    veredict: string | null
    veredict_info: string | null
    veredict_publics: string | null
    ok_publics_but_wrong: number
}

export type Submissions = Submission[]

export type DictSubmissions = Record<string, Submission>

export type DictDictSubmissions = Record<string, DictSubmissions>

export type SubmissionPostOut = {
    submission_id: string
}

export type PublicProfile = {
    email: string
    name: string
    username: string | null
}

export type BriefCourse = {
    course_nm: string
    title: string | null
    description: string | null
    annotation: string | null
    public: number
    official: number
}

export type BriefCourses = Record<string, BriefCourse>

export type Course = {
    course_nm: string
    title: string | null
    description: string | null
    annotation: string | null
    public: number
    official: number
    owner: PublicProfile
    lists: string[]
}

export type ListItem = {
    problem_nm: string | null
    description: string | null
}

export type ListItems = ListItem[]

export type BriefList = {
    list_nm: string
    title: string | null
    description: string | null
    annotation: string | null
    public: number
    official: number
}

export type BriefLists = Record<string, BriefList>

export type List = {
    list_nm: string
    title: string | null
    description: string | null
    annotation: string | null
    public: number
    official: number
    items: ListItems
    owner: PublicProfile
}

export type AbstractStatus = {
    problem_nm: string
    nb_submissions: number
    nb_pending_submissions: number
    nb_accepted_submissions: number
    nb_rejected_submissions: number
    nb_scored_submissions: number
    status: string
}

export type AbstractStatuses = Record<string, AbstractStatus>

export type Status = {
    problem_id: string
    problem_nm: string
    nb_submissions: number
    nb_pending_submissions: number
    nb_accepted_submissions: number
    nb_rejected_submissions: number
    nb_scored_submissions: number
    status: string
}

export type Award = {
    award_id: string
    time: string | string | string
    type: string
    icon: string
    title: string
    info: string
    youtube: string | null
    submission: Submission | null
}

export type BriefAward = {
    award_id: string
    time: string | string | string
    type: string
    icon: string
    title: string
    info: string
    youtube: string | null
}

export type BriefAwards = Record<string, BriefAward>

export type TagsDict = Record<string, string[]>

export type Document = {
    document_nm: string
    title: string
    description: string
}

export type Documents = Document[]

export type InstructorList = {
    list_nm: string
    title: string
    description: string
    annotation: string
    official: number
    public: number
}

export type InstructorLists = InstructorList[]

export type InstructorListItem = {
    problem_nm: string | null
    description: string | null
}

export type InstructorListItems = InstructorListItem[]

export type InstructorListWithItems = {
    list_nm: string
    title: string
    description: string
    annotation: string
    official: number
    public: number
    items: InstructorListItems
}

export type InstructorCourse = {
    course_nm: string
    title: string
    description: string
    annotation: string
    official: number
    public: number
}

export type InstructorCourses = InstructorCourse[]

export type CourseMembers = {
    invited: string[]
    enrolled: string[]
    pending: string[]
}

export type InstructorCourseWithItems = {
    course_nm: string
    title: string
    description: string
    annotation: string
    official: number
    public: number
    lists: string[]
    students: CourseMembers
    tutors: CourseMembers
}

export type InstructorExam = {
    exam_nm: string
    title: string
    place: string | null
    description: string | null
    code: string | null
    time_start: string | string | string | null
    exp_time_start: string | string | string
    running_time: number
    visible_submissions: number
    started_by: string | null
    contest: number
    instructions: string | null
    avatars: string | null
    anonymous: number
}

export type InstructorExams = InstructorExam[]

export type InstructorExamCourse = {
    title: string
    description: string
    course_nm: string
    annotation: string
}

export type InstructorExamDocument = {
    document_nm: string
    title: string
    description: string
}

export type InstructorExamDocuments = InstructorExamDocument[]

export type InstructorExamProblem = {
    problem_nm: string
    weight: number | null
    icon: string | null
    caption: string | null
}

export type InstructorExamProblems = InstructorExamProblem[]

export type InstructorExamStudent = {
    email: string
    name: string
    code: string | null
    restricted: number
    annotation: string | null
    result: string | null
    finished: number
    banned: number
    reason_ban: string | null
    inc: number | null
    reason_inc: string | null
    taken_exam: number
    emergency_password: string | null
    invited: number
}

export type InstructorExamStudents = InstructorExamStudent[]

export type InstructorExamWithItems = {
    exam_nm: string
    title: string
    place: string | null
    description: string | null
    code: string | null
    time_start: string | string | string | null
    exp_time_start: string | string | string
    running_time: number
    visible_submissions: number
    started_by: string | null
    contest: number
    instructions: string | null
    avatars: string | null
    anonymous: number
    course: InstructorExamCourse
    documents: InstructorExamDocuments
    problems: InstructorExamProblems
    students: InstructorExamStudents
}

export type InstructorExamCreation = {
    exam_nm: string
    course_nm: string
    title: string
    place: string
    description: string
    instructions: string
    exp_time_start: string
    running_time: number
    contest: number
}

export type InstructorExamStudentPost = {
    email: string
    invited: number
    restricted: number
    code: string
    emergency_password: string
    annotation: string
}

export type InstructorExamStudentsPost = InstructorExamStudentPost[]

export type InstructorExamSubmissionsOptions = {
    problems: string
    include_source: boolean
    include_pdf: boolean
    include_metadata: boolean
    only_last: boolean
}

export type Pack = {
    message: string
    href: string
}

export type SubmissionQuery = {
    email: string
    problem_nm: string
    problem_id: string
    time: string | string | string
    ip: string
    verdict: string
}

export type SubmissionsQuery = SubmissionQuery[]

export type UserCreation = {
    email: string
    name: string
    username: string
    password: string
    administrator: number
    instructor: number
}

export type UpcomingExam = {
    exam_nm: string
    title: string
    username: string
    exp_start_time: string | string | string
    duration: number
    name: string
}

export type UpcomingExams = UpcomingExam[]

export type UserRankingEntry = {
    user_id: string
    nickname: string | null
    email: string
    name: string
    problems: number
}

export type UserRanking = UserRankingEntry[]

export type TwoFloats = {
    a: number
    b: number
}

export type TwoInts = {
    a: number
    b: number
}

export type Name = {
    name: string
}

export namespace auth {
    export async function login(data: CredentialsIn): Promise<CredentialsOut> {
        /**
        Login: Get an access token        
        **/

        const [output, ofiles] = await execute("auth.login", data);
        return output;
    }

    export async function logout(): Promise<void> {
        /**
        Logout: Discard access token
    
        🔐 Authenticated        
        **/

        const [output, ofiles] = await execute("auth.logout", null);
        return output;
    }
}

export namespace misc {
    export async function getFortune(): Promise<string> {
        /**
        Get a fortune message        
        **/

        const [output, ofiles] = await execute("misc.getFortune", null);
        return output;
    }

    export async function getTime(): Promise<Time> {
        /**
        Get server time        
        **/

        const [output, ofiles] = await execute("misc.getTime", null);
        return output;
    }

    export async function getHomepageStats(): Promise<HomepageStats> {
        /**
        Get homepage stats        
        **/

        const [output, ofiles] = await execute("misc.getHomepageStats", null);
        return output;
    }

    export async function getLogo(): Promise<Download> {
        /**
        Get Jutge.org logo as a PNG file        
        **/

        const [output, ofiles] = await execute("misc.getLogo", null);
        return ofiles[0];
    }
}

export namespace tables {
    export async function getLanguages(): Promise<Languages> {
        /**
        Returns all languages        
    
        Returns all languages as a dictionary of objects, indexed by id.
        **/

        const [output, ofiles] = await execute("tables.getLanguages", null);
        return output;
    }

    export async function getCountries(): Promise<Countries> {
        /**
        Returns all countries        
    
        Returns all countries as a dictionary of objects, indexed by id.
        **/

        const [output, ofiles] = await execute("tables.getCountries", null);
        return output;
    }

    export async function getCompilers(): Promise<Compilers> {
        /**
        Returns all compilers        
    
        Returns all compilers as a dictionary of objects, indexed by id.
        **/

        const [output, ofiles] = await execute("tables.getCompilers", null);
        return output;
    }

    export async function getDrivers(): Promise<Drivers> {
        /**
        Returns all drivers        
    
        Returns all drivers as a dictionary of objects, indexed by id.
        **/

        const [output, ofiles] = await execute("tables.getDrivers", null);
        return output;
    }

    export async function getVerdicts(): Promise<Verdicts> {
        /**
        Returns all verdicts        
    
        Returns all verdicts as a dictionary of objects, indexed by id.
        **/

        const [output, ofiles] = await execute("tables.getVerdicts", null);
        return output;
    }

    export async function getProglangs(): Promise<Proglangs> {
        /**
        Returns all proglangs        
    
        Returns all proglangs as a dictionary of objects, indexed by id.
        **/

        const [output, ofiles] = await execute("tables.getProglangs", null);
        return output;
    }

    export async function getAll(): Promise<Tables> {
        /**
        Returns all tables        
    
        Returns all compilers, countries, drivers, languages, proglangs, and verdicts in a single request. This data does not change often, so you should only request it once per session.
        **/

        const [output, ofiles] = await execute("tables.getAll", null);
        return output;
    }
}

export namespace problems {
    export async function getAllAbstractProblems(): Promise<AbstractProblems> {
        /**
        Get all available abstract problems
    
        🔐 Authenticated        
    
        Includes problems.
        **/

        const [output, ofiles] = await execute("problems.getAllAbstractProblems", null);
        return output;
    }

    export async function getAbstractProblems(problem_nms: string): Promise<AbstractProblems> {
        /**
        Get available abstract problems whose keys are in `problem_nms` (comma separated list)
    
        🔐 Authenticated        
    
        Includes problems.
        **/

        const [output, ofiles] = await execute("problems.getAbstractProblems", problem_nms);
        return output;
    }

    export async function getAbstractProblemsInList(list_key: string): Promise<AbstractProblems> {
        /**
        Get available abstract problems that belong to a list
    
        🔐 Authenticated        
    
        Includes problems.
        **/

        const [output, ofiles] = await execute("problems.getAbstractProblemsInList", list_key);
        return output;
    }

    export async function getAbstractProblem(problem_nm: string): Promise<AbstractProblem> {
        /**
        Get an abstract problem
    
        🔐 Authenticated        
    
        Includes owner and problems
        **/

        const [output, ofiles] = await execute("problems.getAbstractProblem", problem_nm);
        return output;
    }

    export async function getAbstractProblemExtras(problem_nm: string): Promise<AbstractProblemExtras> {
        /**
        Get extras of an abstract problem
    
        🔐 Authenticated        
    
        Includes accepted compilers and accepted proglangs
        **/

        const [output, ofiles] = await execute("problems.getAbstractProblemExtras", problem_nm);
        return output;
    }

    export async function getProblem(problem_id: string): Promise<Problem> {
        /**
        Get a problem
    
        🔐 Authenticated        
    
        Includes abstract problem, which includes owner
        **/

        const [output, ofiles] = await execute("problems.getProblem", problem_id);
        return output;
    }

    export async function getProblemExtras(problem_id: string): Promise<ProblemExtras> {
        /**
        Get extras of a problem.
    
        🔐 Authenticated        
    
        Includes accepted compilers, accepted proglangs, official solutions checks and handler specifications
        **/

        const [output, ofiles] = await execute("problems.getProblemExtras", problem_id);
        return output;
    }

    export async function getSampleTestcases(problem_id: string): Promise<Testcases> {
        /**
        Get sample testcases of a problem.
    
        🔐 Authenticated        
        **/

        const [output, ofiles] = await execute("problems.getSampleTestcases", problem_id);
        return output;
    }

    export async function getPublicTestcases(problem_id: string): Promise<Testcases> {
        /**
        Get public testcases of a problem.
    
        🔐 Authenticated        
    
        Public testcases are like sample testcases, but are not meant to be show in the problem statatement, because of their long length.
        **/

        const [output, ofiles] = await execute("problems.getPublicTestcases", problem_id);
        return output;
    }

    export async function getHtmlStatement(problem_id: string): Promise<string> {
        /**
        Get Html statement of a problem.
    
        🔐 Authenticated        
    
        Currently, this is suboptimal, but I already know how to improve it.
        **/

        const [output, ofiles] = await execute("problems.getHtmlStatement", problem_id);
        return output;
    }

    export async function getTextStatement(problem_id: string): Promise<string> {
        /**
        Get Text statement of a problem.
    
        🔐 Authenticated        
        **/

        const [output, ofiles] = await execute("problems.getTextStatement", problem_id);
        return output;
    }

    export async function getMarkdownStatement(problem_id: string): Promise<string> {
        /**
        Get Markdown statement of a problem.
    
        🔐 Authenticated        
        **/

        const [output, ofiles] = await execute("problems.getMarkdownStatement", problem_id);
        return output;
    }

    export async function getPdfStatement(problem_id: string): Promise<Download> {
        /**
        Get PDF statement of a problem.
    
        🔐 Authenticated        
        **/

        const [output, ofiles] = await execute("problems.getPdfStatement", problem_id);
        return ofiles[0];
    }

    export async function getZipStatement(problem_id: string): Promise<Download> {
        /**
        Get ZIP archive of a problem.
    
        🔐 Authenticated        
        **/

        const [output, ofiles] = await execute("problems.getZipStatement", problem_id);
        return ofiles[0];
    }
}

export namespace student {
    export namespace keys {
        export async function getAll(): Promise<AllKeys> {
            /**
            Get problem, courses (enrolled and available) and list keys.
        
            🔐 Authenticated        
            **/

            const [output, ofiles] = await execute("student.keys.getAll", null);
            return output;
        }

        export async function getProblems(): Promise<string[]> {
            /**
            Get problem keys.
        
            🔐 Authenticated        
            **/

            const [output, ofiles] = await execute("student.keys.getProblems", null);
            return output;
        }

        export async function getEnrolledCourses(): Promise<string[]> {
            /**
            Get enrolled course keys.
        
            🔐 Authenticated        
            **/

            const [output, ofiles] = await execute("student.keys.getEnrolledCourses", null);
            return output;
        }

        export async function getAvailableCourses(): Promise<string[]> {
            /**
            Get available course keys.
        
            🔐 Authenticated        
            **/

            const [output, ofiles] = await execute("student.keys.getAvailableCourses", null);
            return output;
        }

        export async function getLists(): Promise<string[]> {
            /**
            Get list keys.
        
            🔐 Authenticated        
            **/

            const [output, ofiles] = await execute("student.keys.getLists", null);
            return output;
        }
    }

    export namespace profile {
        export async function get(): Promise<Profile> {
            /**
            Get the profile.
        
            🔐 Authenticated        
            **/

            const [output, ofiles] = await execute("student.profile.get", null);
            return output;
        }

        export async function update(data: NewProfile): Promise<void> {
            /**
            Update the profile
        
            🔐 Authenticated        
            **/

            const [output, ofiles] = await execute("student.profile.update", data);
            return output;
        }

        export async function getAvatar(): Promise<Download> {
            /**
            Returns the avatar as a PNG file.
        
            🔐 Authenticated        
            **/

            const [output, ofiles] = await execute("student.profile.getAvatar", null);
            return ofiles[0];
        }

        export async function setAvatar(ifile: File): Promise<void> {
            /**
            Set a PNG file as avatar
        
            🔐 Authenticated        
            **/

            const [output, ofiles] = await execute("student.profile.setAvatar", null, [ifile]);
            return output;
        }

        export async function changePassword(data: PasswordUpdate): Promise<void> {
            /**
            Change password
        
            🔐 Authenticated        
        
            Receives the old password and the new one, and changes the password if the old one is correct
            **/

            const [output, ofiles] = await execute("student.profile.changePassword", data);
            return output;
        }
    }

    export namespace dashboard {
        export async function getAllDistributions(): Promise<Distributions> {
            /**
            Get all distributions
        
            🔐 Authenticated        
            **/

            const [output, ofiles] = await execute("student.dashboard.getAllDistributions", null);
            return output;
        }

        export async function getCompilersDistribution(): Promise<Distribution> {
            /**
            Get compilers distribution
        
            🔐 Authenticated        
            **/

            const [output, ofiles] = await execute("student.dashboard.getCompilersDistribution", null);
            return output;
        }

        export async function getDashboard(): Promise<Dashboard> {
            /**
            Get dashboard
        
            🔐 Authenticated        
            **/

            const [output, ofiles] = await execute("student.dashboard.getDashboard", null);
            return output;
        }

        export async function getHeatmapCalendar(): Promise<HeatmapCalendar> {
            /**
            Get heatmap calendar of submissions
        
            🔐 Authenticated        
            **/

            const [output, ofiles] = await execute("student.dashboard.getHeatmapCalendar", null);
            return output;
        }

        export async function getProglangsDistribution(): Promise<Distribution> {
            /**
            Get programming languages distribution
        
            🔐 Authenticated        
            **/

            const [output, ofiles] = await execute("student.dashboard.getProglangsDistribution", null);
            return output;
        }

        export async function getStats(): Promise<DashboardStats> {
            /**
            Get dashboard stats
        
            🔐 Authenticated        
            **/

            const [output, ofiles] = await execute("student.dashboard.getStats", null);
            return output;
        }

        export async function getSubmissionsByHour(): Promise<Distribution> {
            /**
            Get submissions by hour distribution
        
            🔐 Authenticated        
            **/

            const [output, ofiles] = await execute("student.dashboard.getSubmissionsByHour", null);
            return output;
        }

        export async function getSubmissionsByWeekDay(): Promise<Distribution> {
            /**
            Get submissions by weekday distribution
        
            🔐 Authenticated        
            **/

            const [output, ofiles] = await execute("student.dashboard.getSubmissionsByWeekDay", null);
            return output;
        }

        export async function getVerdictsDistribution(): Promise<Distribution> {
            /**
            Get verdicts distribution
        
            🔐 Authenticated        
            **/

            const [output, ofiles] = await execute("student.dashboard.getVerdictsDistribution", null);
            return output;
        }
    }

    export namespace submissions {
        export async function getAll(): Promise<Submissions> {
            /**
            Get all submissions.
        
            🔐 Authenticated        
        
            Flat array of submissions in chronological order.
            **/

            const [output, ofiles] = await execute("student.submissions.getAll", null);
            return output;
        }

        export async function getForAbstractProblem(problem_nm: string): Promise<DictDictSubmissions> {
            /**
            Get all submissions for an abstract problem.
        
            🔐 Authenticated        
        
            Grouped by problem.
            **/

            const [output, ofiles] = await execute("student.submissions.getForAbstractProblem", problem_nm);
            return output;
        }

        export async function getForProblem(problem_id: string): Promise<DictSubmissions> {
            /**
            Get all submissions for a problem.
        
            🔐 Authenticated        
            **/

            const [output, ofiles] = await execute("student.submissions.getForProblem", problem_id);
            return output;
        }

        export async function get(data: { problem_id: string; submission_id: string }): Promise<Submission> {
            /**
            Get a submission.
        
            🔐 Authenticated        
            **/

            const [output, ofiles] = await execute("student.submissions.get", data);
            return output;
        }

        export async function submit(
            data: { problem_id: string; compiler_id: string; annotation: string },
            ifile: File
        ): Promise<SubmissionPostOut> {
            /**
            Perform a submission.
        
            🔐 Authenticated        
            **/

            const [output, ofiles] = await execute("student.submissions.submit", data, [ifile]);
            return output;
        }
    }

    export namespace courses {
        export async function getAllAvailable(): Promise<BriefCourses> {
            /**
            Get all available courses.
        
            🔐 Authenticated        
            **/

            const [output, ofiles] = await execute("student.courses.getAllAvailable", null);
            return output;
        }

        export async function getAllEnrolled(): Promise<BriefCourses> {
            /**
            Get all enrolled courses.
        
            🔐 Authenticated        
            **/

            const [output, ofiles] = await execute("student.courses.getAllEnrolled", null);
            return output;
        }

        export async function getAvailable(course_key: string): Promise<Course> {
            /**
            Get an available course.
        
            🔐 Authenticated        
        
            Includes owner and lists.
            **/

            const [output, ofiles] = await execute("student.courses.getAvailable", course_key);
            return output;
        }

        export async function getEnrolled(course_key: string): Promise<Course> {
            /**
            Get an enrolled course.
        
            🔐 Authenticated        
        
            Includes owner and lists.
            **/

            const [output, ofiles] = await execute("student.courses.getEnrolled", course_key);
            return output;
        }

        export async function enroll(course_key: string): Promise<void> {
            /**
            Enroll in an available course.
        
            🔐 Authenticated        
            **/

            const [output, ofiles] = await execute("student.courses.enroll", course_key);
            return output;
        }

        export async function unenroll(course_key: string): Promise<void> {
            /**
            Unenroll from an enrolled course.
        
            🔐 Authenticated        
            **/

            const [output, ofiles] = await execute("student.courses.unenroll", course_key);
            return output;
        }
    }

    export namespace lists {
        export async function getAll(): Promise<BriefLists> {
            /**
            Get all lists.
        
            🔐 Authenticated        
            **/

            const [output, ofiles] = await execute("student.lists.getAll", null);
            return output;
        }

        export async function get(list_key: string): Promise<List> {
            /**
            Get a list.
        
            🔐 Authenticated        
        
            Includes items, owner.
            **/

            const [output, ofiles] = await execute("student.lists.get", list_key);
            return output;
        }
    }

    export namespace statuses {
        export async function getAll(): Promise<AbstractStatuses> {
            /**
            Get statuses for all problems.
        
            🔐 Authenticated        
            **/

            const [output, ofiles] = await execute("student.statuses.getAll", null);
            return output;
        }

        export async function getForAbstractProblem(problem_nm: string): Promise<AbstractStatus> {
            /**
            Get status for an abstract problem.
        
            🔐 Authenticated        
            **/

            const [output, ofiles] = await execute("student.statuses.getForAbstractProblem", problem_nm);
            return output;
        }

        export async function getForProblem(problem_id: string): Promise<Status> {
            /**
            Get status for a problem.
        
            🔐 Authenticated        
            **/

            const [output, ofiles] = await execute("student.statuses.getForProblem", problem_id);
            return output;
        }
    }

    export namespace awards {
        export async function getAll(): Promise<BriefAwards> {
            /**
            Get all awards.
        
            🔐 Authenticated        
            **/

            const [output, ofiles] = await execute("student.awards.getAll", null);
            return output;
        }

        export async function get(award_id: string): Promise<Award> {
            /**
            Get an award.
        
            🔐 Authenticated        
            **/

            const [output, ofiles] = await execute("student.awards.get", award_id);
            return output;
        }
    }
}

export namespace instructor {
    export namespace tags {
        export async function getAll(): Promise<string[]> {
            /**
            Get all tags
        
            🔐 Authenticated        
            **/

            const [output, ofiles] = await execute("instructor.tags.getAll", null);
            return output;
        }

        export async function getDict(): Promise<TagsDict> {
            /**
            Get all tags with their problems
        
            🔐 Authenticated        
            **/

            const [output, ofiles] = await execute("instructor.tags.getDict", null);
            return output;
        }

        export async function get(tag: string): Promise<string[]> {
            /**
            Get all problems with a given tag
        
            🔐 Authenticated        
            **/

            const [output, ofiles] = await execute("instructor.tags.get", tag);
            return output;
        }
    }

    export namespace documents {
        export async function index(): Promise<Documents> {
            /**
            Get index of all documents
        
            🔐 Authenticated        
            **/

            const [output, ofiles] = await execute("instructor.documents.index", null);
            return output;
        }

        export async function get(document_nm: string): Promise<Document> {
            /**
            Get a document (without PDF)
        
            🔐 Authenticated        
            **/

            const [output, ofiles] = await execute("instructor.documents.get", document_nm);
            return output;
        }

        export async function getPdf(document_nm: string): Promise<Download> {
            /**
            Get PDF of a document
        
            🔐 Authenticated        
            **/

            const [output, ofiles] = await execute("instructor.documents.getPdf", document_nm);
            return ofiles[0];
        }

        export async function create(data: Document, ifile: File): Promise<void> {
            /**
            Create a new document
        
            🔐 Authenticated        
            **/

            const [output, ofiles] = await execute("instructor.documents.create", data, [ifile]);
            return output;
        }

        export async function update(data: Document): Promise<void> {
            /**
            Update a document (without PDF)
        
            🔐 Authenticated        
            **/

            const [output, ofiles] = await execute("instructor.documents.update", data);
            return output;
        }

        export async function updatePdf(document_nm: string, ifile: File): Promise<void> {
            /**
            Update PDF of a document
        
            🔐 Authenticated        
            **/

            const [output, ofiles] = await execute("instructor.documents.updatePdf", document_nm, [ifile]);
            return output;
        }

        export async function remove(document_nm: string): Promise<void> {
            /**
            Remove a document (including PDF)
        
            🔐 Authenticated        
            **/

            const [output, ofiles] = await execute("instructor.documents.remove", document_nm);
            return output;
        }
    }

    export namespace lists {
        export async function index(): Promise<InstructorLists> {
            /**
            Get index of all lists
        
            🔐 Authenticated        
            **/

            const [output, ofiles] = await execute("instructor.lists.index", null);
            return output;
        }

        export async function get(list_nm: string): Promise<InstructorListWithItems> {
            /**
            Get a list with its items
        
            🔐 Authenticated        
            **/

            const [output, ofiles] = await execute("instructor.lists.get", list_nm);
            return output;
        }

        export async function getItems(list_nm: string): Promise<InstructorListItems> {
            /**
            Get the items of a list
        
            🔐 Authenticated        
            **/

            const [output, ofiles] = await execute("instructor.lists.getItems", list_nm);
            return output;
        }

        export async function create(data: InstructorList): Promise<void> {
            /**
            Create a new list
        
            🔐 Authenticated        
            **/

            const [output, ofiles] = await execute("instructor.lists.create", data);
            return output;
        }

        export async function update(data: InstructorList): Promise<void> {
            /**
            Update an existing list
        
            🔐 Authenticated        
            **/

            const [output, ofiles] = await execute("instructor.lists.update", data);
            return output;
        }

        export async function remove(list_nm: string): Promise<void> {
            /**
            Delete an existing list
        
            🔐 Authenticated        
            **/

            const [output, ofiles] = await execute("instructor.lists.remove", list_nm);
            return output;
        }

        export async function setItems(data: { list_nm: string; items: InstructorListItems }): Promise<void> {
            /**
            Set the items of a list
        
            🔐 Authenticated        
            **/

            const [output, ofiles] = await execute("instructor.lists.setItems", data);
            return output;
        }
    }

    export namespace courses {
        export async function index(): Promise<InstructorCourses> {
            /**
            Get index of all courses
        
            🔐 Authenticated        
            **/

            const [output, ofiles] = await execute("instructor.courses.index", null);
            return output;
        }

        export async function get(course_nm: string): Promise<InstructorCourseWithItems> {
            /**
            Get a course with its items (lists, courses and tutors)
        
            🔐 Authenticated        
            **/

            const [output, ofiles] = await execute("instructor.courses.get", course_nm);
            return output;
        }

        export async function getLists(course_nm: string): Promise<string[]> {
            /**
            Get lists of a course
        
            🔐 Authenticated        
            **/

            const [output, ofiles] = await execute("instructor.courses.getLists", course_nm);
            return output;
        }

        export async function getStudents(course_nm: string): Promise<CourseMembers> {
            /**
            Get students of a course
        
            🔐 Authenticated        
            **/

            const [output, ofiles] = await execute("instructor.courses.getStudents", course_nm);
            return output;
        }

        export async function getTutors(course_nm: string): Promise<CourseMembers> {
            /**
            Get tutors of a course
        
            🔐 Authenticated        
            **/

            const [output, ofiles] = await execute("instructor.courses.getTutors", course_nm);
            return output;
        }

        export async function create(data: InstructorCourse): Promise<void> {
            /**
            Create a new course
        
            🔐 Authenticated        
            **/

            const [output, ofiles] = await execute("instructor.courses.create", data);
            return output;
        }

        export async function update(data: InstructorCourse): Promise<void> {
            /**
            Update an existing course
        
            🔐 Authenticated        
            **/

            const [output, ofiles] = await execute("instructor.courses.update", data);
            return output;
        }

        export async function remove(course_nm: string): Promise<void> {
            /**
            Delete an existing course
        
            🔐 Authenticated        
        
            Note: A course should not be deleted. Ask a system administrator to remove it.
            **/

            const [output, ofiles] = await execute("instructor.courses.remove", course_nm);
            return output;
        }

        export async function setLists(data: { course_nm: string; lists: string[] }): Promise<void> {
            /**
            Set lists of a course
        
            🔐 Authenticated        
            **/

            const [output, ofiles] = await execute("instructor.courses.set_lists", data);
            return output;
        }

        export async function inviteStudents(data: { course_nm: string; emails: string[] }): Promise<void> {
            /**
            Invite students to a course
        
            🔐 Authenticated        
            **/

            const [output, ofiles] = await execute("instructor.courses.invite_students", data);
            return output;
        }

        export async function inviteTutors(data: { course_nm: string; emails: string[] }): Promise<void> {
            /**
            Invite tutors to a course
        
            🔐 Authenticated        
            **/

            const [output, ofiles] = await execute("instructor.courses.invite_tutors", data);
            return output;
        }

        export async function removeStudents(data: { course_nm: string; emails: string[] }): Promise<void> {
            /**
            Remove students from a course
        
            🔐 Authenticated        
            **/

            const [output, ofiles] = await execute("instructor.courses.remove_students", data);
            return output;
        }

        export async function removeTutors(data: { course_nm: string; emails: string[] }): Promise<void> {
            /**
            Remove tutors from a course
        
            🔐 Authenticated        
            **/

            const [output, ofiles] = await execute("instructor.courses.remove_tutors", data);
            return output;
        }
    }

    export namespace exams {
        export async function index(): Promise<InstructorExams> {
            /**
            Get index of all exams
        
            🔐 Authenticated        
            **/

            const [output, ofiles] = await execute("instructor.exams.index", null);
            return output;
        }

        export async function get(exam_nm: string): Promise<InstructorExamWithItems> {
            /**
            Get an exam with its items (course, problems, documents, students)
        
            🔐 Authenticated        
            **/

            const [output, ofiles] = await execute("instructor.exams.get", exam_nm);
            return output;
        }

        export async function create(data: InstructorExamCreation): Promise<void> {
            /**
            Create a new exam
        
            🔐 Authenticated        
            **/

            const [output, ofiles] = await execute("instructor.exams.create", data);
            return output;
        }

        export async function update(data: InstructorExamCreation): Promise<void> {
            /**
            Update an existing exam
        
            🔐 Authenticated        
            **/

            const [output, ofiles] = await execute("instructor.exams.update", data);
            return output;
        }

        export async function remove(exam_nm: string): Promise<void> {
            /**
            Delete an existing exam
        
            🔐 Authenticated        
        
            Note: An exam can only be deleted if it has not started.
            **/

            const [output, ofiles] = await execute("instructor.exams.remove", exam_nm);
            return output;
        }

        export async function getDocuments(exam_nm: string): Promise<InstructorExamDocuments> {
            /**
            Get documents of an exam
        
            🔐 Authenticated        
            **/

            const [output, ofiles] = await execute("instructor.exams.getDocuments", exam_nm);
            return output;
        }

        export async function getCourse(exam_nm: string): Promise<InstructorExamCourse> {
            /**
            Get course of an exam
        
            🔐 Authenticated        
            **/

            const [output, ofiles] = await execute("instructor.exams.getCourse", exam_nm);
            return output;
        }

        export async function getProblems(exam_nm: string): Promise<InstructorExamProblems> {
            /**
            Get problems of an exam
        
            🔐 Authenticated        
            **/

            const [output, ofiles] = await execute("instructor.exams.getProblems", exam_nm);
            return output;
        }

        export async function getStudents(exam_nm: string): Promise<InstructorExamStudents> {
            /**
            Get students of an exam
        
            🔐 Authenticated        
            **/

            const [output, ofiles] = await execute("instructor.exams.getStudents", exam_nm);
            return output;
        }

        export async function getStudent(data: { exam_nm: string; email: string }): Promise<InstructorExamStudent> {
            /**
            Get an student of an exam
        
            🔐 Authenticated        
            **/

            const [output, ofiles] = await execute("instructor.exams.getStudent", data);
            return output;
        }

        export async function getSubmissions(data: {
            exam_nm: string
            options: InstructorExamSubmissionsOptions
        }): Promise<Pack> {
            /**
            Get submissions of an exam
        
            🔐 Authenticated        
        
            This endpoint prepares a ZIP file to download the submissions of an exam. Preparing the ZIP file takes some time, an href link to the ZIP will be returned. This ZIP file will be available for download for a limited time. 
            **/

            const [output, ofiles] = await execute("instructor.exams.getSubmissions", data);
            return output;
        }

        export async function setDocuments(data: { exam_nm: string; document_nms: string[] }): Promise<void> {
            /**
            Set documents of an exam
        
            🔐 Authenticated        
            **/

            const [output, ofiles] = await execute("instructor.exams.setDocuments", data);
            return output;
        }

        export async function setProblems(data: { exam_nm: string; problems: InstructorExamProblems }): Promise<void> {
            /**
            Set problems of an exam
        
            🔐 Authenticated        
            **/

            const [output, ofiles] = await execute("instructor.exams.setProblems", data);
            return output;
        }

        export async function setStudents(data: {
            exam_nm: string
            students: InstructorExamStudentsPost
        }): Promise<void> {
            /**
            Set students of an exam
        
            🔐 Authenticated        
            **/

            const [output, ofiles] = await execute("instructor.exams.setStudents", data);
            return output;
        }

        export async function addStudents(data: {
            exam_nm: string
            students: InstructorExamStudentsPost
        }): Promise<void> {
            /**
            Add students to an exam
        
            🔐 Authenticated        
            **/

            const [output, ofiles] = await execute("instructor.exams.addStudents", data);
            return output;
        }

        export async function removeStudents(data: { exam_nm: string; emails: string[] }): Promise<void> {
            /**
            Remove students from an exam
        
            🔐 Authenticated        
            **/

            const [output, ofiles] = await execute("instructor.exams.removeStudents", data);
            return output;
        }
    }

    export namespace queries {
        export async function ricard01(data: { course_nm: string; problem_nm: string }): Promise<SubmissionsQuery> {
            /**
            The old and venerable ricard01 query. 😀
        
            🔐 Authenticated        
        
            Returns a list of submissions for a given problem for all students of a given course. Each submission includes the email, time, problem name, problem id, verdict, and IP address. The list is ordered by email and time.
            **/

            const [output, ofiles] = await execute("instructor.queries.ricard01", data);
            return output;
        }

        export async function ricard02(data: { course_nm: string; list_nm: string }): Promise<SubmissionsQuery> {
            /**
            The old and venerable ricard02 query. 😀
        
            🔐 Authenticated        
        
            Returns a list of submissions for all problems in a given list for all students of a given course. Each submission includes the email, time, problem name, problem id, verdict, and IP address. The list is ordered by email, problem id and time.
            **/

            const [output, ofiles] = await execute("instructor.queries.ricard02", data);
            return output;
        }
    }

    export namespace problems {
        export async function getPasscode(problem_nm: string): Promise<string> {
            /**
            Get the passcode of a problem.
        
            🔐 Authenticated        
        
            Returns an empty string if the problem has no passcode.
            **/

            const [output, ofiles] = await execute("instructor.problems.getPasscode", problem_nm);
            return output;
        }

        export async function setPasscode(data: { problem_nm: string; passcode: string }): Promise<void> {
            /**
            Set or update the passcode of a problem.
        
            🔐 Authenticated        
        
            The passcode must be at least 8 characters long and contain only alphanumeric characters. The passcode will be stored in the database in plain text.
            **/

            const [output, ofiles] = await execute("instructor.problems.setPasscode", data);
            return output;
        }

        export async function removePasscode(problem_nm: string): Promise<void> {
            /**
            Remove passcode of a problem.
        
            🔐 Authenticated        
            **/

            const [output, ofiles] = await execute("instructor.problems.removePasscode", problem_nm);
            return output;
        }

        export async function deprecate(data: { problem_nm: string; reason: string }): Promise<void> {
            /**
            Deprecate a problem.
        
            🔐 Authenticated        
            **/

            const [output, ofiles] = await execute("instructor.problems.deprecate", data);
            return output;
        }

        export async function undeprecate(problem_nm: string): Promise<void> {
            /**
            Undeprecate a problem.
        
            🔐 Authenticated        
            **/

            const [output, ofiles] = await execute("instructor.problems.undeprecate", problem_nm);
            return output;
        }

        export async function download(problem_nm: string): Promise<Download> {
            /**
            Download a problem.
        
            🔐 Authenticated        
        
            Quick and dirty implementation, should be improved. Returns a zip file with the abstract problem and all its problems.
            **/

            const [output, ofiles] = await execute("instructor.problems.download", problem_nm);
            return ofiles[0];
        }
    }
}

export namespace admin {
    export namespace users {
        export async function count(): Promise<number> {
            /**
            Count users
        
            🔐 Authenticated        
            **/

            const [output, ofiles] = await execute("admin.users.count", null);
            return output;
        }

        export async function create(data: UserCreation): Promise<void> {
            /**
            Create a user
        
            🔐 Authenticated        
            **/

            const [output, ofiles] = await execute("admin.users.create", data);
            return output;
        }

        export async function remove(email: string): Promise<void> {
            /**
            Remove a user
        
            🔐 Authenticated        
            **/

            const [output, ofiles] = await execute("admin.users.remove", email);
            return output;
        }

        export async function setPassword(data: { email: string; password: string }): Promise<void> {
            /**
            Set a password for a user
        
            🔐 Authenticated        
            **/

            const [output, ofiles] = await execute("admin.users.setPassword", data);
            return output;
        }
    }

    export namespace tasks {
        export async function purgeAuthTokens(): Promise<void> {
            /**
            Purge expired access tokens
        
            🔐 Authenticated        
        
            Purge expired access tokens (call it from time to time, it does not hurt)
            **/

            const [output, ofiles] = await execute("admin.tasks.purge-auth-tokens", null);
            return output;
        }

        export async function clearCaches(): Promise<void> {
            /**
            Clear all memoization caches
        
            🔐 Authenticated        
            **/

            const [output, ofiles] = await execute("admin.tasks.clear-caches", null);
            return output;
        }
    }

    export namespace stats {
        export async function getCounters(): Promise<Distribution> {
            /**
            Get counters
        
            🔐 Authenticated        
            **/

            const [output, ofiles] = await execute("admin.stats.getCounters", null);
            return output;
        }

        export async function getDistributionOfVerdicts(): Promise<Distribution> {
            /**
            Get distribution of verdicts
        
            🔐 Authenticated        
            **/

            const [output, ofiles] = await execute("admin.stats.getDistributionOfVerdicts", null);
            return output;
        }

        export async function getDistributionOfVerdictsByYear(): Promise<Distribution> {
            /**
            Get distribution of verdicts by year
        
            🔐 Authenticated        
            **/

            const [output, ofiles] = await execute("admin.stats.getDistributionOfVerdictsByYear", null);
            return output;
        }

        export async function getDistributionOfCompilers(): Promise<Distribution> {
            /**
            Get distribution of compilers
        
            🔐 Authenticated        
            **/

            const [output, ofiles] = await execute("admin.stats.getDistributionOfCompilers", null);
            return output;
        }

        export async function getDistributionOfProglangs(): Promise<Distribution> {
            /**
            Get distribution of proglangs
        
            🔐 Authenticated        
            **/

            const [output, ofiles] = await execute("admin.stats.getDistributionOfProglangs", null);
            return output;
        }

        export async function getDistributionOfUsersByYear(): Promise<Distribution> {
            /**
            Get distribution of registered users by year
        
            🔐 Authenticated        
            **/

            const [output, ofiles] = await execute("admin.stats.getDistributionOfUsersByYear", null);
            return output;
        }

        export async function getDistributionOfUsersByCountry(): Promise<Distribution> {
            /**
            Get distribution of registered users by country
        
            🔐 Authenticated        
            **/

            const [output, ofiles] = await execute("admin.stats.getDistributionOfUsersByCountry", null);
            return output;
        }

        export async function getDistributionOfUsersBySubmissions(data: number): Promise<Distribution> {
            /**
            Get distribution of registered users by submissions using a custom bucket size
        
            🔐 Authenticated        
            **/

            const [output, ofiles] = await execute("admin.stats.getDistributionOfUsersBySubmissions", data);
            return output;
        }

        export async function getRankingOfUsers(data: string | number): Promise<UserRanking> {
            /**
            Get ranking of users
        
            🔐 Authenticated    
            ❌ Warning: Input type is not correct    
            **/

            const [output, ofiles] = await execute("admin.stats.getRankingOfUsers", data);
            return output;
        }

        export async function getDistributionOfSubmissionsByHour(): Promise<Distribution> {
            /**
            Get distribution of submissions by hour
        
            🔐 Authenticated        
            **/

            const [output, ofiles] = await execute("admin.stats.getDistributionOfSubmissionsByHour", null);
            return output;
        }

        export async function getDistributionOfSubmissionsByProglang(): Promise<Distribution> {
            /**
            Get distribution of submissions by proglang
        
            🔐 Authenticated        
            **/

            const [output, ofiles] = await execute("admin.stats.getDistributionOfSubmissionsByProglang", null);
            return output;
        }

        export async function getDistributionOfSubmissionsByCompiler(): Promise<Distribution> {
            /**
            Get distribution of submissions by compiler
        
            🔐 Authenticated        
            **/

            const [output, ofiles] = await execute("admin.stats.getDistributionOfSubmissionsByCompiler", null);
            return output;
        }

        export async function getDistributionOfSubmissionsByWeekday(): Promise<Distribution> {
            /**
            Get distribution of submissions by weekday
        
            🔐 Authenticated        
            **/

            const [output, ofiles] = await execute("admin.stats.getDistributionOfSubmissionsByWeekday", null);
            return output;
        }

        export async function getDistributionOfSubmissionsByYear(): Promise<Distribution> {
            /**
            Get distribution of submissions by year
        
            🔐 Authenticated        
            **/

            const [output, ofiles] = await execute("admin.stats.getDistributionOfSubmissionsByYear", null);
            return output;
        }

        export async function getDistributionOfSubmissionsByYearForProglang(proglang: string): Promise<Distribution> {
            /**
            Get distribution of submissions by year for a proglang
        
            🔐 Authenticated        
            **/

            const [output, ofiles] = await execute(
                "admin.stats.getDistributionOfSubmissionsByYearForProglang",
                proglang
            );
            return output;
        }

        export async function getDistributionOfSubmissionsByDay(): Promise<Distribution> {
            /**
            Get distribution of submissions by day
        
            🔐 Authenticated        
            **/

            const [output, ofiles] = await execute("admin.stats.getDistributionOfSubmissionsByDay", null);
            return output;
        }

        export async function getHeatmapCalendarOfSubmissions(): Promise<HeatmapCalendar> {
            /**
            Get heatmap calendar of submissions
        
            🔐 Authenticated        
        
            Data is provided as required by https://cal-heatmap.com
            **/

            const [output, ofiles] = await execute("admin.stats.getHeatmapCalendarOfSubmissions", null);
            return output;
        }

        export async function getUpcomingExams(): Promise<UpcomingExams> {
            /**
            Get upcoming exams
        
            🔐 Authenticated        
            **/

            const [output, ofiles] = await execute("admin.stats.getUpcomingExams", null);
            return output;
        }
    }

    export namespace problems {
        export async function getProblemSolution(data: { problem_id: string; proglang: string }): Promise<string> {
            /**
            Get official solution for a problem for a proglang
        
            🔐 Authenticated    
            ❌ Warning: TODO    
            **/

            const [output, ofiles] = await execute("admin.problems.getProblemSolution", data);
            return output;
        }
    }
}

export namespace check {
    export async function checkUser(): Promise<void> {
        /**
        Checks that query actor is a user
    
        🔐 Authenticated        
        **/

        const [output, ofiles] = await execute("check.checkUser", null);
        return output;
    }

    export async function checkInstructor(): Promise<void> {
        /**
        Checks that query actor is an instructor
    
        🔐 Authenticated        
        **/

        const [output, ofiles] = await execute("check.checkInstructor", null);
        return output;
    }

    export async function checkAdmin(): Promise<void> {
        /**
        Checks that query actor is an admin
    
        🔐 Authenticated        
        **/

        const [output, ofiles] = await execute("check.checkAdmin", null);
        return output;
    }

    export async function throwError(exception: string): Promise<void> {
        /**
        Throw an exception of the given type        
        **/

        const [output, ofiles] = await execute("check.throwError", exception);
        return output;
    }
}

export namespace playground {
    export async function upload(data: Name, ifile: File): Promise<string> {
        /**
        Upload a file        
        **/

        const [output, ofiles] = await execute("playground.upload", data, [ifile]);
        return output;
    }

    export async function negate(ifile: File): Promise<Download> {
        /**
        Get negative of an image        
        **/

        const [output, ofiles] = await execute("playground.negate", null, [ifile]);
        return ofiles[0];
    }

    export async function download(data: Name): Promise<Download> {
        /**
        Download a file        
        **/

        const [output, ofiles] = await execute("playground.download", data);
        return ofiles[0];
    }

    export async function download2(data: Name): Promise<[string, Download]> {
        /**
        Download a file with a string        
        **/

        const [output, ofiles] = await execute("playground.download2", data);
        return [output, ofiles[0]];
    }

    export async function ping(): Promise<string> {
        /**
        Ping the server to get a pong string        
        **/

        const [output, ofiles] = await execute("playground.ping", null);
        return output;
    }

    export async function toUpperCase(s: string): Promise<string> {
        /**
        Returns the given string in uppercase        
        **/

        const [output, ofiles] = await execute("playground.toUpperCase", s);
        return output;
    }

    export async function add2i(data: TwoInts): Promise<number> {
        /**
        Returns the sum of two integers        
        **/

        const [output, ofiles] = await execute("playground.add2i", data);
        return output;
    }

    export async function add2f(data: TwoFloats): Promise<number> {
        /**
        Returns the sum of two floats        
        **/

        const [output, ofiles] = await execute("playground.add2f", data);
        return output;
    }

    export async function inc(data: TwoInts): Promise<TwoInts> {
        /**
        increment two numbers        
        **/

        const [output, ofiles] = await execute("playground.inc", data);
        return output;
    }

    export async function add3i(data: { a: number; b: number; c: number }): Promise<number> {
        /**
        Returns the sum of three integers        
        **/

        const [output, ofiles] = await execute("playground.add3i", data);
        return output;
    }
}
