/**
 * This file has been automatically generated at 2026-11-05T15:32:41.152Z
 *
 * Name:    Jutge API
 * Version: 2.0.0
 *
 * Description: Jutge API
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */

// Type for dates
type Iso8601Date = string // Example: "2026-12-31T11:00:00.000+01:00" is the 31st of December 2026 at 11:00:00 in Barcelona in Winter Time

// Models

export type CredentialsIn = {
    email: string
    password: string
}

export type ExamCredentialsIn = {
    email: string
    password: string
    exam: string
    exam_password: string
}

export type CredentialsOut = {
    token: string
    expiration: Iso8601Date
    user_uid: string
    error: string
}

export type CredentialsWithUsernameIn = {
    username: string
    password: string
}

export type RegisterIn = {
    name: string
    email: string
    birth_year: number
    parent_email: string | null
    country_id: string
    policies_agreement: boolean
    password: string
    recaptcha_token: string
}

export type RequestPasswordResetIn = {
    email: string
    recaptcha_token: string
}

export type ConfirmPasswordRequestIn = {
    email: string
    code: string
    password: string
    recaptcha_token: string
}

export type RequestUnregistrationIn = {
    password: string
    recaptcha_token: string
}

export type ConfirmUnregistrationIn = ConfirmPasswordRequestIn

export type RequestChangeEmailIn = {
    old_email: string
    new_email: string
    password: string
    recaptcha_token: string
}

export type ConfirmChangeEmailIn = {
    old_email: string
    new_email: string
    old_email_code: string
    new_email_code: string
    password: string
    recaptcha_token: string
}

export type Time = {
    full_time: string
    int_timestamp: number
    float_timestamp: number
    time: string
    date: string
}

export type RecentSubmissions = {
    latest_01_minutes: number
    latest_05_minutes: number
    latest_15_minutes: number
    latest_60_minutes: number
}

export type HomepageStats = {
    users: number
    problems: number
    submissions: number
    exams: number
    contests: number
    recent_submissions: RecentSubmissions
}

export type ColorMapping = Record<string, Record<string, string>>

export type ApiVersion = {
    version: string
    mode: string
    gitHash: string
    gitBranch: string
    gitDate: string
}

export type RequestInformation = {
    url: string
    ip: string
    domain: string
}

export type TranslationIn = {
    text: string // Text to translate.
    from: string // Source language code (ISO 639-1), or "auto" to detect it.
    to: string // Target language code (ISO 639-1).
}

export type TranslationOut = {
    text: string // Translated text.
    from: string // Source language code used. Detected when the request used "auto".
}

export type Language = {
    language_id: string // Id of the language
    eng_name: string // English name of the language
    own_name: string // Name of the language in its own language
}

export type Country = {
    country_id: string // Id of the country
    eng_name: string // English name of the country
}

export type Compiler = {
    compiler_id: string // Id of the compiler
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

export type Driver = {
    driver_id: string // Id of the driver
}

export type Verdict = {
    verdict_id: string // Id of the verdict
    name: string
    description: string
    emoji: string
}

export type Proglang = {
    proglang_id: string // Id of the proglang
}

export type Timezone = {
    timezone_id: string // Id of the timezone
}

export type AllTables = {
    languages: Record<string, Language>
    countries: Record<string, Country>
    compilers: Record<string, Compiler>
    drivers: Record<string, Driver>
    verdicts: Record<string, Verdict>
    proglangs: Record<string, Proglang>
}

export type PublicProfile = {
    email: string
    name: string
    username: string | null
    nickname: string | null
}

export type PublicCourse = {
    course_nm: string // The name of the course
    title: string // The title of the course
    description: string // The description of the course
    public: number // Indicates if the course is public (1) or private (0)
    official: number // Indicates if the course is official (1) or not (0)
    icon: string | null
    lists: string[]
    problem_count: number // Total number of problems in the course lists
    owner: PublicProfile
}

export type PublicCourses = Record<string, PublicCourse>

export type ProblemSummary = {
    summary_1s: string // One sentence summary
    summary_1p: string // One paragraph summary
    keywords: string // Comma separated keywords
    model: string // system/model
    duration: number // Time in seconds to generate
}

export type SolutionTags = {
    tags: string // Comma separated tags
    model: string // system/model
    duration: number // Time in seconds to generate
}

export type BriefAbstractProblem = {
    problem_nm: string
    author: string | null
    author_email: string | null
    icon: string | null
    public: number | null
    official: number | null
    compilers: string | null
    driver_id: string | null
    type: string | null
    deprecation: string | null
    created_at: Iso8601Date
    updated_at: Iso8601Date
    solution_tags: SolutionTags | null
    shared_solutions: number // Whether the solutions are shared with instructors
    shared_testcases: number // Whether the testcases are shared with instructors
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
    summary: ProblemSummary | null
}

export type BriefProblemDict = Record<string, BriefProblem>

export type AbstractProblem = {
    problem_nm: string
    author: string | null
    author_email: string | null
    icon: string | null
    public: number | null
    official: number | null
    compilers: string | null
    driver_id: string | null
    type: string | null
    deprecation: string | null
    created_at: Iso8601Date
    updated_at: Iso8601Date
    solution_tags: SolutionTags | null
    shared_solutions: number // Whether the solutions are shared with instructors
    shared_testcases: number // Whether the testcases are shared with instructors
    problems: BriefProblemDict
}

export type AbstractProblemSuppl = {
    compilers_with_ac: string[]
    proglangs_with_ac: string[]
}

export type AbstractProblemSuppls = Record<string, AbstractProblemSuppl>

export type ProblemSuppl = {
    compilers_with_ac: string[]
    proglangs_with_ac: string[]
    official_solution_checks: Record<string, boolean>
    handler: any
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
    summary: ProblemSummary | null
    abstract_problem: BriefAbstractProblem
}

export type Testcase = {
    name: string
    input_b64: string
    correct_b64: string
}

export type ProblemRich = {
    problem_id: string
    problem_nm: string
    language_id: string
    title: string
    original_language_id: string
    translator: string | null
    translator_email: string | null
    checked: number | null
    summary: ProblemSummary | null
    abstract_problem: BriefAbstractProblem
    sample_testcases: Testcase[]
    html_statement: string
}

export type SearchResult = {
    problem_nm: string
    score: number
}

export type SearchResults = SearchResult[]

export type GetSomeAbstractProblemsIn = {
    regexp: string
    limit: number
}

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
    birth_year: number | null
    max_subsxhour: number
    max_subsxday: number
    administrator: number
    instructor: number
    tutor: number
    parent_email: string | null
    country_id: string | null
    timezone_id: string
    compiler_id: string | null
    language_id: string | null
}

export type NewProfile = {
    name: string
    birth_year: number | null
    nickname: string | null
    webpage: string | null
    affiliation: string | null
    description: string | null
    country_id: string | null
    timezone_id: string | null
    compiler_id: string | null
    language_id: string | null
}

export type NewPassword = {
    oldPassword: string
    newPassword: string
}

export type DateValue = {
    date: number
    value: number
}

export type HeatmapCalendar = DateValue[]

export type Distribution = Record<string, number>

export type AllDistributions = {
    verdicts: Distribution
    compilers: Distribution
    proglangs: Distribution
    submissions_by_hour: Distribution
    submissions_by_weekday: Distribution
}

export type Dashboard = {
    stats: Distribution
    heatmap: HeatmapCalendar
    distributions: AllDistributions
}

export type DateRange2 = {
    start_time: string
    end_time: string
}

export type Submission = {
    problem_id: string
    submission_id: string
    compiler_id: string
    annotation: string | null
    state: string
    time_in: Iso8601Date
    veredict: string | null
    veredict_info: string | null
    veredict_publics: string | null
    ok_publics_but_wrong: number
}

export type NewSubmissionIn = {
    problem_id: string
    compiler_id: string
    annotation: string
    extraSubmissionInfo: any
}

export type NewSubmissionOut = {
    submission_id: string
}

export type CompilationErrors = {
    compilation1: string | null
    compilation2: string | null
    linkage: string | null
    interface: string | null
}

export type SubmissionAnalysis = {
    testcase: string
    execution: string
    verdict: string
}

export type TestcaseAnalysis = {
    testcase: string
    execution: string
    verdict: string
    input_b64: string
    output_b64: string
    expected_b64: string
}

export type GetGameResultIn = {
    problem_id: string
    submission_id: string
}

export type MatchSchema = {
    seed: number
    status: number[]
    players: string[]
    scores: number[]
}

export type ProblemSchema = {
    author: string
    description: string
    email: string
    gamename: string
    title: string
    version: number
}

export type SubmissionSchema = {
    compiler_id: string
    description: string
    email: string
    problem_id: string
}

export type GetGameResultOut = {
    games: MatchSchema[]
}

export type GetGameOutputIn = {
    problem_id: string
    submission_id: string
    game_id: number
}

export type CodeMetrics = {
    comment_ratio: number
    cyclomatic_complexity: number
    fanout_external: number
    fanout_internal: number
    halstead_bugprop: number
    halstead_difficulty: number
    halstead_effort: number
    halstead_timerequired: number
    halstead_volume: number
    loc: number
    maintainability_index: number
    operands_sum: number
    operands_uniq: number
    operators_sum: number
    operators_uniq: number
    pylint: number
    tiobe: number
    tiobe_compiler: number
    tiobe_complexity: number
    tiobe_coverage: number
    tiobe_duplication: number
    tiobe_fanout: number
    tiobe_functional: number
    tiobe_security: number
    tiobe_standard: number
}

export type CodeMetricsResult = {
    userMetrics: CodeMetrics | null
    solutionMetrics: CodeMetrics | null
}

export type ScoringPart = {
    testcase: string
    verdict: string
    verdict_info: string | null
    points: number
    correct_points: number
}

export type Scoring = ScoringPart[] | null

export type DebugDirectories = {
    problem: string
    submission: string
    correction: string
    submission_uid: string
}

export type DebugInformation = {
    correction: any
    solution: any
    stderr: string | null
    stdout: string | null
    directories: DebugDirectories | null
}

export type BriefCourse = {
    course_nm: string
    title: string | null
    description: string | null
    public: number
    official: number
    icon: string | null
    owner: PublicProfile
    enrollment: string | string | string
}

export type Course = {
    course_nm: string
    title: string | null
    description: string | null
    public: number
    official: number
    icon: string | null
    owner: PublicProfile
    enrollment: string | string | string
    lists: string[]
}

export type ListItem = {
    problem_nm: string | null
    description: string | null
}

export type BriefList = {
    list_nm: string
    title: string | null
    description: string | null
    annotation: string | null
    public: number
    official: number
}

export type List = {
    list_nm: string
    title: string | null
    description: string | null
    annotation: string | null
    public: number
    official: number
    items: ListItem[]
    owner: PublicProfile
}

export type Passcode = {
    problem_nm: string
    passcode: string
}

export type ReadyExam = {
    exam_key: string // Unique key for the exam, in the format "username:exam_nm"
    title: string
    place: string
    description: string
    exp_time_start: Iso8601Date
    running_time: number
    contest: boolean
}

export type RunningExamProblem = {
    problem_nm: string
    icon: string | null
    caption: string | null
    weight: number | null
}

export type RunningExamDocument = {
    document_nm: string
    title: string
    description: string
}

export type RunningExam = {
    title: string
    description: string
    instructions: string
    time_start: Iso8601Date | null
    exp_time_start: Iso8601Date
    extra_minutes: number
    running_time: number
    contest: number
    problems: RunningExamProblem[]
    compilers: string[]
    documents: RunningExamDocument[]
}

export type StudentExamCourse = {
    course_nm: string
    title: string
    icon: string | null
}

export type BriefExam = {
    exam_key: string // Unique key for the exam, in the format "username:exam_nm"
    title: string // Title of the exam
    place: string // Place of the exam
    description: string // Description of the exam in Markdown format
    contest: boolean // Whether the exam is a contest
    course: StudentExamCourse
    owner: PublicProfile
    visible_submissions: boolean // Whether submissions are visible to the user outside the exam
    status: string // Status of the exam: upcoming|started|finished
    exp_time_start: Iso8601Date // Expected start time of the exam
    running_time: number // Nomimal running time of the exam (in minutes)
    time_start: Iso8601Date | null
    time_end: Iso8601Date | null
}

export type BriefExams = Record<string, BriefExam>

export type Exam = {
    exam_key: string // Unique key for the exam, in the format "username:exam_nm"
    title: string // Title of the exam
    place: string // Place of the exam
    description: string // Description of the exam in Markdown format
    contest: boolean // Whether the exam is a contest
    course: StudentExamCourse
    owner: PublicProfile
    visible_submissions: boolean // Whether submissions are visible to the user outside the exam
    status: string // Status of the exam: upcoming|started|finished
    exp_time_start: Iso8601Date // Expected start time of the exam
    running_time: number // Nomimal running time of the exam (in minutes)
    time_start: Iso8601Date | null
    time_end: Iso8601Date | null
    problems: string[] // List of problem_nms
    submissions: Submission[]
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
    time: Iso8601Date
    type: string
    icon: string
    title: string
    info: string
    youtube: string | null
    submission: Submission | null
}

export type BriefAward = {
    award_id: string
    time: Iso8601Date
    type: string
    icon: string
    title: string
    info: string
    youtube: string | null
}

export type Settings = Record<string, any>

export type Setting = {
    key: string
    value: any
}

export type TradingCard = {
    card_id: string
    title: string
    created_at: Iso8601Date
    updated_at: Iso8601Date
}

export type TradingCards = TradingCard[]

export type EnrolledStudent = {
    name: string
    email: string
}

export type EnrolledTutor = EnrolledStudent

export type CourseSubmission = {
    time: string
    user_uid: string
    email: string
    problem_id: string
    submission_id: string
    verdict: string
    compiler_id: string
    proglang: string
}

export type TutorSubmission = {
    problem_id: string
    submission_id: string
    compiler_id: string
    annotation: string | null
    state: string
    time_in: Iso8601Date
    veredict: string | null
    veredict_info: string | null
    veredict_publics: string | null
    ok_publics_but_wrong: number
    exam_submission_id: string | null
}

export type Document = {
    document_nm: string // Document name
    title: string // The title of the document
    description: string // The description of the document
    type: string // The type of the document: pdf|zip
    created_at: Iso8601Date // The date when the document was created
    updated_at: Iso8601Date // The date when the document was last updated
}

export type DocumentCreation = {
    document_nm: string // Document name
    title: string // The title of the document
    description: string // The description of the document
}

export type DocumentUpdate = DocumentCreation

export type InstructorBriefList = {
    list_nm: string // The name of the list
    title: string // The title of the list
    description: string // The description of the list
    annotation: string // Additional private annotations for the list
    official: number // Indicates if the list is official (1) or not (0) TODO
    public: number // Indicates if the list is public (1) or private (0) TODO
    created_at: Iso8601Date // Creation date of the list
    updated_at: Iso8601Date // Last update date of the list
}

export type InstructorListItem = {
    problem_nm: string | null
    description: string | null
}

export type InstructorListItems = InstructorListItem[]

export type InstructorList = {
    list_nm: string // The name of the list
    title: string // The title of the list
    description: string // The description of the list
    annotation: string // Additional private annotations for the list
    official: number // Indicates if the list is official (1) or not (0) TODO
    public: number // Indicates if the list is public (1) or private (0) TODO
    created_at: Iso8601Date // Creation date of the list
    updated_at: Iso8601Date // Last update date of the list
    items: InstructorListItems
}

export type InstructorListCreation = {
    list_nm: string // The name of the list
    title: string // The title of the list
    description: string // The description of the list
    annotation: string // Additional private annotations for the list
    official: number // Indicates if the list is official (1) or not (0) TODO
    public: number // Indicates if the list is public (1) or private (0) TODO
    items: InstructorListItems
}

export type InstructorListUpdate = InstructorListCreation

export type InstructorBriefCourse = {
    course_nm: string // The name of the course
    title: string // The title of the course
    description: string // The description of the course
    annotation: string // Additional private annotations for the course
    official: number // Indicates if the course is official (1) or not (0) TODO
    public: number // Indicates if the course is public (1) or private (0) TODO
    icon: string | null
    created_at: Iso8601Date // Creation date of the course
    updated_at: Iso8601Date // Last update date of the course
}

export type CourseMembers = {
    invited: string[]
    enrolled: string[]
    pending: string[]
}

export type InstructorCourse = {
    course_nm: string // The name of the course
    title: string // The title of the course
    description: string // The description of the course
    annotation: string // Additional private annotations for the course
    official: number // Indicates if the course is official (1) or not (0) TODO
    public: number // Indicates if the course is public (1) or private (0) TODO
    icon: string | null
    created_at: Iso8601Date // Creation date of the course
    updated_at: Iso8601Date // Last update date of the course
    lists: string[]
    students: CourseMembers
    tutors: CourseMembers
}

export type StudentProfile = {
    name: string // The name of the student
    email: string // The email of the student
}

export type InstructorCourseCreation = {
    course_nm: string // The name of the course
    title: string // The title of the course
    description: string // The description of the course
    annotation: string // Additional private annotations for the course
    official: number // Indicates if the course is official (1) or not (0) TODO
    public: number // Indicates if the course is public (1) or private (0) TODO
    lists: string[] | null
    students: CourseMembers | null
    tutors: CourseMembers | null
}

export type InstructorCourseUpdate = {
    course_nm: string // Name of the course
    title: string | null
    description: string | null
    annotation: string | null
    official: number | null
    public: number | null
    lists: string[] | null
    students: CourseMembers | null
    tutors: CourseMembers | null
}

export type InstructorExamCourse = {
    course_nm: string // Course name
    title: string // Title of the course
}

export type InstructorExamDocument = {
    document_nm: string // Document name
    title: string // Title of the document
    description: string // Description of the document
}

export type InstructorExamCompiler = {
    compiler_id: string // Compiler ID
    name: string // Name of the compiler
}

export type InstructorExamProblem = {
    problem_nm: string // Problem nm
    weight: number | null
    icon: string | null
    caption: string | null
}

export type InstructorExamStudent = {
    email: string // Email of the student
    name: string | null
    code: string | null
    restricted: number // Whether the student is restricted
    annotation: string | null
    result: string | null
    finished: number // Whether the student has finished the exam
    banned: number // Whether the student is banned from the exam
    reason_ban: string | null
    inc: number | null
    reason_inc: string | null
    taken_exam: number // Whether the student has logged in to the exam
    emergency_password: string | null
    invited: number // Whether the student is invited (excluded from the ranking) (only used in contests)
}

export type InstructorExamCreation = {
    exam_nm: string // Exam name
    course_nm: string // Course name
    title: string // Title of the exam
    exp_time_start: Iso8601Date // Expected start time of the exam
}

export type InstructorExamUpdate = {
    exam_nm: string // Exam name
    course_nm: string // Course name
    title: string // Title of the exam
    place: string // Place of the exam
    code: string // Code of the exam (the one that is used for all students to access the exam)
    description: string // Description of the exam
    time_start: Iso8601Date | null
    exp_time_start: Iso8601Date // Expected start time of the exam
    running_time: number // Nomimal running time of the exam (in minutes)
    visible_submissions: number // Whether submissions are visible to the students outside the exam
    started_by: string | null
    contest: number // Whether the exam is a contest
    instructions: string // Instructions of the exam
    avatars: string | null
    anonymous: number // Whether the contest is anonymous (no names shown in the ranking)
}

export type InstructorNewExamStudent = {
    email: string // Email of the student
    invited: number // Whether the student is invited (excluded from the ranking)
    restricted: number // Whether the student is restricted
    code: string // Code used by the student to access the exam
    emergency_password: string // Emergency password of the student
    annotation: string // Annotation about the student
}

export type InstructorExamSubmissionsOptions = {
    problems: string // Comma-separated list of problem names (without language). Use `all` to include all problems.
    include_source: boolean // Include source code
    include_pdf: boolean // Include source code formated in PDF
    include_metadata: boolean // Include metadata in the code
    only_last: boolean // Only include last submission of each problem for each student
    font_size: number // Font size on the PDF
    layout: string // Layout (vertical|horizontal|double)
    obscure_private_testcases_names: boolean // Obscure private testcases names
}

export type Pack = {
    message: string
    href: string
}

export type InstructorBriefExam = {
    exam_nm: string // Exam name
    title: string // Title of the exam
    place: string | null
    description: string | null
    code: string | null
    time_start: Iso8601Date | null
    exp_time_start: Iso8601Date // Expected start time of the exam
    running_time: number // Nomimal running time of the exam (in minutes)
    visible_submissions: number // Whether submissions are visible to the students outside the exam
    started_by: string | null
    contest: number // Whether the exam is a contest
    instructions: string | null
    avatars: string | null
    anonymous: number // Whether the contest is anonymous (no names shown in the ranking)
    course: InstructorExamCourse
    created_at: Iso8601Date // Creation date of the exam
    updated_at: Iso8601Date // Last update date of the exam
}

export type InstructorExam = {
    exam_nm: string // Exam name
    title: string // Title of the exam
    place: string | null
    description: string | null
    code: string | null
    time_start: Iso8601Date | null
    exp_time_start: Iso8601Date // Expected start time of the exam
    running_time: number // Nomimal running time of the exam (in minutes)
    visible_submissions: number // Whether submissions are visible to the students outside the exam
    started_by: string | null
    contest: number // Whether the exam is a contest
    instructions: string | null
    avatars: string | null
    anonymous: number // Whether the contest is anonymous (no names shown in the ranking)
    course: InstructorExamCourse
    created_at: Iso8601Date // Creation date of the exam
    updated_at: Iso8601Date // Last update date of the exam
    documents: InstructorExamDocument[] // Documents of the exam
    compilers: InstructorExamCompiler[] // Compilers of the exam
    problems: InstructorExamProblem[] // Problems of the exam
    students: InstructorExamStudent[] // Students of the exam
}

export type ExamStatisticsEntry = {
    minute: number // Minute offset of the bucket from the first submission
    ok: number // Number of accepted submissions in the bucket
    ko: number // Number of non-accepted submissions in the bucket
}

export type ExamStatistics = {
    submissions: Record<string, Record<string, number>> // Verdict counts by problem
    statuses: Record<string, Record<string, number>> // Student status counts (OK, KO, NT) by problem
    timeline: ExamStatisticsEntry[] // Submission counts bucketed over time
    compilers: Record<string, Record<string, number>> // Compiler counts by problem
    proglangs: Record<string, Record<string, number>> // Programming language counts by problem
}

export type RankingResult = {
    problem_nm: string // Problem name
    submissions: number // Number of submissions
    verdict: string | null
    score: number // Score without weights (0-1)
    time: number // Time of the best submission (in minutes)
    penalty: number // Penalty (in minutes)
    wrongs: number // Number of wrong submissions
}

export type RankingRow = {
    position: number | null
    name: string // Name of the student
    avatar: string | null
    score: number // Total weighted score
    time: number // Total penalty time (in minutes)
    invited: boolean // Whether the student is invited (excluded from the ranking)
    submissions: number // Number of submissions
    rankingResults: RankingResult[] // Results per problem
}

export type Ranking = RankingRow[]

export type WebStream = {
    title: string
    id: string
}

export type ProblemGenerationInfo = {
    title: string
    prompt: string
    model: string
}

export type Deprecation = {
    problem_nm: string
    reason: string | null
}

export type SharingSettings = {
    problem_nm: string
    passcode: string | null
    shared_testcases: boolean
    shared_solutions: boolean
}

export type ProblemAlerts = {
    problem_nm: string
    se_count: number
    ie_count: number
}

export type ProblemAnonymousSubmission = {
    time: string
    anonymous_user_id: string
    problem_id: string
    verdict: string
    compiler_id: string
    proglang: string
}

export type ShareWithInp = {
    problem_nm: string
    emails: string[]
    text: string
}

export type ProblemPopularityBucketEntry = {
    log2_bucket: number
    bucket_min: number
    bucket_max: number
    problem_count: number
}

export type SubmissionQuery = {
    email: string
    problem_nm: string
    problem_id: string
    time: Iso8601Date
    ip: string
    verdict: string
}

export type SubmissionsQuery = SubmissionQuery[]

export type TagsDict = Record<string, string[]>

export type ChatMessage = {
    role: string // The role of the message: system|user|assistant.
    content: string // The content of the message.
}

export type ChatPrompt = {
    model: string // The model to use. Models are listed in the `supportedModels` endpoint.
    label: string // A label for the chat. This is used to identify the chat in the usage audit.
    messages: ChatMessage[]
    addUsage: boolean // If true, the usage of the model will be added at the end of the response as a JSON object between `---USAGE_JSON_START---` and `---USAGE_JSON_END---`.
}

export type LlmUsageEntry = {
    id: string
    created_at: Iso8601Date
    model: string
    label: string
    duration: number
    input_tokens: number
    output_tokens: number
    finish_reason: string
}

export type CreateImageInput = {
    model: string // The image model to use. See supportedImageModels.
    label: string // A label for the request (usage audit).
    prompt: string // The prompt to generate the image from.
    size: string // Size (e.g. 1024x1024) or aspect ratio (e.g. 16:9).
}

export type ModelTokenPrices = {
    input: number // USD per 1M input tokens.
    output: number // USD per 1M output tokens.
}

export type ModelPrices = Record<string, ModelTokenPrices>

export type SubmitMatchUserPlayer = {
    name: string
    user_uid: string
    submission_id: string
}

export type SubmitMatchBotPlayer = {
    name: string
    code: string
}

export type SubmitMatchPlayer = SubmitMatchUserPlayer | SubmitMatchBotPlayer

export type SubmitMatchIn = {
    problem_id: string
    compiler_id: string
    annotation: string
    players: SubmitMatchPlayer[]
}

export type InstructorEntry = {
    username: string
    name: string
    email: string
}

export type InstructorEntries = InstructorEntry[]

export type AdminCourseInstructor = {
    username: string | null
    name: string
    email: string
}

export type AdminCourse = {
    course_id: string
    course_nm: string
    title: string
    description: string
    official: number
    public: number
    created_at: Iso8601Date
    updated_at: Iso8601Date
    icon: string | null
    instructor: AdminCourseInstructor
}

export type AdminCourses = AdminCourse[]

export type AdminCourseSetPublicAndOfficial = {
    course_id: string
    public: number
    official: number
}

export type UserCreation = {
    email: string
    name: string
    username: string
    password: string
    administrator: number
    instructor: number
}

export type UserEmailAndName = {
    email: string
    name: string
}

export type UsersEmailsAndNames = UserEmailAndName[]

export type ProfileForAdmin = {
    user_id: string
    user_uid: string
    email: string
    name: string
    username: string | null
    nickname: string | null
    webpage: string | null
    description: string | null
    affiliation: string | null
    birth_year: number | null
    max_subsxhour: number
    max_subsxday: number
    administrator: number
    instructor: number
    parent_email: string | null
    country_id: string | null
    timezone_id: string
    compiler_id: string | null
    language_id: string | null
    locked: number
    banned: number
    nb_bans: number
    reason: string | null
    creation_date: Iso8601Date
}

export type DatabasesInfoItem = {
    name: string
    size: number
    mtime: Iso8601Date
}

export type DatabasesInfo = DatabasesInfoItem[]

export type FreeDiskSpaceItem = {
    disk: string
    filesystem: string
    size: string
    used: string
    available: string
    use: string
    mounted: string
}

export type NullableFreeDiskSpaceItem = FreeDiskSpaceItem | null

export type FreeDiskSpace = Record<string, NullableFreeDiskSpaceItem>

export type RecentConnectedUsers = {
    latest_hour: number
    latest_day: number
    latest_week: number
    latest_month: number
    latest_year: number
}

export type RecentLoadAverages = {
    latest_01_minutes: number
    latest_05_minutes: number
    latest_15_minutes: number
}

export type SubmissionsHistograms = {
    latest_hour: number[]
    latest_day: number[]
}

export type Zombies = {
    ies: number
    pendings: number
}

export type AdminDashboard = {
    databases_info: DatabasesInfo
    free_disk_space: FreeDiskSpace
    recent_load_averages: RecentLoadAverages
    recent_connected_users: RecentConnectedUsers
    recent_submissions: RecentSubmissions
    submissions_histograms: SubmissionsHistograms
    zombies: Zombies
}

export type UpcomingExam = {
    exam_nm: string
    title: string
    username: string
    email: string
    exp_time_start: Iso8601Date
    running_time: number
    students: number
    name: string
    contest: number
}

export type UpcomingExams = UpcomingExam[]

export type SubmissionQueueItem = {
    submission_uid: string
    submission_id: string
    problem_id: string
    compiler_id: string
    time_in: Iso8601Date
    exam_id: string | null
    veredict: string | null
    user_id: string
    user__name: string
    problem__title: string
}

export type SubmissionQueueItems = SubmissionQueueItem[]

export type QueueQuery = {
    verdicts: string[]
    limit: number
}

export type UserRankingEntry = {
    user_id: string
    nickname: string | null
    email: string
    name: string
    problems: number
}

export type UserRanking = UserRankingEntry[]

export type DateRange = {
    start: string
    end: string
}

// Client types

export interface Meta {
    readonly token: string
    readonly user_uid: string
}

export interface Download {
    readonly data: Uint8Array
    readonly name: string
    readonly type: string
}

// Exceptions

export class UnauthorizedError extends Error {
    name: string = "UnauthorizedError"
    constructor(public message: string = "Unauthorized") {
        super(message)
    }
}

export class InfoError extends Error {
    name: string = "InfoError"
    constructor(public message: string) {
        super(message)
    }
}

export class NotFoundError extends Error {
    name: string = "NotFoundError"
    constructor(public message: string) {
        super(message)
    }
}

export class InputError extends Error {
    name: string = "InputError"
    constructor(public message: string) {
        super(message)
    }
}

export class ProtocolError extends Error {
    name: string = "ProtocolError"
    constructor(public message: string) {
        super(message)
    }
}

type CacheEntry = {
    output: any
    ofiles: any
    epoch: number
}

/**
 *
 * JutgeApiClient
 *
 */
export class JutgeApiClient {
    //

    /** Whether to use cache or not */
    useCache: boolean = true

    /** Whether to log API calls or not */
    logApiCalls: boolean = false

    /** Whether to log cache or not */
    logCache: boolean = false

    /**
     * User agent to include in the API requests.
     * This is a metadata included in the request that identifies the client making the call to the server)
     * You should set this to a value that identifies your client, such as the name of the client and its version.
     **/
    userAgent: string = "typescript-client"

    /** Client TTL values (in seconds) */
    clientTTLs: Map<string, number> = new Map()

    /** The cache */
    private cache: Map<string, CacheEntry> = new Map()

    /** URL to talk with the API */
    JUTGE_API_URL = process.env.JUTGE_API_URL || "https://api.jutge.org/api"

    /** Headers to include in the API requests */
    headers: Record<string, string> = {
        ...(process.env.JUTGE_DOMAIN ? { "x-forwarded-host": process.env.JUTGE_DOMAIN } : {}),
    }

    /** Meta information */
    meta: Meta | null = null

    /** Function that sends a request to the API and returns the response. **/
    async execute(func: string, input: any, ifiles: File[] = []): Promise<[any, Download[]]> {
        //

        let startTime = new Date()
        let endTime: Date
        try {
            return await this.execute2(func, input, ifiles)
        } finally {
            endTime = new Date()
            if (this.logApiCalls) {
                const duration = Math.round(endTime.getTime() - startTime.getTime())
                console.log(`${func}: ${duration}ms`)
            }
        }
    }

    /** Function that sends a request to the API and returns the response. **/
    async execute2(func: string, input: any, ifiles: File[] = []): Promise<[any, Download[]]> {
        //

        const caching = this.useCache && this.clientTTLs.has(func) && ifiles.length === 0

        // check cache
        if (caching) {
            const key = JSON.stringify({ func, input })
            const entry = this.cache.get(key)
            if (entry !== undefined) {
                if (this.logCache) console.log("found")
                const ttl = this.clientTTLs.get(func)!
                if (entry.epoch + ttl * 1000 > new Date().valueOf()) {
                    if (this.logCache) console.log("used")
                    return [entry.output, entry.ofiles]
                } else {
                    if (this.logCache) console.log("expired")
                    this.cache.delete(key)
                }
            }
        }
        if (this.logCache) console.log("fetch")

        // prepare form
        const iform = new FormData()
        const idata = { func, input, meta: this.meta, userAgent: this.userAgent }
        iform.append("data", JSON.stringify(idata))
        for (const index in ifiles) iform.append(`file_${index}`, ifiles[index])

        // send request
        const response = await fetch(this.JUTGE_API_URL, {
            method: "POST",
            body: iform,
            headers: this.headers,
        })

        // process response
        const contentType = response.headers.get("content-type")?.split(";")[0].toLowerCase()
        if (contentType !== "multipart/form-data") {
            throw new ProtocolError("The content type is not multipart/form-data")
        }

        const oform = await response.formData()
        const odata = oform.get("data")
        const { output, error, duration, operation_id, time } = JSON.parse(odata as string)

        if (error) {
            this.throwError(error, operation_id)
        }

        // extract ofiles
        const ofiles = []
        for (const key of oform.keys()) {
            const value = oform.get(key)
            if (value instanceof File) {
                ofiles.push({
                    data: new Uint8Array(await value.arrayBuffer()),
                    name: value.name,
                    type: value.type,
                })
            }
        }

        // update cache
        if (caching) {
            if (this.logCache) console.log("saved")
            const key = JSON.stringify({ func, input })
            this.cache.set(key, { output, ofiles, epoch: new Date().valueOf() })
        }

        return [output, ofiles]
    }

    /** Function that throws the exception received through the API */
    throwError(error: Record<string, any>, operation_id: string | undefined) {
        const message = error.message || "Unknown error"
        if (error.name === "UnauthorizedError") {
            throw new UnauthorizedError(message)
        } else if (error.name === "InfoError") {
            throw new InfoError(message)
        } else if (error.name === "NotFoundError") {
            throw new NotFoundError(message)
        } else if (error.name === "InputError") {
            throw new InputError(message)
        } else {
            throw new Error(message)
        }
    }

    /** Simple login setting meta */

    async login({
        email,
        password,
    }: {
        email: string
        password: string
    }): Promise<CredentialsOut> {
        const [credentials, _] = await this.execute("auth.login", { email, password })
        if (credentials.error) throw new UnauthorizedError(credentials.error)
        this.meta = { token: credentials.token, user_uid: credentials.user_uid }
        return credentials
    }

    /** Simple login to exam setting meta */
    async loginExam({
        email,
        password,
        exam,
        exam_password,
    }: {
        email: string
        password: string
        exam: string
        exam_password: string
    }): Promise<CredentialsOut> {
        const [credentials, _] = await this.execute("auth.loginExam", {
            email,
            password,
            exam,
            exam_password,
        })
        if (credentials.error) throw new UnauthorizedError(credentials.error)
        this.meta = { token: credentials.token, user_uid: credentials.user_uid }
        return credentials
    }

    /** Simple logout */
    async logout(): Promise<void> {
        await this.execute("auth.logout", null)
        this.meta = null
    }

    /** Clear the contents of the cache */
    clearCache() {
        if (this.logCache) console.log("clear")
        this.cache = new Map()
    }

    /** Provide a new value to the cache */
    setCache(newCache: string) {
        const obj = JSON.parse(newCache)
        this.cache = new Map(Object.entries(obj))
        this.removeExpired()
    }

    /** Get current value of the cache */
    getCache(): string {
        this.removeExpired()
        const obj = Object.fromEntries(this.cache.entries())
        return JSON.stringify(obj)
    }

    /** Remove expired entries from cache */
    private removeExpired() {
        for (const [key, entry] of this.cache) {
            const { func } = JSON.parse(key)
            const ttl = this.clientTTLs.get(func)
            if (ttl !== undefined && entry.epoch + ttl * 1000 < new Date().getTime()) {
                this.cache.delete(key)
            }
        }
    }

    readonly clients: Module_clients
    readonly auth: Module_auth
    readonly misc: Module_misc
    readonly tables: Module_tables
    readonly courses: Module_courses
    readonly problems: Module_problems
    readonly student: Module_student
    readonly tutor: Module_tutor
    readonly instructor: Module_instructor
    readonly games: Module_games
    readonly admin: Module_admin

    constructor() {
        this.clients = new Module_clients(this)
        this.auth = new Module_auth(this)
        this.misc = new Module_misc(this)
        this.tables = new Module_tables(this)
        this.courses = new Module_courses(this)
        this.problems = new Module_problems(this)
        this.student = new Module_student(this)
        this.tutor = new Module_tutor(this)
        this.instructor = new Module_instructor(this)
        this.games = new Module_games(this)
        this.admin = new Module_admin(this)

        this.clientTTLs.set("misc.getAvatarPacks", 3600)
        this.clientTTLs.set("misc.getExamIcons", 3600)
        this.clientTTLs.set("misc.getDemosForCompiler", 3600)
        this.clientTTLs.set("tables.get", 3600)
        this.clientTTLs.set("tables.getLanguages", 3600)
        this.clientTTLs.set("tables.getCountries", 3600)
        this.clientTTLs.set("tables.getCompilers", 3600)
        this.clientTTLs.set("tables.getDrivers", 3600)
        this.clientTTLs.set("tables.getVerdicts", 3600)
        this.clientTTLs.set("tables.getProglangs", 3600)
        this.clientTTLs.set("tables.getTimezones", 3600)
        this.clientTTLs.set("courses.indexPublic", 300)
        this.clientTTLs.set("problems.getAllAbstractProblems", 3600)
        this.clientTTLs.set("problems.getAllAbstractProblemsRaw", 3600)
        this.clientTTLs.set("problems.getSomeAbstractProblems", 600)
    }
}

/**
 *
 * Module to download clients.
 *
 */
class Module_clients {
    private readonly root: JutgeApiClient

    constructor(root: JutgeApiClient) {
        this.root = root
    }

    /**
     * Get Python client.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: any
     */
    async python(): Promise<Download> {
        const [output, ofiles] = await this.root.execute("clients.python", null)
        return ofiles[0]
    }

    /**
     * Get TypeScript client.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: any
     */
    async typescript(): Promise<Download> {
        const [output, ofiles] = await this.root.execute("clients.typescript", null)
        return ofiles[0]
    }

    /**
     * Get JavaScript client.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: any
     */
    async javascript(): Promise<Download> {
        const [output, ofiles] = await this.root.execute("clients.javascript", null)
        return ofiles[0]
    }

    /**
     * Get Java client.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: any
     */
    async java(): Promise<Download> {
        const [output, ofiles] = await this.root.execute("clients.java", null)
        return ofiles[0]
    }

    /**
     * Get Cpp client.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: any
     */
    async cpp(): Promise<Download> {
        const [output, ofiles] = await this.root.execute("clients.cpp", null)
        return ofiles[0]
    }

    /**
     * Get PHP client.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: any
     */
    async php(): Promise<Download> {
        const [output, ofiles] = await this.root.execute("clients.php", null)
        return ofiles[0]
    }
}

/**
 *
 * Module to provide authentication functions.
 *
 */
class Module_auth {
    private readonly root: JutgeApiClient

    constructor(root: JutgeApiClient) {
        this.root = root
    }

    /**
     * Login: Get an access token.
     *
     * Returns a token on success. Throws UnauthorizedError on failure.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: any
     */
    async login(data: CredentialsIn): Promise<CredentialsOut> {
        const [output, ofiles] = await this.root.execute("auth.login", data)
        return output
    }

    /**
     * Logout: Discard the access token.
     *
     * Discards the access token so that the user cannot use it anymore. Requires authentication.
     *
     * 🗂️ Domains: jutge, exam, contest
     * 🔐 Authentication: user
     */
    async logout(): Promise<void> {
        const [output, ofiles] = await this.root.execute("auth.logout", null)
        return output
    }

    /**
     * Login to an exam: Get an access token for an exam.
     *
     * Returns a token on success. Throws UnauthorizedError on failure.
     *
     * 🗂️ Domains: exam, contest
     * 🔐 Authentication: any
     */
    async loginExam(data: ExamCredentialsIn): Promise<CredentialsOut> {
        const [output, ofiles] = await this.root.execute("auth.loginExam", data)
        return output
    }

    /**
     * Get list of ready exams for a user, given their credentials.
     *
     * Validates user credentials and returns the list of ready exams. Does not create a session or return a token.
     *
     * 🗂️ Domains: exam, contest
     * 🔐 Authentication: any
     */
    async getReadyExams(data: CredentialsIn): Promise<ReadyExam[]> {
        const [output, ofiles] = await this.root.execute("auth.getReadyExams", data)
        return output
    }

    /**
     * Login: Get an access token.
     *
     * Returns a token on success. Throws UnauthorizedError on failure. Created for backward compatibility, do not use anymore.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: any
     */
    async loginWithUsername(data: CredentialsWithUsernameIn): Promise<CredentialsOut> {
        const [output, ofiles] = await this.root.execute("auth.loginWithUsername", data)
        return output
    }

    /**
     * Register a new user account.
     *
     * Creates a new user with the provided profile data. Requires a valid reCAPTCHA v3 token.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: any
     */
    async register(data: RegisterIn): Promise<void> {
        const [output, ofiles] = await this.root.execute("auth.register", data)
        return output
    }

    /**
     * Request a password reset.
     *
     * Emails a reset code if the address is registered. Always succeeds silently for unknown emails. Requires a valid reCAPTCHA v3 token.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: any
     */
    async requestPasswordReset(data: RequestPasswordResetIn): Promise<void> {
        const [output, ofiles] = await this.root.execute("auth.requestPasswordReset", data)
        return output
    }

    /**
     * Confirm a password reset and set a new password.
     *
     * Validates the reset code and sets a new password. Requires a valid reCAPTCHA v3 token.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: any
     */
    async confirmPasswordRequest(data: ConfirmPasswordRequestIn): Promise<void> {
        const [output, ofiles] = await this.root.execute("auth.confirmPasswordRequest", data)
        return output
    }

    /**
     * Request account unregistration confirmation.
     *
     * Verifies the current password and emails an unregistration confirmation code. Requires authentication and a valid reCAPTCHA v3 token.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: user
     */
    async requestUnregistration(data: RequestUnregistrationIn): Promise<void> {
        const [output, ofiles] = await this.root.execute("auth.requestUnregistration", data)
        return output
    }

    /**
     * Confirm account unregistration.
     *
     * Validates the current password and the unregistration code, removes the account, unlinks course enrollments, and invalidates all sessions. Requires authentication and a valid reCAPTCHA v3 token. Warning: This action is irreversible!!!
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: user
     */
    async confirmUnregistration(data: ConfirmPasswordRequestIn): Promise<void> {
        const [output, ofiles] = await this.root.execute("auth.confirmUnregistration", data)
        return output
    }

    /**
     * Request an email address change.
     *
     * Verifies the current password and emails a confirmation code to the current address and another to the new address. Requires authentication and a valid reCAPTCHA v3 token.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: user
     */
    async requestChangeEmail(data: RequestChangeEmailIn): Promise<void> {
        const [output, ofiles] = await this.root.execute("auth.requestChangeEmail", data)
        return output
    }

    /**
     * Confirm an email address change.
     *
     * Validates the current password and both email confirmation codes, updates the account email, migrates course enrollments, and invalidates all sessions. Requires authentication and a valid reCAPTCHA v3 token.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: user
     */
    async confirmChangeEmail(data: ConfirmChangeEmailIn): Promise<void> {
        const [output, ofiles] = await this.root.execute("auth.confirmChangeEmail", data)
        return output
    }
}

/**
 *
 * Module with miscellaneous endpoints
 *
 */
class Module_misc {
    private readonly root: JutgeApiClient

    constructor(root: JutgeApiClient) {
        this.root = root
    }

    /**
     * Get version information of the API.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: any
     */
    async getApiVersion(): Promise<ApiVersion> {
        const [output, ofiles] = await this.root.execute("misc.getApiVersion", null)
        return output
    }

    /**
     * Get requestion information.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: any
     */
    async getRequestInformation(): Promise<RequestInformation> {
        const [output, ofiles] = await this.root.execute("misc.getRequestInformation", null)
        return output
    }

    /**
     * Get a fortune message.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: any
     */
    async getFortune(): Promise<string> {
        const [output, ofiles] = await this.root.execute("misc.getFortune", null)
        return output
    }

    /**
     * Get server time.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: any
     */
    async getTime(): Promise<Time> {
        const [output, ofiles] = await this.root.execute("misc.getTime", null)
        return output
    }

    /**
     * Get homepage stats.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: any
     */
    async getHomepageStats(): Promise<HomepageStats> {
        const [output, ofiles] = await this.root.execute("misc.getHomepageStats", null)
        return output
    }

    /**
     * Get Jutge.org logo as a PNG file.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: any
     */
    async getLogo(): Promise<Download> {
        const [output, ofiles] = await this.root.execute("misc.getLogo", null)
        return ofiles[0]
    }

    /**
     * Returns all packs of avatars.
     *
     * Avatars are used in exams and contests to identify students or participants.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: any
     */
    async getAvatarPacks(): Promise<string[]> {
        const [output, ofiles] = await this.root.execute("misc.getAvatarPacks", null)
        return output
    }

    /**
     * Returns all exam icons.
     *
     * Exam icon are used in exams and contests to identify problems.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: any
     */
    async getExamIcons(): Promise<TagsDict> {
        const [output, ofiles] = await this.root.execute("misc.getExamIcons", null)
        return output
    }

    /**
     * Returns color mappings using colornames notation.
     *
     * Color mappings may be used to colorize keys in the frontends. Color names are as defined in https://github.com/timoxley/colornames
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: any
     */
    async getColors(): Promise<ColorMapping> {
        const [output, ofiles] = await this.root.execute("misc.getColors", null)
        return output
    }

    /**
     * Returns color mappings using hexadecimal color notation.
     *
     * Color mappings may be used to colorize keys in the frontends.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: any
     */
    async getHexColors(): Promise<ColorMapping> {
        const [output, ofiles] = await this.root.execute("misc.getHexColors", null)
        return output
    }

    /**
     * Returns code demos for a given compiler as a dictionary of base64 codes indexed by problem_nm.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: any
     */
    async getDemosForCompiler(compiler_id: string): Promise<Record<string, string>> {
        const [output, ofiles] = await this.root.execute(
            "misc.getDemosForCompiler",
            compiler_id
        )
        return output
    }

    /**
     * Translate text from one language to another.
     *
     * Source and target languages are ISO 639-1 codes. Use "auto" as the source language to detect it.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: user
     */
    async translate(data: TranslationIn): Promise<TranslationOut> {
        const [output, ofiles] = await this.root.execute("misc.translate", data)
        return output
    }
}

/**
 *
 * Module with quite static tables
 *
 */
class Module_tables {
    private readonly root: JutgeApiClient

    constructor(root: JutgeApiClient) {
        this.root = root
    }

    /**
     * Returns all tables.
     *
     * Returns all compilers, countries, drivers, languages, proglangs, and verdicts in a single request. This data does not change often, so you should only request it once per session.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: any
     */
    async get(): Promise<AllTables> {
        const [output, ofiles] = await this.root.execute("tables.get", null)
        return output
    }

    /**
     * Returns all languages.
     *
     * Returns all languages as a dictionary of objects, indexed by id.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: any
     */
    async getLanguages(): Promise<Record<string, Language>> {
        const [output, ofiles] = await this.root.execute("tables.getLanguages", null)
        return output
    }

    /**
     * Returns all countries.
     *
     * Returns all countries as a dictionary of objects, indexed by id.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: any
     */
    async getCountries(): Promise<Record<string, Country>> {
        const [output, ofiles] = await this.root.execute("tables.getCountries", null)
        return output
    }

    /**
     * Returns all compilers.
     *
     * Returns all compilers as a dictionary of objects, indexed by id.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: any
     */
    async getCompilers(): Promise<Record<string, Compiler>> {
        const [output, ofiles] = await this.root.execute("tables.getCompilers", null)
        return output
    }

    /**
     * Returns all drivers.
     *
     * Returns all drivers as a dictionary of objects, indexed by id.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: any
     */
    async getDrivers(): Promise<Record<string, Driver>> {
        const [output, ofiles] = await this.root.execute("tables.getDrivers", null)
        return output
    }

    /**
     * Returns all verdicts.
     *
     * Returns all verdicts as a dictionary of objects, indexed by id.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: any
     */
    async getVerdicts(): Promise<Record<string, Verdict>> {
        const [output, ofiles] = await this.root.execute("tables.getVerdicts", null)
        return output
    }

    /**
     * Returns all proglangs.
     *
     * Returns all proglangs (porgramming languages) as a dictionary of objects, indexed by id.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: any
     */
    async getProglangs(): Promise<Record<string, Proglang>> {
        const [output, ofiles] = await this.root.execute("tables.getProglangs", null)
        return output
    }

    /**
     * Returns all timezones.
     *
     * Returns all timezones as a dictionary of objects, indexed by id.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: any
     */
    async getTimezones(): Promise<Record<string, Timezone>> {
        const [output, ofiles] = await this.root.execute("tables.getTimezones", null)
        return output
    }
}

/**
 *
 * Public course endpoints
 *
 */
class Module_courses {
    private readonly root: JutgeApiClient

    constructor(root: JutgeApiClient) {
        this.root = root
    }

    /**
     * Get all public courses.
     *
     * Returns all courses marked as public, indexed by course key (`username:course_nm`).
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: any
     */
    async indexPublic(): Promise<PublicCourses> {
        const [output, ofiles] = await this.root.execute("courses.indexPublic", null)
        return output
    }
}

/**
 *
 * Module with endpoints related to problems.

There are two types of problems: *abstract problems* and *problems*. An abstract
problem is a group of problems. A problem is an instance of an abstract problem
in a particular language. Abstract problems are identified by a `problem_nm` (such
as 'P68688'), while problems are identified by a `problem_id` including its
`language_id` (such as 'P68688_en'). Abstract problems have a list of problems,
while problems have an abstract problem. Abstract problems have an author, while
problems have a translator.

Available problems depend on the actor issuing the request. For example, non
authenticated users can only access public problems, while authenticated
users can potentially access more problems.

 *
 */
class Module_problems {
    private readonly root: JutgeApiClient

    constructor(root: JutgeApiClient) {
        this.root = root
    }

    /**
     * Get all available abstract problems.
     *
     * Includes problems.
     *
     * 🗂️ Domains: jutge, exam, contest
     * 🔐 Authentication: any
     */
    async getAllAbstractProblems(): Promise<Record<string, AbstractProblem>> {
        const [output, ofiles] = await this.root.execute(
            "problems.getAllAbstractProblems",
            null
        )
        return output
    }

    /**
     * Test of getting abstract problems
     *
     * Bla bla
     *
     * 🗂️ Domains: jutge, exam, contest
     * 🔐 Authentication: any
     */
    async getAllAbstractProblemsRaw(): Promise<Record<string, AbstractProblem>> {
        const [output, ofiles] = await this.root.execute(
            "problems.getAllAbstractProblemsRaw",
            null
        )
        return output
    }

    /**
     * Get available abstract problems whose keys are in `problem_nms`.
     *
     * Includes problems.
     *
     * 🗂️ Domains: jutge, exam, contest
     * 🔐 Authentication: any
     */
    async getAbstractProblems(problem_nms: string): Promise<Record<string, AbstractProblem>> {
        const [output, ofiles] = await this.root.execute(
            "problems.getAbstractProblems",
            problem_nms
        )
        return output
    }

    /**
     * Get some available abstract problems with a given regexp and a limit.
     *
     * Includes problems.
     *
     * 🗂️ Domains: jutge, exam, contest
     * 🔐 Authentication: any
     */
    async getSomeAbstractProblems(
        data: GetSomeAbstractProblemsIn
    ): Promise<Record<string, AbstractProblem>> {
        const [output, ofiles] = await this.root.execute(
            "problems.getSomeAbstractProblems",
            data
        )
        return output
    }

    /**
     * Get available abstract problems that belong to a list.
     *
     * Includes problems.
     *
     * 🗂️ Domains: jutge, exam, contest
     * 🔐 Authentication: any
     */
    async getAbstractProblemsInList(
        list_key: string
    ): Promise<Record<string, AbstractProblem>> {
        const [output, ofiles] = await this.root.execute(
            "problems.getAbstractProblemsInList",
            list_key
        )
        return output
    }

    /**
     * Get an abstract problem.
     *
     * Includes problems
     *
     * 🗂️ Domains: jutge, exam, contest
     * 🔐 Authentication: any
     */
    async getAbstractProblem(problem_nm: string): Promise<AbstractProblem> {
        const [output, ofiles] = await this.root.execute(
            "problems.getAbstractProblem",
            problem_nm
        )
        return output
    }

    /**
     * Get supplementary information of an abstract problem.
     *
     * Includes accepted compilers and accepted proglangs
     *
     * 🗂️ Domains: jutge, exam, contest
     * 🔐 Authentication: any
     */
    async getAbstractProblemSuppl(problem_nm: string): Promise<AbstractProblemSuppl> {
        const [output, ofiles] = await this.root.execute(
            "problems.getAbstractProblemSuppl",
            problem_nm
        )
        return output
    }

    /**
     * Get supplementary information of many abstract problems.
     *
     * Includes accepted compilers and accepted proglangs. Keys are `problem_nm`s.
     *
     * 🗂️ Domains: jutge, exam, contest
     * 🔐 Authentication: any
     */
    async getManyAbstractProblemSuppl(problem_nms: string): Promise<AbstractProblemSuppls> {
        const [output, ofiles] = await this.root.execute(
            "problems.getManyAbstractProblemSuppl",
            problem_nms
        )
        return output
    }

    /**
     * Get a problem.
     *
     * Includes abstract problem.
     *
     * 🗂️ Domains: jutge, exam, contest
     * 🔐 Authentication: any
     */
    async getProblem(problem_id: string): Promise<Problem> {
        const [output, ofiles] = await this.root.execute("problems.getProblem", problem_id)
        return output
    }

    /**
     * Get supplementary information of a problem.
     *
     * Includes accepted compilers, accepted proglangs, official solutions checks and handler specifications
     *
     * 🗂️ Domains: jutge, exam, contest
     * 🔐 Authentication: any
     */
    async getProblemSuppl(problem_id: string): Promise<ProblemSuppl> {
        const [output, ofiles] = await this.root.execute("problems.getProblemSuppl", problem_id)
        return output
    }

    /**
     * Get sample testcases of a problem.
     *
     * 🗂️ Domains: jutge, exam, contest
     * 🔐 Authentication: any
     */
    async getSampleTestcases(problem_id: string): Promise<Testcase[]> {
        const [output, ofiles] = await this.root.execute(
            "problems.getSampleTestcases",
            problem_id
        )
        return output
    }

    /**
     * Get sample session of a problem.
     *
     * The sample session is the sample.dt file that contains the sample input and output for a Python problem.
     *
     * 🗂️ Domains: jutge, exam, contest
     * 🔐 Authentication: any
     */
    async getSampleSession(problem_id: string): Promise<string> {
        const [output, ofiles] = await this.root.execute(
            "problems.getSampleSession",
            problem_id
        )
        return output
    }

    /**
     * Get public testcases of a problem.
     *
     * Public testcases are like sample testcases, but are not meant to be shown in the problem statatement, because of their long length.
     *
     * 🗂️ Domains: jutge, exam, contest
     * 🔐 Authentication: any
     */
    async getPublicTestcases(problem_id: string): Promise<Testcase[]> {
        const [output, ofiles] = await this.root.execute(
            "problems.getPublicTestcases",
            problem_id
        )
        return output
    }

    /**
     * Get ZIP archive of a problem. This includes its statements, templates and public testcases.
     *
     * 🗂️ Domains: jutge, exam, contest
     * 🔐 Authentication: any
     */
    async getZipStatement(problem_id: string): Promise<Download> {
        const [output, ofiles] = await this.root.execute("problems.getZipStatement", problem_id)
        return ofiles[0]
    }

    /**
     * Get PDF statement of a problem.
     *
     * 🗂️ Domains: jutge, exam, contest
     * 🔐 Authentication: any
     */
    async getPdfStatement(problem_id: string): Promise<Download> {
        const [output, ofiles] = await this.root.execute("problems.getPdfStatement", problem_id)
        return ofiles[0]
    }

    /**
     * Get Html statement of a problem.
     *
     * 🗂️ Domains: jutge, exam, contest
     * 🔐 Authentication: any
     */
    async getHtmlStatement(problem_id: string): Promise<string> {
        const [output, ofiles] = await this.root.execute(
            "problems.getHtmlStatement",
            problem_id
        )
        return output
    }

    /**
     * Get Text statement of a problem.
     *
     * 🗂️ Domains: jutge, exam, contest
     * 🔐 Authentication: any
     */
    async getTextStatement(problem_id: string): Promise<string> {
        const [output, ofiles] = await this.root.execute(
            "problems.getTextStatement",
            problem_id
        )
        return output
    }

    /**
     * Get Markdown statement of a problem.
     *
     * 🗂️ Domains: jutge, exam, contest
     * 🔐 Authentication: any
     */
    async getMarkdownStatement(problem_id: string): Promise<string> {
        const [output, ofiles] = await this.root.execute(
            "problems.getMarkdownStatement",
            problem_id
        )
        return output
    }

    /**
     * Get short Html statement of a problem (does not include title or author).
     *
     * 🗂️ Domains: jutge, exam, contest
     * 🔐 Authentication: any
     */
    async getShortHtmlStatement(problem_id: string): Promise<string> {
        const [output, ofiles] = await this.root.execute(
            "problems.getShortHtmlStatement",
            problem_id
        )
        return output
    }

    /**
     * Get short Text statement of a problem (does not include title or author).
     *
     * 🗂️ Domains: jutge, exam, contest
     * 🔐 Authentication: any
     */
    async getShortTextStatement(problem_id: string): Promise<string> {
        const [output, ofiles] = await this.root.execute(
            "problems.getShortTextStatement",
            problem_id
        )
        return output
    }

    /**
     * Get short Markdown statement of a problem (does not include title or author).
     *
     * 🗂️ Domains: jutge, exam, contest
     * 🔐 Authentication: any
     */
    async getShortMarkdownStatement(problem_id: string): Promise<string> {
        const [output, ofiles] = await this.root.execute(
            "problems.getShortMarkdownStatement",
            problem_id
        )
        return output
    }

    /**
     * Get list of template files of a problem (`main.*`, `code.*`, `public.tar`, etc.).
     *
     * 🗂️ Domains: jutge, exam, contest
     * 🔐 Authentication: any
     */
    async getTemplates(problem_id: string): Promise<string[]> {
        const [output, ofiles] = await this.root.execute("problems.getTemplates", problem_id)
        return output
    }

    /**
     * Get a template file of a problem.
     *
     * 🗂️ Domains: jutge, exam, contest
     * 🔐 Authentication: any
     */
    async getTemplate(data: {
        problem_id: string /* The problem ID (`problem_nm` + "_" + `lang_id`). */
        template: string /* The template file name. */
    }): Promise<Download> {
        const [output, ofiles] = await this.root.execute("problems.getTemplate", data)
        return ofiles[0]
    }

    /**
     * Get list of proglangs for which the problem has an official solution.
     *
     * Permission is granted to admins, the problem owner, or any instructor if solutions are shared.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: instructorOrAdmin
     */
    async getSolutions(problem_id: string): Promise<string[]> {
        const [output, ofiles] = await this.root.execute("problems.getSolutions", problem_id)
        return output
    }

    /**
     * Get official solution for a problem in proglang as a string in base64.
     *
     * Permission is granted to admins, the problem owner, or any instructor if solutions are shared.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: instructorOrAdmin
     */
    async getSolutionAsB64(data: {
        problem_id: string /* The problem ID (`problem_nm` + "_" + `lang_id`). */
        proglang: string
    }): Promise<string> {
        const [output, ofiles] = await this.root.execute("problems.getSolutionAsB64", data)
        return output
    }

    /**
     * Get official solution for a problem in proglang as a file.
     *
     * Permission is granted to admins, the problem owner, or any instructor if solutions are shared.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: instructorOrAdmin
     */
    async getSolutionAsFile(data: {
        problem_id: string /* The problem ID (`problem_nm` + "_" + `lang_id`). */
        proglang: string
    }): Promise<Download> {
        const [output, ofiles] = await this.root.execute("problems.getSolutionAsFile", data)
        return ofiles[0]
    }

    /**
     * Get names of all testcases of a problem.
     *
     * Permission is granted to admins, the problem owner, or any instructor if testcases are shared.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: instructorOrAdmin
     */
    async getTestcases(problem_id: string): Promise<string[]> {
        const [output, ofiles] = await this.root.execute("problems.getTestcases", problem_id)
        return output
    }

    /**
     * Get one testcase of a problem (input and correct output as base64).
     *
     * Permission is granted to admins, the problem owner, or any instructor if testcases are shared.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: instructorOrAdmin
     */
    async getTestcase(data: {
        problem_id: string /* The problem ID (`problem_nm` + "_" + `lang_id`). */
        testcase: string /* The testcase name (as returned by `getTestcases`). */
    }): Promise<Testcase> {
        const [output, ofiles] = await this.root.execute("problems.getTestcase", data)
        return output
    }

    /**
     * Get all testcases of a problem.
     *
     * Permission is granted to admins, the problem owner, or any instructor if testcases are shared.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: instructorOrAdmin
     */
    async getAllTestcases(problem_id: string): Promise<Testcase[]> {
        const [output, ofiles] = await this.root.execute("problems.getAllTestcases", problem_id)
        return output
    }

    /**
     * Get results for a semantic search for statement problems. The array is sorted by score (better at the top).
     *
     * 🗂️ Domains: jutge, exam, contest
     * 🔐 Authentication: any
     */
    async semanticSearch(data: {
        query: string /* The query string to search for. */
        limit: number /* Maximum number of problems to return. */
    }): Promise<SearchResults> {
        const [output, ofiles] = await this.root.execute("problems.semanticSearch", data)
        return output
    }

    /**
     * Get results for a full text search for statement problems. The array is sorted by score (better at the top). Queries are matched against titles and statements and can use boolean operators.
     *
     * 🗂️ Domains: jutge, exam, contest
     * 🔐 Authentication: any
     */
    async fullTextSearch(data: {
        query: string /* The query string to search for. */
        limit: number /* Maximum number of problems to return. */
    }): Promise<SearchResults> {
        const [output, ofiles] = await this.root.execute("problems.fullTextSearch", data)
        return output
    }
}

/**
 *
 * These operations are available to all users, provided they are authenticated.
 *
 */
class Module_student {
    private readonly root: JutgeApiClient

    readonly keys: Module_student_keys
    readonly profile: Module_student_profile
    readonly dashboard: Module_student_dashboard
    readonly submissions: Module_student_submissions
    readonly courses: Module_student_courses
    readonly lists: Module_student_lists
    readonly passcodes: Module_student_passcodes
    readonly exam: Module_student_exam
    readonly exams: Module_student_exams
    readonly statuses: Module_student_statuses
    readonly awards: Module_student_awards
    readonly settings: Module_student_settings
    readonly tradingCards: Module_student_tradingCards

    constructor(root: JutgeApiClient) {
        this.root = root
        this.keys = new Module_student_keys(root)
        this.profile = new Module_student_profile(root)
        this.dashboard = new Module_student_dashboard(root)
        this.submissions = new Module_student_submissions(root)
        this.courses = new Module_student_courses(root)
        this.lists = new Module_student_lists(root)
        this.passcodes = new Module_student_passcodes(root)
        this.exam = new Module_student_exam(root)
        this.exams = new Module_student_exams(root)
        this.statuses = new Module_student_statuses(root)
        this.awards = new Module_student_awards(root)
        this.settings = new Module_student_settings(root)
        this.tradingCards = new Module_student_tradingCards(root)
    }
}

/**
 *
 * This module exposes all valid keys for problems, courses and lists that a user can access.
 *
 */
class Module_student_keys {
    private readonly root: JutgeApiClient

    constructor(root: JutgeApiClient) {
        this.root = root
    }

    /**
     * Get problem, courses (as enrolled and available) and list keys.
     *
     * 🗂️ Domains: jutge, exam, contest
     * 🔐 Authentication: user
     */
    async get(): Promise<AllKeys> {
        const [output, ofiles] = await this.root.execute("student.keys.get", null)
        return output
    }

    /**
     * Get problem keys.
     *
     * 🗂️ Domains: jutge, exam, contest
     * 🔐 Authentication: user
     */
    async getProblems(): Promise<string[]> {
        const [output, ofiles] = await this.root.execute("student.keys.getProblems", null)
        return output
    }

    /**
     * Get enrolled course keys.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: user
     */
    async getEnrolledCourses(): Promise<string[]> {
        const [output, ofiles] = await this.root.execute(
            "student.keys.getEnrolledCourses",
            null
        )
        return output
    }

    /**
     * Get available course keys.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: user
     */
    async getAvailableCourses(): Promise<string[]> {
        const [output, ofiles] = await this.root.execute(
            "student.keys.getAvailableCourses",
            null
        )
        return output
    }

    /**
     * Get list keys.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: user
     */
    async getLists(): Promise<string[]> {
        const [output, ofiles] = await this.root.execute("student.keys.getLists", null)
        return output
    }
}

/**
 *
 * This module exposes the user profile.
 *
 */
class Module_student_profile {
    private readonly root: JutgeApiClient

    constructor(root: JutgeApiClient) {
        this.root = root
    }

    /**
     * Get the profile.
     *
     * 🗂️ Domains: jutge, exam, contest
     * 🔐 Authentication: user
     */
    async get(): Promise<Profile> {
        const [output, ofiles] = await this.root.execute("student.profile.get", null)
        return output
    }

    /**
     * Returns the avatar as a PNG file.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: user
     */
    async getAvatar(): Promise<Download> {
        const [output, ofiles] = await this.root.execute("student.profile.getAvatar", null)
        return ofiles[0]
    }

    /**
     * Download a zip archive with all submissions.
     *
     * Entries sit under a folder named with the user email. Each problem directory contains a YAML summary and, when the source is stored, the program.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: user
     */
    async downloadSubmissions(): Promise<Download> {
        const [output, ofiles] = await this.root.execute(
            "student.profile.downloadSubmissions",
            null
        )
        return ofiles[0]
    }

    /**
     * Download a zip archive with all trading cards.
     *
     * Entries sit under a folder named with the user email. Images of owned cards are placed in a cards folder.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: user
     */
    async downloadCards(): Promise<Download> {
        const [output, ofiles] = await this.root.execute("student.profile.downloadCards", null)
        return ofiles[0]
    }

    /**
     * Update the profile
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: user
     */
    async update(data: NewProfile): Promise<void> {
        const [output, ofiles] = await this.root.execute("student.profile.update", data)
        return output
    }

    /**
     * Update the avatar with new PNG.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: user
     */
    async updateAvatar(ifile: File): Promise<void> {
        const [output, ofiles] = await this.root.execute("student.profile.updateAvatar", null, [
            ifile,
        ])
        return output
    }

    /**
     * Update password.
     *
     * Receives the old password and the new one, and changes the password if the old one is correct and the new one strong enough.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: user
     */
    async updatePassword(data: NewPassword): Promise<void> {
        const [output, ofiles] = await this.root.execute("student.profile.updatePassword", data)
        return output
    }
}

/**
 *
 * No description yet
 *
 */
class Module_student_dashboard {
    private readonly root: JutgeApiClient

    constructor(root: JutgeApiClient) {
        this.root = root
    }

    /**
     * Get the ranking of the user over all users in the system.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: user
     */
    async getAbsoluteRanking(): Promise<number> {
        const [output, ofiles] = await this.root.execute(
            "student.dashboard.getAbsoluteRanking",
            null
        )
        return output
    }

    /**
     * Get all distributions.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: user
     */
    async getAllDistributions(): Promise<AllDistributions> {
        const [output, ofiles] = await this.root.execute(
            "student.dashboard.getAllDistributions",
            null
        )
        return output
    }

    /**
     * Get compilers distribution.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: user
     */
    async getCompilersDistribution(): Promise<Distribution> {
        const [output, ofiles] = await this.root.execute(
            "student.dashboard.getCompilersDistribution",
            null
        )
        return output
    }

    /**
     * Get dashboard.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: user
     */
    async getDashboard(): Promise<Dashboard> {
        const [output, ofiles] = await this.root.execute("student.dashboard.getDashboard", null)
        return output
    }

    /**
     * Get heatmap calendar of submissions.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: user
     */
    async getHeatmapCalendar(): Promise<HeatmapCalendar> {
        const [output, ofiles] = await this.root.execute(
            "student.dashboard.getHeatmapCalendar",
            null
        )
        return output
    }

    /**
     * Get programming languages distribution.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: user
     */
    async getProglangsDistribution(): Promise<Distribution> {
        const [output, ofiles] = await this.root.execute(
            "student.dashboard.getProglangsDistribution",
            null
        )
        return output
    }

    /**
     * Get dashboard stats.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: user
     */
    async getStats(): Promise<Distribution> {
        const [output, ofiles] = await this.root.execute("student.dashboard.getStats", null)
        return output
    }

    /**
     * Get fancy Jutge level.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: user
     */
    async getLevel(): Promise<string> {
        const [output, ofiles] = await this.root.execute("student.dashboard.getLevel", null)
        return output
    }

    /**
     * Get submissions by hour distribution.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: user
     */
    async getSubmissionsByHour(): Promise<Distribution> {
        const [output, ofiles] = await this.root.execute(
            "student.dashboard.getSubmissionsByHour",
            null
        )
        return output
    }

    /**
     * Get submissions by weekday distribution.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: user
     */
    async getSubmissionsByWeekDay(): Promise<Distribution> {
        const [output, ofiles] = await this.root.execute(
            "student.dashboard.getSubmissionsByWeekDay",
            null
        )
        return output
    }

    /**
     * Get verdicts distribution.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: user
     */
    async getVerdictsDistribution(): Promise<Distribution> {
        const [output, ofiles] = await this.root.execute(
            "student.dashboard.getVerdictsDistribution",
            null
        )
        return output
    }
}

/**
 *
 * No description yet
 *
 */
class Module_student_submissions {
    private readonly root: JutgeApiClient

    constructor(root: JutgeApiClient) {
        this.root = root
    }

    /**
     * Get index of all submissions for an abstract problem.
     *
     * Grouped by problem.
     *
     * 🗂️ Domains: jutge, exam, contest
     * 🔐 Authentication: user
     */
    async indexForAbstractProblem(
        problem_nm: string
    ): Promise<Record<string, Record<string, Submission>>> {
        const [output, ofiles] = await this.root.execute(
            "student.submissions.indexForAbstractProblem",
            problem_nm
        )
        return output
    }

    /**
     * Get index of all submissions for a problem.
     *
     * 🗂️ Domains: jutge, exam, contest
     * 🔐 Authentication: user
     */
    async indexForProblem(problem_id: string): Promise<Record<string, Submission>> {
        const [output, ofiles] = await this.root.execute(
            "student.submissions.indexForProblem",
            problem_id
        )
        return output
    }

    /**
     * Get all submissions for a list of abstract problems.
     *
     * Flat array of submissions from newer to older.
     *
     * 🗂️ Domains: jutge, exam, contest
     * 🔐 Authentication: user
     */
    async getForAbstractProblems(problem_nms: string): Promise<Submission[]> {
        const [output, ofiles] = await this.root.execute(
            "student.submissions.getForAbstractProblems",
            problem_nms
        )
        return output
    }

    /**
     * Get all submissions.
     *
     * Flat array of submissions from newer to older.
     *
     * 🗂️ Domains: jutge, exam, contest
     * 🔐 Authentication: user
     */
    async getAll(): Promise<Submission[]> {
        const [output, ofiles] = await this.root.execute("student.submissions.getAll", null)
        return output
    }

    /**
     * Get list of submissions in a range of dates.
     *
     * Flat array of submissions from newer to older for a given range of dates.
     *
     * 🗂️ Domains: jutge, exam, contest
     * 🔐 Authentication: user
     */
    async getRange(data: DateRange2): Promise<Submission[]> {
        const [output, ofiles] = await this.root.execute("student.submissions.getRange", data)
        return output
    }

    /**
     * Submit a solution to the Judge, easy interface.
     *
     * 🗂️ Domains: jutge, exam, contest
     * 🔐 Authentication: user
     */
    async submit(data: {
        problem_id: string
        compiler_id: string
        code: string
        annotation: string
    }): Promise<string> {
        const [output, ofiles] = await this.root.execute("student.submissions.submit", data)
        return output
    }

    /**
     * Submit a solution to the Judge, full interface.
     *
     * 🗂️ Domains: jutge, exam, contest
     * 🔐 Authentication: user
     */
    async submitFull(data: NewSubmissionIn, ifiles: File[]): Promise<NewSubmissionOut> {
        const [output, ofiles] = await this.root.execute(
            "student.submissions.submitFull",
            data,
            ifiles
        )
        return output
    }

    /**
     * Get a submission.
     *
     * 🗂️ Domains: jutge, exam, contest
     * 🔐 Authentication: user
     */
    async get(data: GetGameResultIn): Promise<Submission> {
        const [output, ofiles] = await this.root.execute("student.submissions.get", data)
        return output
    }

    /**
     * Get code for a submission as a string in base64.
     *
     * 🗂️ Domains: jutge, exam, contest
     * 🔐 Authentication: user
     */
    async getCodeAsB64(data: GetGameResultIn): Promise<string> {
        const [output, ofiles] = await this.root.execute(
            "student.submissions.getCodeAsB64",
            data
        )
        return output
    }

    /**
     * Get compilation errors for a submission.
     *
     * 🗂️ Domains: jutge, exam, contest
     * 🔐 Authentication: user
     */
    async getCompilationErrors(data: GetGameResultIn): Promise<CompilationErrors> {
        const [output, ofiles] = await this.root.execute(
            "student.submissions.getCompilationErrors",
            data
        )
        return output
    }

    /**
     * Get code metrics for a submission.
     *
     * 🗂️ Domains: jutge, exam, contest
     * 🔐 Authentication: user
     */
    async getCodeMetrics(data: GetGameResultIn): Promise<CodeMetricsResult> {
        const [output, ofiles] = await this.root.execute(
            "student.submissions.getCodeMetrics",
            data
        )
        return output
    }

    /**
     * Get partial scoring for a submission.
     *
     * 🗂️ Domains: jutge, exam, contest
     * 🔐 Authentication: user
     */
    async getScoring(data: GetGameResultIn): Promise<Scoring> {
        const [output, ofiles] = await this.root.execute("student.submissions.getScoring", data)
        return output
    }

    /**
     * Get list of awards ids for a submission.
     *
     * 🗂️ Domains: jutge, exam, contest
     * 🔐 Authentication: user
     */
    async getAwards(data: GetGameResultIn): Promise<string[]> {
        const [output, ofiles] = await this.root.execute("student.submissions.getAwards", data)
        return output
    }

    /**
     * Get analysis of a submission.
     *
     * 🗂️ Domains: jutge, exam, contest
     * 🔐 Authentication: user
     */
    async getAnalysis(data: GetGameResultIn): Promise<SubmissionAnalysis[]> {
        const [output, ofiles] = await this.root.execute(
            "student.submissions.getAnalysis",
            data
        )
        return output
    }

    /**
     * Get a testcase analysis of a submission.
     *
     * 🗂️ Domains: jutge, exam, contest
     * 🔐 Authentication: user
     */
    async getTestcaseAnalysis(data: {
        problem_id: string
        submission_id: string
        testcase: string
    }): Promise<TestcaseAnalysis> {
        const [output, ofiles] = await this.root.execute(
            "student.submissions.getTestcaseAnalysis",
            data
        )
        return output
    }

    /**
     * Get the modules of a circuit submission. Only for circuits. Each element is an SVG string.
     *
     * 🗂️ Domains: jutge, exam, contest
     * 🔐 Authentication: user
     */
    async getCircuitModules(data: GetGameResultIn): Promise<Record<string, string>> {
        const [output, ofiles] = await this.root.execute(
            "student.submissions.getCircuitModules",
            data
        )
        return output
    }

    /**
     * Get the error report traces of a circuit submission.
     *
     * 🗂️ Domains: jutge, exam, contest
     * 🔐 Authentication: user
     */
    async getCircuitTracesJson(data: GetGameResultIn): Promise<Settings> {
        const [output, ofiles] = await this.root.execute(
            "student.submissions.getCircuitTracesJson",
            data
        )
        return output
    }

    /**
     * Get the error report traces of a circuit submission.
     *
     * 🗂️ Domains: jutge, exam, contest
     * 🔐 Authentication: user
     */
    async getCircuitTracesSvg(data: GetGameResultIn): Promise<Record<string, string>> {
        const [output, ofiles] = await this.root.execute(
            "student.submissions.getCircuitTracesSvg",
            data
        )
        return output
    }

    /**
     * Get the result of a game submission.
     *
     * 🗂️ Domains: jutge, exam, contest
     * 🔐 Authentication: user
     */
    async getGameResult(data: GetGameResultIn): Promise<GetGameResultOut> {
        const [output, ofiles] = await this.root.execute(
            "student.submissions.getGameResult",
            data
        )
        return output
    }

    /**
     * Get the output of a game in a game submission.
     *
     * 🗂️ Domains: jutge, exam, contest
     * 🔐 Authentication: user
     */
    async getGameOutput(data: GetGameOutputIn): Promise<string> {
        const [output, ofiles] = await this.root.execute(
            "student.submissions.getGameOutput",
            data
        )
        return output
    }

    /**
     * Get debug information for a submission.
     *
     * 🗂️ Domains: jutge, exam, contest
     * 🔐 Authentication: user
     */
    async getDebugInformation(data: GetGameResultIn): Promise<DebugInformation | null> {
        const [output, ofiles] = await this.root.execute(
            "student.submissions.getDebugInformation",
            data
        )
        return output
    }
}

/**
 *
 * No description yet
 *
 */
class Module_student_courses {
    private readonly root: JutgeApiClient

    constructor(root: JutgeApiClient) {
        this.root = root
    }

    /**
     * Get index of all available courses.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: user
     */
    async indexAvailable(): Promise<Record<string, BriefCourse>> {
        const [output, ofiles] = await this.root.execute("student.courses.indexAvailable", null)
        return output
    }

    /**
     * Get index of all enrolled courses.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: user
     */
    async indexEnrolled(): Promise<Record<string, BriefCourse>> {
        const [output, ofiles] = await this.root.execute("student.courses.indexEnrolled", null)
        return output
    }

    /**
     * Get an available course.
     *
     * Includes owner and lists.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: user
     */
    async getAvailable(course_key: string): Promise<Course> {
        const [output, ofiles] = await this.root.execute(
            "student.courses.getAvailable",
            course_key
        )
        return output
    }

    /**
     * Get an enrolled course.
     *
     * Includes owner and lists.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: user
     */
    async getEnrolled(course_key: string): Promise<Course> {
        const [output, ofiles] = await this.root.execute(
            "student.courses.getEnrolled",
            course_key
        )
        return output
    }

    /**
     * Enroll in an available course.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: user
     */
    async enroll(course_key: string): Promise<void> {
        const [output, ofiles] = await this.root.execute("student.courses.enroll", course_key)
        return output
    }

    /**
     * Unenroll from an enrolled course.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: user
     */
    async unenroll(course_key: string): Promise<void> {
        const [output, ofiles] = await this.root.execute("student.courses.unenroll", course_key)
        return output
    }

    /**
     * Get the keys of all archived courses.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: user
     */
    async getArchivedKeys(): Promise<string[]> {
        const [output, ofiles] = await this.root.execute(
            "student.courses.getArchivedKeys",
            null
        )
        return output
    }

    /**
     * Archive an enrolled course.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: user
     */
    async archive(course_key: string): Promise<void> {
        const [output, ofiles] = await this.root.execute("student.courses.archive", course_key)
        return output
    }

    /**
     * Unarchive an archived course.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: user
     */
    async unArchive(course_key: string): Promise<void> {
        const [output, ofiles] = await this.root.execute(
            "student.courses.unArchive",
            course_key
        )
        return output
    }
}

/**
 *
 * No description yet
 *
 */
class Module_student_lists {
    private readonly root: JutgeApiClient

    constructor(root: JutgeApiClient) {
        this.root = root
    }

    /**
     * Get all lists.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: user
     */
    async getAll(): Promise<Record<string, BriefList>> {
        const [output, ofiles] = await this.root.execute("student.lists.getAll", null)
        return output
    }

    /**
     * Get a list.
     *
     * Includes items, owner.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: user
     */
    async get(list_key: string): Promise<List> {
        const [output, ofiles] = await this.root.execute("student.lists.get", list_key)
        return output
    }

    /**
     * Get many lists.
     *
     * Includes items, owner. Keys are `list_key`s.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: user
     */
    async getMany(list_keys: string): Promise<Record<string, List>> {
        const [output, ofiles] = await this.root.execute("student.lists.getMany", list_keys)
        return output
    }
}

/**
 *
 * Manage problem passcodes stored for the current user.
 *
 */
class Module_student_passcodes {
    private readonly root: JutgeApiClient

    constructor(root: JutgeApiClient) {
        this.root = root
    }

    /**
     * Store the passcode of a problem.
     *
     * Fails if the problem does not exist, has no passcode, or the given passcode does not match.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: user
     */
    async add(data: Passcode): Promise<void> {
        const [output, ofiles] = await this.root.execute("student.passcodes.add", data)
        return output
    }

    /**
     * Remove the stored problem passcode of a problem.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: user
     */
    async remove(problem_nm: string): Promise<void> {
        const [output, ofiles] = await this.root.execute("student.passcodes.remove", problem_nm)
        return output
    }

    /**
     * Get all problem passcodes stored, sorted by problem name.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: user
     */
    async getAll(): Promise<Passcode[]> {
        const [output, ofiles] = await this.root.execute("student.passcodes.getAll", null)
        return output
    }
}

/**
 *
 * ‼️ The state of this module is UNDER CONSTRUCTION. It is not ready for production use. The output of some function is capped if the exam has not started yet.
 *
 */
class Module_student_exam {
    private readonly root: JutgeApiClient

    constructor(root: JutgeApiClient) {
        this.root = root
    }

    /**
     * Get list of ready exams.
     *
     * An exam is ready if the current time is between its expected start time minus two days and its expected end time plus two days. Exams are sorted by their distance to the current time and by title order in case of ties.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: user
     */
    async getReadyExams(): Promise<ReadyExam[]> {
        const [output, ofiles] = await this.root.execute("student.exam.getReadyExams", null)
        return output
    }

    /**
     * Get current exam.
     *
     * 🗂️ Domains: exam, contest
     * 🔐 Authentication: exam
     */
    async get(): Promise<RunningExam> {
        const [output, ofiles] = await this.root.execute("student.exam.get", null)
        return output
    }

    /**
     * Get a document in an exam.
     *
     * 🗂️ Domains: exam, contest
     * 🔐 Authentication: exam
     */
    async getDocument(document_nm: string): Promise<RunningExamDocument> {
        const [output, ofiles] = await this.root.execute(
            "student.exam.getDocument",
            document_nm
        )
        return output
    }

    /**
     * Get PDF of a document in an exam.
     *
     * 🗂️ Domains: exam, contest
     * 🔐 Authentication: exam
     */
    async getDocumentPdf(document_nm: string): Promise<Download> {
        const [output, ofiles] = await this.root.execute(
            "student.exam.getDocumentPdf",
            document_nm
        )
        return ofiles[0]
    }

    /**
     * Get ranking of the current contest.
     *
     * 🗂️ Domains: exam, contest
     * 🔐 Authentication: exam
     */
    async getRanking(): Promise<Ranking> {
        const [output, ofiles] = await this.root.execute("student.exam.getRanking", null)
        return output
    }

    /**
     * Mark the current exam as finished.
     *
     * 🗂️ Domains: exam, contest
     * 🔐 Authentication: exam
     */
    async finishExam(): Promise<void> {
        const [output, ofiles] = await this.root.execute("student.exam.finishExam", null)
        return output
    }
}

/**
 *
 * No description yet
 *
 */
class Module_student_exams {
    private readonly root: JutgeApiClient

    constructor(root: JutgeApiClient) {
        this.root = root
    }

    /**
     * Get all exams linked to the user.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: user
     */
    async getAll(): Promise<BriefExams> {
        const [output, ofiles] = await this.root.execute("student.exams.getAll", null)
        return output
    }

    /**
     * Get an exam linked to the user.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: user
     */
    async get(exam_key: string): Promise<Exam> {
        const [output, ofiles] = await this.root.execute("student.exams.get", exam_key)
        return output
    }
}

/**
 *
 * No description yet
 *
 */
class Module_student_statuses {
    private readonly root: JutgeApiClient

    constructor(root: JutgeApiClient) {
        this.root = root
    }

    /**
     * Get statuses for all abstract problems.
     *
     * 🗂️ Domains: jutge, exam, contest
     * 🔐 Authentication: user
     */
    async getAll(): Promise<Record<string, AbstractStatus>> {
        const [output, ofiles] = await this.root.execute("student.statuses.getAll", null)
        return output
    }

    /**
     * Get status for an abstract problem.
     *
     * 🗂️ Domains: jutge, exam, contest
     * 🔐 Authentication: user
     */
    async getForAbstractProblem(problem_nm: string): Promise<AbstractStatus> {
        const [output, ofiles] = await this.root.execute(
            "student.statuses.getForAbstractProblem",
            problem_nm
        )
        return output
    }

    /**
     * Get status for a problem.
     *
     * 🗂️ Domains: jutge, exam, contest
     * 🔐 Authentication: user
     */
    async getForProblem(problem_id: string): Promise<Status> {
        const [output, ofiles] = await this.root.execute(
            "student.statuses.getForProblem",
            problem_id
        )
        return output
    }
}

/**
 *
 * This module is not yet finished.
 *
 */
class Module_student_awards {
    private readonly root: JutgeApiClient

    constructor(root: JutgeApiClient) {
        this.root = root
    }

    /**
     * Get all awards.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: user
     */
    async getAll(): Promise<Record<string, BriefAward>> {
        const [output, ofiles] = await this.root.execute("student.awards.getAll", null)
        return output
    }

    /**
     * Get an award.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: user
     */
    async get(award_id: string): Promise<Award> {
        const [output, ofiles] = await this.root.execute("student.awards.get", award_id)
        return output
    }
}

/**
 *
 * User-specific settings stored as key-value pairs.
 *
 */
class Module_student_settings {
    private readonly root: JutgeApiClient

    constructor(root: JutgeApiClient) {
        this.root = root
    }

    /**
     * Get all user settings.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: user
     */
    async getAll(): Promise<Settings> {
        const [output, ofiles] = await this.root.execute("student.settings.getAll", null)
        return output
    }

    /**
     * Get a user setting by key.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: user
     */
    async get(key: string): Promise<any> {
        const [output, ofiles] = await this.root.execute("student.settings.get", key)
        return output
    }

    /**
     * Set a user setting.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: user
     */
    async set(data: Setting): Promise<void> {
        const [output, ofiles] = await this.root.execute("student.settings.set", data)
        return output
    }
}

/**
 *
 * No description yet
 *
 */
class Module_student_tradingCards {
    private readonly root: JutgeApiClient

    constructor(root: JutgeApiClient) {
        this.root = root
    }

    /**
     * Get all trading cards.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: user
     */
    async getAll(): Promise<TradingCards> {
        const [output, ofiles] = await this.root.execute("student.tradingCards.getAll", null)
        return output
    }
}

/**
 *
 * Supervision operations available to tutors.
 *
 */
class Module_tutor {
    private readonly root: JutgeApiClient

    readonly examctl: Module_tutor_examctl
    readonly courses: Module_tutor_courses
    readonly profile: Module_tutor_profile
    readonly statuses: Module_tutor_statuses
    readonly submissions: Module_tutor_submissions

    constructor(root: JutgeApiClient) {
        this.root = root
        this.examctl = new Module_tutor_examctl(root)
        this.courses = new Module_tutor_courses(root)
        this.profile = new Module_tutor_profile(root)
        this.statuses = new Module_tutor_statuses(root)
        this.submissions = new Module_tutor_submissions(root)
    }
}

/**
 *
 *
This module is used to control live exams (and constests, because contests are just exams with a public ranking).

This module is available for instructors of the exam and for tutors enrolled in the exam's course.

Current interface is still experimental and may change in the future.

 *
 */
class Module_tutor_examctl {
    private readonly root: JutgeApiClient

    constructor(root: JutgeApiClient) {
        this.root = root
    }

    /**
     * Get the status of the exam.
     *
     * Returns waiting, started, or finished, plus the start time and the latest end time among students who have not finished.
     *
     * 🗂️ Domains: exam, contest
     * 🔐 Authentication: examctl
     */
    async getStatus(): Promise<{
        status: string /* waiting, started, or finished */
        time_start: Iso8601Date | null
        time_end: Iso8601Date | null
    }> {
        const [output, ofiles] = await this.root.execute("tutor.examctl.getStatus", null)
        return output
    }

    /**
     * List every student in the live exam.
     *
     * Returns each student with first login, computed end time, entry, finish, ban, and invite flags, and distinct submission and login IPs.
     *
     * 🗂️ Domains: exam, contest
     * 🔐 Authentication: examctl
     */
    async liveRoster(): Promise<
        {
            email: string /* Email of the student */
            name: string /* Name of the student */
            start_time: Iso8601Date | null
            end_time: Iso8601Date | null
            entered: number /* Whether the student has entered the exam */
            finished: number /* Whether the student has finished */
            banned: number /* Whether the student is banned */
            invited: number /* Whether the student is invited */
            submission_ips: string[] /* Distinct submission IP addresses */
            login_ips: string[] /* Distinct login IP addresses */
        }[]
    > {
        const [output, ofiles] = await this.root.execute("tutor.examctl.liveRoster", null)
        return output
    }

    /**
     * Get the latest submissions of the exam.
     *
     * Returns the most recent submissions, up to the given limit, with email, problem, verdict, and compiler.
     *
     * 🗂️ Domains: exam, contest
     * 🔐 Authentication: examctl
     */
    async latestSubmissions(data: {
        limit: number /* Maximum number of submissions to return */
    }): Promise<
        {
            email: string /* Email of the student */
            problem: string /* Problem name */
            verdict: string | null
            verdict_info: string | null
            time_in: Iso8601Date /* Submission time */
            problem_id: string /* Problem id */
            compiler_id: string /* Compiler id */
        }[]
    > {
        const [output, ofiles] = await this.root.execute(
            "tutor.examctl.latestSubmissions",
            data
        )
        return output
    }

    /**
     * List students who logged in from more than one IP.
     *
     * Returns each student with more than one distinct login IP, and the time of each login.
     *
     * 🗂️ Domains: exam, contest
     * 🔐 Authentication: examctl
     */
    async multipleIPs(): Promise<
        {
            email: string /* Email of the student */
            name: string /* Name of the student */
            ips: {
                ip: string /* Login IP address */
                at: Iso8601Date /* Login time */
            }[] /* Login IP addresses and times */
        }[]
    > {
        const [output, ofiles] = await this.root.execute("tutor.examctl.multipleIPs", null)
        return output
    }

    /**
     * Get statistics of the exam.
     *
     * Returns verdict, status, compiler, and language counts by problem, plus submission counts bucketed over time.
     *
     * 🗂️ Domains: exam, contest
     * 🔐 Authentication: examctl
     */
    async getStatistics(): Promise<ExamStatistics> {
        const [output, ofiles] = await this.root.execute("tutor.examctl.getStatistics", null)
        return output
    }

    /**
     * Get the ranking.
     *
     * Under development.
     *
     * 🗂️ Domains: exam, contest
     * 🔐 Authentication: examctl
     */
    async getRanking(): Promise<Ranking> {
        const [output, ofiles] = await this.root.execute("tutor.examctl.getRanking", null)
        return output
    }

    /**
     * Start an exam.
     *
     * Starts an exam, saving who has started it and its start time.
     *
     * 🗂️ Domains: exam, contest
     * 🔐 Authentication: examctl
     */
    async start(): Promise<void> {
        const [output, ofiles] = await this.root.execute("tutor.examctl.start", null)
        return output
    }

    /**
     * Finish one student.
     *
     * Sets the student as finished, ending access to the exam.
     *
     * 🗂️ Domains: exam, contest
     * 🔐 Authentication: examctl
     */
    async finish(data: { email: string /* Email of the student */ }): Promise<void> {
        const [output, ofiles] = await this.root.execute("tutor.examctl.finish", data)
        return output
    }

    /**
     * Unfinish one student.
     *
     * Clears the finished flag and reopens access to the exam.
     *
     * 🗂️ Domains: exam, contest
     * 🔐 Authentication: examctl
     */
    async unfinish(data: { email: string /* Email of the student */ }): Promise<void> {
        const [output, ofiles] = await this.root.execute("tutor.examctl.unfinish", data)
        return output
    }

    /**
     * Ban one student.
     *
     * Sets the student as banned and stores the reason, ending their access to the exam.
     *
     * 🗂️ Domains: exam, contest
     * 🔐 Authentication: examctl
     */
    async ban(data: {
        email: string /* Email of the student */
        reason_ban: string /* Reason the student is banned */
    }): Promise<void> {
        const [output, ofiles] = await this.root.execute("tutor.examctl.ban", data)
        return output
    }

    /**
     * Unban one student.
     *
     * Clears the banned flag and the ban reason, restoring access to the exam.
     *
     * 🗂️ Domains: exam, contest
     * 🔐 Authentication: examctl
     */
    async unban(data: { email: string /* Email of the student */ }): Promise<void> {
        const [output, ofiles] = await this.root.execute("tutor.examctl.unban", data)
        return output
    }

    /**
     * Invite one student.
     *
     * Marks the student as invited, leaving the student out of the ranking. Only available when the exam is a contest.
     *
     * 🗂️ Domains: exam, contest
     * 🔐 Authentication: examctl
     */
    async invite(data: { email: string /* Email of the student */ }): Promise<void> {
        const [output, ofiles] = await this.root.execute("tutor.examctl.invite", data)
        return output
    }

    /**
     * Uninvite one student.
     *
     * Clears the invited flag so the student is included in the ranking. Only available when the exam is a contest.
     *
     * 🗂️ Domains: exam, contest
     * 🔐 Authentication: examctl
     */
    async uninvite(data: { email: string /* Email of the student */ }): Promise<void> {
        const [output, ofiles] = await this.root.execute("tutor.examctl.uninvite", data)
        return output
    }

    /**
     * Add or remove minutes for every student.
     *
     * Adds minutes for every student. Negative values remove time. The reason is appended, separated by "; ".
     *
     * 🗂️ Domains: exam, contest
     * 🔐 Authentication: examctl
     */
    async addMinutes(data: {
        minutes: number /* Minutes to add. A negative value removes time. */
        reason_inc: string /* Reason for the time change, appended to the existing reason */
    }): Promise<void> {
        const [output, ofiles] = await this.root.execute("tutor.examctl.addMinutes", data)
        return output
    }

    /**
     * Add or remove minutes for one student.
     *
     * Adds minutes for one student. Negative values remove time. The reason is appended, separated by "; ".
     *
     * 🗂️ Domains: exam, contest
     * 🔐 Authentication: examctl
     */
    async addStudentMinutes(data: {
        email: string /* Email of the student */
        minutes: number /* Minutes to add. A negative value removes time. */
        reason_inc: string /* Reason for the time change, appended to the existing reason */
    }): Promise<void> {
        const [output, ofiles] = await this.root.execute(
            "tutor.examctl.addStudentMinutes",
            data
        )
        return output
    }
}

/**
 *
 * Course operations for tutors.
 *
 */
class Module_tutor_courses {
    private readonly root: JutgeApiClient

    constructor(root: JutgeApiClient) {
        this.root = root
    }

    /**
     * Get course keys the user can tutorize.
     *
     * Returns courses where the user is enrolled as a tutor.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: tutor
     */
    async getCoursesKeys(): Promise<string[]> {
        const [output, ofiles] = await this.root.execute("tutor.courses.getCoursesKeys", null)
        return output
    }

    /**
     * Get students enrolled in a course.
     *
     * Returns name and email for each student enrolled in the given course. Gated to courses the user can tutorize.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: tutor
     */
    async getEnrolledStudents(course_key: string): Promise<EnrolledStudent[]> {
        const [output, ofiles] = await this.root.execute(
            "tutor.courses.getEnrolledStudents",
            course_key
        )
        return output
    }

    /**
     * Get tutors enrolled in a course.
     *
     * Returns name and email for each tutor enrolled in the given course. Gated to courses the user can tutorize.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: tutor
     */
    async getEnrolledTutors(course_key: string): Promise<EnrolledStudent[]> {
        const [output, ofiles] = await this.root.execute(
            "tutor.courses.getEnrolledTutors",
            course_key
        )
        return output
    }

    /**
     * Get all submissions for a course.
     *
     * Returns all submissions for all problems in all lists of the course, from all enrolled students. Each submission includes the student user uid, email, time, problem id, verdict, compiler id, and programming language. Gated to courses the user can tutorize.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: tutor
     */
    async getCourseSubmissions(course_key: string): Promise<CourseSubmission[]> {
        const [output, ofiles] = await this.root.execute(
            "tutor.courses.getCourseSubmissions",
            course_key
        )
        return output
    }
}

/**
 *
 * Student profile operations for tutors.
 *
 */
class Module_tutor_profile {
    private readonly root: JutgeApiClient

    constructor(root: JutgeApiClient) {
        this.root = root
    }

    /**
     * Get the public profile of a student.
     *
     * Returns the public profile for the given email. Gated to students enrolled in courses the user can tutorize.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: tutor
     */
    async get(email: string): Promise<PublicProfile> {
        const [output, ofiles] = await this.root.execute("tutor.profile.get", email)
        return output
    }

    /**
     * Returns the avatar of a student as a PNG file.
     *
     * Returns the avatar for the given email. Gated to students enrolled in courses the user can tutorize.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: tutor
     */
    async getAvatar(email: string): Promise<Download> {
        const [output, ofiles] = await this.root.execute("tutor.profile.getAvatar", email)
        return ofiles[0]
    }
}

/**
 *
 * Student status operations for tutors.
 *
 */
class Module_tutor_statuses {
    private readonly root: JutgeApiClient

    constructor(root: JutgeApiClient) {
        this.root = root
    }

    /**
     * Get statuses for all abstract problems in a course.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: tutor
     */
    async getAll(data: {
        course_key: string
        email: string
    }): Promise<Record<string, AbstractStatus>> {
        const [output, ofiles] = await this.root.execute("tutor.statuses.getAll", data)
        return output
    }

    /**
     * Get status for an abstract problem in a course.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: tutor
     */
    async getForAbstractProblem(data: {
        course_key: string
        email: string
        problem_nm: string
    }): Promise<AbstractStatus> {
        const [output, ofiles] = await this.root.execute(
            "tutor.statuses.getForAbstractProblem",
            data
        )
        return output
    }

    /**
     * Get status for a problem in a course.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: tutor
     */
    async getForProblem(data: {
        course_key: string
        email: string
        problem_id: string
    }): Promise<Status> {
        const [output, ofiles] = await this.root.execute("tutor.statuses.getForProblem", data)
        return output
    }
}

/**
 *
 * Submission operations for tutors.
 *
 */
class Module_tutor_submissions {
    private readonly root: JutgeApiClient

    constructor(root: JutgeApiClient) {
        this.root = root
    }

    /**
     * Get index of all submissions for an abstract problem in a course.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: tutor
     */
    async indexForAbstractProblem(data: {
        course_key: string
        email: string
        problem_nm: string
    }): Promise<Record<string, Record<string, TutorSubmission>>> {
        const [output, ofiles] = await this.root.execute(
            "tutor.submissions.indexForAbstractProblem",
            data
        )
        return output
    }

    /**
     * Get index of all submissions for a problem in a course.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: tutor
     */
    async indexForProblem(data: {
        course_key: string
        email: string
        problem_id: string
    }): Promise<Record<string, TutorSubmission>> {
        const [output, ofiles] = await this.root.execute(
            "tutor.submissions.indexForProblem",
            data
        )
        return output
    }

    /**
     * Get all submissions for a list of abstract problems in a course.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: tutor
     */
    async getForAbstractProblems(data: {
        course_key: string
        email: string
        problem_nms: string /* A comma separated list of `problem_nm`s */
    }): Promise<TutorSubmission[]> {
        const [output, ofiles] = await this.root.execute(
            "tutor.submissions.getForAbstractProblems",
            data
        )
        return output
    }

    /**
     * Get all submissions for a supervised student in a course.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: tutor
     */
    async getAll(data: { course_key: string; email: string }): Promise<TutorSubmission[]> {
        const [output, ofiles] = await this.root.execute("tutor.submissions.getAll", data)
        return output
    }

    /**
     * Get a submission.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: tutor
     */
    async get(data: {
        course_key: string
        email: string
        problem_id: string
        submission_id: string
    }): Promise<TutorSubmission> {
        const [output, ofiles] = await this.root.execute("tutor.submissions.get", data)
        return output
    }

    /**
     * Get code for a submission as a string in base64.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: tutor
     */
    async getCodeAsB64(data: {
        course_key: string
        email: string
        problem_id: string
        submission_id: string
    }): Promise<string> {
        const [output, ofiles] = await this.root.execute("tutor.submissions.getCodeAsB64", data)
        return output
    }

    /**
     * Get compilation errors for a submission.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: tutor
     */
    async getCompilationErrors(data: {
        course_key: string
        email: string
        problem_id: string
        submission_id: string
    }): Promise<CompilationErrors> {
        const [output, ofiles] = await this.root.execute(
            "tutor.submissions.getCompilationErrors",
            data
        )
        return output
    }

    /**
     * Get code metrics for a submission.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: tutor
     */
    async getCodeMetrics(data: {
        course_key: string
        email: string
        problem_id: string
        submission_id: string
    }): Promise<CodeMetrics | null> {
        const [output, ofiles] = await this.root.execute(
            "tutor.submissions.getCodeMetrics",
            data
        )
        return output
    }

    /**
     * Get partial scoring for a submission.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: tutor
     */
    async getScoring(data: {
        course_key: string
        email: string
        problem_id: string
        submission_id: string
    }): Promise<Scoring> {
        const [output, ofiles] = await this.root.execute("tutor.submissions.getScoring", data)
        return output
    }

    /**
     * Get list of awards ids for a submission.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: tutor
     */
    async getAwards(data: {
        course_key: string
        email: string
        problem_id: string
        submission_id: string
    }): Promise<string[]> {
        const [output, ofiles] = await this.root.execute("tutor.submissions.getAwards", data)
        return output
    }

    /**
     * Get analysis of a submission.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: tutor
     */
    async getAnalysis(data: {
        course_key: string
        email: string
        problem_id: string
        submission_id: string
    }): Promise<SubmissionAnalysis[]> {
        const [output, ofiles] = await this.root.execute("tutor.submissions.getAnalysis", data)
        return output
    }

    /**
     * Get a (public) testcase analysis of a submission.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: tutor
     */
    async getTestcaseAnalysis(data: {
        course_key: string
        email: string
        problem_id: string
        submission_id: string
        testcase: string
    }): Promise<TestcaseAnalysis> {
        const [output, ofiles] = await this.root.execute(
            "tutor.submissions.getTestcaseAnalysis",
            data
        )
        return output
    }
}

/**
 *
 * This module is meant to be used by instructors
 *
 */
class Module_instructor {
    private readonly root: JutgeApiClient

    readonly documents: Module_instructor_documents
    readonly lists: Module_instructor_lists
    readonly courses: Module_instructor_courses
    readonly exams: Module_instructor_exams
    readonly problems: Module_instructor_problems
    readonly queries: Module_instructor_queries
    readonly tags: Module_instructor_tags
    readonly jutgeai: Module_instructor_jutgeai

    constructor(root: JutgeApiClient) {
        this.root = root
        this.documents = new Module_instructor_documents(root)
        this.lists = new Module_instructor_lists(root)
        this.courses = new Module_instructor_courses(root)
        this.exams = new Module_instructor_exams(root)
        this.problems = new Module_instructor_problems(root)
        this.queries = new Module_instructor_queries(root)
        this.tags = new Module_instructor_tags(root)
        this.jutgeai = new Module_instructor_jutgeai(root)
    }
}

/**
 *
 * No description yet
 *
 */
class Module_instructor_documents {
    private readonly root: JutgeApiClient

    constructor(root: JutgeApiClient) {
        this.root = root
    }

    /**
     * Get index of all documents.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: instructor
     */
    async index(): Promise<Record<string, Document>> {
        const [output, ofiles] = await this.root.execute("instructor.documents.index", null)
        return output
    }

    /**
     * Get a document.
     *
     * The file content is not included in the response.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: instructor
     */
    async get(document_nm: string): Promise<Document> {
        const [output, ofiles] = await this.root.execute(
            "instructor.documents.get",
            document_nm
        )
        return output
    }

    /**
     * Get PDF of a document.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: instructor
     */
    async getPdf(document_nm: string): Promise<Download> {
        const [output, ofiles] = await this.root.execute(
            "instructor.documents.getPdf",
            document_nm
        )
        return ofiles[0]
    }

    /**
     * Get ZIP of a document.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: instructor
     */
    async getZip(document_nm: string): Promise<Download> {
        const [output, ofiles] = await this.root.execute(
            "instructor.documents.getZip",
            document_nm
        )
        return ofiles[0]
    }

    /**
     * Create a new document.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: instructor
     */
    async create(data: DocumentCreation, ifile: File): Promise<void> {
        const [output, ofiles] = await this.root.execute("instructor.documents.create", data, [
            ifile,
        ])
        return output
    }

    /**
     * Update a document.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: instructor
     */
    async update(data: DocumentCreation, ifile: File): Promise<void> {
        const [output, ofiles] = await this.root.execute("instructor.documents.update", data, [
            ifile,
        ])
        return output
    }

    /**
     * Remove a document.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: instructor
     */
    async remove(document_nm: string): Promise<void> {
        const [output, ofiles] = await this.root.execute(
            "instructor.documents.remove",
            document_nm
        )
        return output
    }
}

/**
 *
 * No description yet
 *
 */
class Module_instructor_lists {
    private readonly root: JutgeApiClient

    constructor(root: JutgeApiClient) {
        this.root = root
    }

    /**
     * Get index of all lists.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: instructor
     */
    async index(): Promise<Record<string, InstructorBriefList>> {
        const [output, ofiles] = await this.root.execute("instructor.lists.index", null)
        return output
    }

    /**
     * Get a list.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: instructor
     */
    async get(list_nm: string): Promise<InstructorList> {
        const [output, ofiles] = await this.root.execute("instructor.lists.get", list_nm)
        return output
    }

    /**
     * Create a new list.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: instructor
     */
    async create(data: InstructorListCreation): Promise<void> {
        const [output, ofiles] = await this.root.execute("instructor.lists.create", data)
        return output
    }

    /**
     * Update an existing list.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: instructor
     */
    async update(data: InstructorListCreation): Promise<void> {
        const [output, ofiles] = await this.root.execute("instructor.lists.update", data)
        return output
    }

    /**
     * Delete an existing list.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: instructor
     */
    async remove(list_nm: string): Promise<void> {
        const [output, ofiles] = await this.root.execute("instructor.lists.remove", list_nm)
        return output
    }

    /**
     * Get the list of lists that are archived.
     *
     * At some point, endpoints related to archiving lists should change as the archive bit will be an attribute of each list.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: instructor
     */
    async getArchived(): Promise<string[]> {
        const [output, ofiles] = await this.root.execute("instructor.lists.getArchived", null)
        return output
    }

    /**
     * Archive a list.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: instructor
     */
    async archive(list_nm: string): Promise<void> {
        const [output, ofiles] = await this.root.execute("instructor.lists.archive", list_nm)
        return output
    }

    /**
     * Unarchive a list.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: instructor
     */
    async unarchive(list_nm: string): Promise<void> {
        const [output, ofiles] = await this.root.execute("instructor.lists.unarchive", list_nm)
        return output
    }
}

/**
 *
 *
This module manages the courses that an instructor is teaching. It allows the instructor to manage the course, including getting and updating its lists, students and tutors. It can also send invites to pending students and tutors.

The course name is a unique slug for the course. It is used to reference the course in the system.

The course title is the human-readable title of the course.

The course description is a human-readable description of the course.

Students and tutors are managed in three lists: invited, enrolled and pending. These contains the emails of these users. Invited students and tutors are those who have been invited to the course. Enrolled students and tutors are those who have accepted the invitation and are part of the course. Pending students and tutors are those who have been invited to join the course but have not yet accepted. Enrolled and pending students and tutors are managed by the system and cannot not be modified directly.

 *
 */
class Module_instructor_courses {
    private readonly root: JutgeApiClient

    constructor(root: JutgeApiClient) {
        this.root = root
    }

    /**
     * Get index of all courses.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: instructor
     */
    async index(): Promise<Record<string, InstructorBriefCourse>> {
        const [output, ofiles] = await this.root.execute("instructor.courses.index", null)
        return output
    }

    /**
     * Get a course.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: instructor
     */
    async get(course_nm: string): Promise<InstructorCourse> {
        const [output, ofiles] = await this.root.execute("instructor.courses.get", course_nm)
        return output
    }

    /**
     * Create a new course.
     *
     * Only invited students and tutors are taken into account. Enrolled and pending students and tutors are ignored, as these are managed by the system.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: instructor
     */
    async create(data: InstructorCourseCreation): Promise<void> {
        const [output, ofiles] = await this.root.execute("instructor.courses.create", data)
        return output
    }

    /**
     * Update an existing course.
     *
     * Only invited students and tutors are taken into account. Enrolled and pending students and tutors are ignored, as these are managed by the system.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: instructor
     */
    async update(data: InstructorCourseUpdate): Promise<void> {
        const [output, ofiles] = await this.root.execute("instructor.courses.update", data)
        return output
    }

    /**
     * Delete an existing course.
     *
     * A course should not be deleted. Ask a system administrator to remove it if you really need it.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: instructor
     */
    async remove(course_nm: string): Promise<void> {
        const [output, ofiles] = await this.root.execute("instructor.courses.remove", course_nm)
        return output
    }

    /**
     * Send invite email to pending students in the course.
     *
     * Please do not abuse.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: instructor
     */
    async sendInviteToStudents(course_nm: string): Promise<void> {
        const [output, ofiles] = await this.root.execute(
            "instructor.courses.sendInviteToStudents",
            course_nm
        )
        return output
    }

    /**
     * Send invite email to pending tutors in the course.
     *
     * Please do not abuse.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: instructor
     */
    async sendInviteToTutors(course_nm: string): Promise<void> {
        const [output, ofiles] = await this.root.execute(
            "instructor.courses.sendInviteToTutors",
            course_nm
        )
        return output
    }

    /**
     * Get the profiles of the students enrolled in the course.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: instructor
     */
    async getStudentProfiles(course_nm: string): Promise<Record<string, StudentProfile>> {
        const [output, ofiles] = await this.root.execute(
            "instructor.courses.getStudentProfiles",
            course_nm
        )
        return output
    }

    /**
     * Get the profiles of the tutors enrolled in the course.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: instructor
     */
    async getTutorProfiles(course_nm: string): Promise<Record<string, StudentProfile>> {
        const [output, ofiles] = await this.root.execute(
            "instructor.courses.getTutorProfiles",
            course_nm
        )
        return output
    }

    /**
     * Get the list of courses that are archived.
     *
     * At some point, endpoints related to archiving courses should change as the archive bit will be an attribute of each course.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: instructor
     */
    async getArchived(): Promise<string[]> {
        const [output, ofiles] = await this.root.execute("instructor.courses.getArchived", null)
        return output
    }

    /**
     * Archive a course.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: instructor
     */
    async archive(course_nm: string): Promise<void> {
        const [output, ofiles] = await this.root.execute(
            "instructor.courses.archive",
            course_nm
        )
        return output
    }

    /**
     * Unarchive a course.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: instructor
     */
    async unarchive(course_nm: string): Promise<void> {
        const [output, ofiles] = await this.root.execute(
            "instructor.courses.unarchive",
            course_nm
        )
        return output
    }
}

/**
 *
 *

This module manages the exams that an instructor is teaching. It allows the instructor to manage the exam, including getting and updating its documents, problems, students and submissions.

Exams objects are quite complex. Thus, this interface is also a bit complex. Each part of an exam can be get or updated in a separate endpoint. The main endpoint is the get endpoint, which returns the full exam object.

 *
 */
class Module_instructor_exams {
    private readonly root: JutgeApiClient

    constructor(root: JutgeApiClient) {
        this.root = root
    }

    /**
     * Get index of all exams.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: instructor
     */
    async index(): Promise<Record<string, InstructorBriefExam>> {
        const [output, ofiles] = await this.root.execute("instructor.exams.index", null)
        return output
    }

    /**
     * Get an exam.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: instructor
     */
    async get(exam_nm: string): Promise<InstructorExam> {
        const [output, ofiles] = await this.root.execute("instructor.exams.get", exam_nm)
        return output
    }

    /**
     * Get documents of an exam.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: instructor
     */
    async getDocuments(exam_nm: string): Promise<InstructorExamDocument[]> {
        const [output, ofiles] = await this.root.execute(
            "instructor.exams.getDocuments",
            exam_nm
        )
        return output
    }

    /**
     * Get problems of an exam.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: instructor
     */
    async getProblems(exam_nm: string): Promise<InstructorExamProblem[]> {
        const [output, ofiles] = await this.root.execute(
            "instructor.exams.getProblems",
            exam_nm
        )
        return output
    }

    /**
     * Get students of an exam.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: instructor
     */
    async getStudents(exam_nm: string): Promise<InstructorExamStudent[]> {
        const [output, ofiles] = await this.root.execute(
            "instructor.exams.getStudents",
            exam_nm
        )
        return output
    }

    /**
     * Get an student of an exam.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: instructor
     */
    async getStudent(data: {
        exam_nm: string /* Exam name */
        email: string /* Email of the student */
    }): Promise<InstructorExamStudent> {
        const [output, ofiles] = await this.root.execute("instructor.exams.getStudent", data)
        return output
    }

    /**
     * Get submissions of an exam as a webstream.
     *
     * Meant for real-time streaming of submissions, most instructors will possibly prefer getSubmissionsPack.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: instructor
     */
    async getSubmissions(data: {
        exam_nm: string /* Exam name */
        options: InstructorExamSubmissionsOptions
    }): Promise<WebStream> {
        const [output, ofiles] = await this.root.execute(
            "instructor.exams.getSubmissions",
            data
        )
        return output
    }

    /**
     * Get submissions of an exam as a pack.
     *
     * This endpoint will prepare the pack in the background and return a link to download it later. Packs take some time to be prepared, and are deleted after 24 hours. This is the preferred endpoint for most instructors, as it is simpler to use than getSubmissions.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: instructor
     */
    async getSubmissionsPack(data: {
        exam_nm: string /* Exam name */
        options: InstructorExamSubmissionsOptions
    }): Promise<Pack> {
        const [output, ofiles] = await this.root.execute(
            "instructor.exams.getSubmissionsPack",
            data
        )
        return output
    }

    /**
     * Get statistics of an exam.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: instructor
     */
    async getStatistics(exam_nm: string): Promise<ExamStatistics> {
        const [output, ofiles] = await this.root.execute(
            "instructor.exams.getStatistics",
            exam_nm
        )
        return output
    }

    /**
     * Create a new exam.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: instructor
     */
    async create(data: InstructorExamCreation): Promise<void> {
        const [output, ofiles] = await this.root.execute("instructor.exams.create", data)
        return output
    }

    /**
     * Update an existing exam.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: instructor
     */
    async update(data: InstructorExamUpdate): Promise<void> {
        const [output, ofiles] = await this.root.execute("instructor.exams.update", data)
        return output
    }

    /**
     * Update documents of an exam.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: instructor
     */
    async updateDocuments(data: {
        exam_nm: string /* Exam name */
        document_nms: string[] /* Document names */
    }): Promise<void> {
        const [output, ofiles] = await this.root.execute(
            "instructor.exams.updateDocuments",
            data
        )
        return output
    }

    /**
     * Update compilers of an exam.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: instructor
     */
    async updateCompilers(data: {
        exam_nm: string /* Exam name */
        compiler_ids: string[] /* Compiler IDs */
    }): Promise<void> {
        const [output, ofiles] = await this.root.execute(
            "instructor.exams.updateCompilers",
            data
        )
        return output
    }

    /**
     * Update problems of an exam.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: instructor
     */
    async updateProblems(data: {
        exam_nm: string /* Exam name */
        problems: InstructorExamProblem[] /* Problems of the exam */
    }): Promise<void> {
        const [output, ofiles] = await this.root.execute(
            "instructor.exams.updateProblems",
            data
        )
        return output
    }

    /**
     * Update students of an exam.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: instructor
     */
    async updateStudents(data: {
        exam_nm: string /* Exam name */
        students: InstructorExamStudent[] /* Students of the exam */
    }): Promise<void> {
        const [output, ofiles] = await this.root.execute(
            "instructor.exams.updateStudents",
            data
        )
        return output
    }

    /**
     * Add students to an exam.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: instructor
     */
    async addStudents(data: {
        exam_nm: string /* Exam name */
        students: InstructorExamStudent[] /* Students of the exam */
    }): Promise<void> {
        const [output, ofiles] = await this.root.execute("instructor.exams.addStudents", data)
        return output
    }

    /**
     * Remove students from an exam.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: instructor
     */
    async removeStudents(data: {
        exam_nm: string /* Exam name */
        emails: string[] /* emails */
    }): Promise<void> {
        const [output, ofiles] = await this.root.execute(
            "instructor.exams.removeStudents",
            data
        )
        return output
    }

    /**
     * Delete an existing exam.
     *
     * Note: An exam can only be deleted if it has not started.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: instructor
     */
    async remove(exam_nm: string): Promise<void> {
        const [output, ofiles] = await this.root.execute("instructor.exams.remove", exam_nm)
        return output
    }

    /**
     * Get the list of exams that are archived.
     *
     * At some point, endpoints related to archiving exams should change as the archive bit will be an attribute of each exam.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: instructor
     */
    async getArchived(): Promise<string[]> {
        const [output, ofiles] = await this.root.execute("instructor.exams.getArchived", null)
        return output
    }

    /**
     * Archive an exam.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: instructor
     */
    async archive(exam_nm: string): Promise<void> {
        const [output, ofiles] = await this.root.execute("instructor.exams.archive", exam_nm)
        return output
    }

    /**
     * Unarchive an exam.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: instructor
     */
    async unarchive(exam_nm: string): Promise<void> {
        const [output, ofiles] = await this.root.execute("instructor.exams.unarchive", exam_nm)
        return output
    }

    /**
     * Get the ranking.
     *
     * Under development.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: instructor
     */
    async getRanking(exam_nm: string): Promise<Ranking> {
        const [output, ofiles] = await this.root.execute("instructor.exams.getRanking", exam_nm)
        return output
    }
}

/**
 *
 * No description yet
 *
 */
class Module_instructor_problems {
    private readonly root: JutgeApiClient

    constructor(root: JutgeApiClient) {
        this.root = root
    }

    /**
     * Get the list of own problems.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: instructor
     */
    async getOwnProblems(): Promise<string[]> {
        const [output, ofiles] = await this.root.execute(
            "instructor.problems.getOwnProblems",
            null
        )
        return output
    }

    /**
     * Set the sharing settings of a problem.
     *
     * *        Without a passcode, the problem is visible to all users.
     *        With a passcode, the problem is only visible to users with the correct passcode.
     *        With shared testcases, the testcases are shared with instructors.
     *        With shared solutions, the solutions are shared with instructors.
     *
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: instructor
     */
    async setSharingSettings(data: SharingSettings): Promise<void> {
        const [output, ofiles] = await this.root.execute(
            "instructor.problems.setSharingSettings",
            data
        )
        return output
    }

    /**
     * Get the sharing settings of a problem.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: instructor
     */
    async getSharingSettings(problem_nm: string): Promise<SharingSettings> {
        const [output, ofiles] = await this.root.execute(
            "instructor.problems.getSharingSettings",
            problem_nm
        )
        return output
    }

    /**
     * Get the sharing settings of all problems.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: instructor
     */
    async getAllSharingSettings(): Promise<SharingSettings[]> {
        const [output, ofiles] = await this.root.execute(
            "instructor.problems.getAllSharingSettings",
            null
        )
        return output
    }

    /**
     * Get alerts for one problem.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: instructor
     */
    async getAlerts(problem_nm: string): Promise<ProblemAlerts> {
        const [output, ofiles] = await this.root.execute(
            "instructor.problems.getAlerts",
            problem_nm
        )
        return output
    }

    /**
     * Get alerts for all problems.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: instructor
     */
    async getAllAlerts(): Promise<ProblemAlerts[]> {
        const [output, ofiles] = await this.root.execute(
            "instructor.problems.getAllAlerts",
            null
        )
        return output
    }

    /**
     * Share a problem with users.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: instructor
     */
    async shareWith(data: ShareWithInp): Promise<void> {
        const [output, ofiles] = await this.root.execute("instructor.problems.shareWith", data)
        return output
    }

    /**
     * Set the deprecation of a problem.
     *
     * If the reason is null or empty, the problem is undeprecated.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: instructor
     */
    async setDeprecation(data: Deprecation): Promise<void> {
        const [output, ofiles] = await this.root.execute(
            "instructor.problems.setDeprecation",
            data
        )
        return output
    }

    /**
     * Get the popularity buckets for all problems.
     *
     * The buckets are sorted by the number of problems in each bucket by total number of submissions. The data is refreshed every hour.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: instructor
     */
    async getProblemPopularityBuckets(): Promise<ProblemPopularityBucketEntry[]> {
        const [output, ofiles] = await this.root.execute(
            "instructor.problems.getProblemPopularityBuckets",
            null
        )
        return output
    }

    /**
     * Get anonymous submissions for an abstract problem.
     *
     * This function is useful to produce statistics about the submissions for an abstract problem. The user ids are anonymized using a nonce.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: instructor
     */
    async getAnonymousSubmissions(problem_nm: string): Promise<ProblemAnonymousSubmission[]> {
        const [output, ofiles] = await this.root.execute(
            "instructor.problems.getAnonymousSubmissions",
            problem_nm
        )
        return output
    }

    /**
     * Download a problem as a ZIP file.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: instructor
     */
    async download(problem_nm: string): Promise<Download> {
        const [output, ofiles] = await this.root.execute(
            "instructor.problems.download",
            problem_nm
        )
        return ofiles[0]
    }

    /**
     * Create a problem from a ZIP archive.
     *
     * This endpoint uses terminal web streaming: It returns an id from which the problem feedback is streamed over <URL>/api/webstreams/<id>.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: instructor
     */
    async create(passcode: string, ifile: File): Promise<WebStream> {
        const [output, ofiles] = await this.root.execute(
            "instructor.problems.create",
            passcode,
            [ifile]
        )
        return output
    }

    /**
     * Update a problem from a ZIP archive.
     *
     * This endpoint uses terminal web streaming: It returns an id from which the problem feedback is streamed over <URL>/api/webstreams/<id>.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: instructor
     */
    async update(problem_nm: string, ifile: File): Promise<WebStream> {
        const [output, ofiles] = await this.root.execute(
            "instructor.problems.update",
            problem_nm,
            [ifile]
        )
        return output
    }

    /**
     * Remove a problem.
     *
     * A problem can only be removed if it has few submissions.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: instructor
     */
    async remove(problem_nm: string): Promise<void> {
        const [output, ofiles] = await this.root.execute(
            "instructor.problems.remove",
            problem_nm
        )
        return output
    }
}

/**
 *
 * No description yet
 *
 */
class Module_instructor_queries {
    private readonly root: JutgeApiClient

    constructor(root: JutgeApiClient) {
        this.root = root
    }

    /**
     * Get submissions for a problem in a course.
     *
     * Returns a list of submissions for a given problem for all students of a given course. Each submission includes the email, time, problem name, problem id, verdict, and IP address. The list is ordered by email and time. Known as ricard01 in the past.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: instructor
     */
    async getCourseProblemSubmissions(data: {
        course_nm: string
        problem_nm: string
    }): Promise<SubmissionsQuery> {
        const [output, ofiles] = await this.root.execute(
            "instructor.queries.getCourseProblemSubmissions",
            data
        )
        return output
    }

    /**
     * Get submissions for all problems in a list in a course.
     *
     * Returns a list of submissions for all problems in a given list for all students of a given course. Each submission includes the email, time, problem name, problem id, verdict, and IP address. The list is ordered by email, problem id and time. Known as ricard02 in the past.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: instructor
     */
    async getCourseListSubmissions(data: {
        course_nm: string
        list_nm: string
    }): Promise<SubmissionsQuery> {
        const [output, ofiles] = await this.root.execute(
            "instructor.queries.getCourseListSubmissions",
            data
        )
        return output
    }
}

/**
 *
 * No description yet
 *
 */
class Module_instructor_tags {
    private readonly root: JutgeApiClient

    constructor(root: JutgeApiClient) {
        this.root = root
    }

    /**
     * Get list of all tags.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: instructor
     */
    async index(): Promise<string[]> {
        const [output, ofiles] = await this.root.execute("instructor.tags.index", null)
        return output
    }

    /**
     * Get all tags with their problems.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: instructor
     */
    async getDict(): Promise<TagsDict> {
        const [output, ofiles] = await this.root.execute("instructor.tags.getDict", null)
        return output
    }

    /**
     * Get all problems with a given tag.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: instructor
     */
    async get(tag: string): Promise<string[]> {
        const [output, ofiles] = await this.root.execute("instructor.tags.get", tag)
        return output
    }
}

/**
 *
 * No description yet
 *
 */
class Module_instructor_jutgeai {
    private readonly root: JutgeApiClient

    constructor(root: JutgeApiClient) {
        this.root = root
    }

    /**
     * Get the list of supported models.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: instructor
     */
    async supportedModels(): Promise<string[]> {
        const [output, ofiles] = await this.root.execute(
            "instructor.jutgeai.supportedModels",
            null
        )
        return output
    }

    /**
     * Get the list of supported image models.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: instructor
     */
    async supportedImageModels(): Promise<string[]> {
        const [output, ofiles] = await this.root.execute(
            "instructor.jutgeai.supportedImageModels",
            null
        )
        return output
    }

    /**
     * Get USD prices per 1M tokens for supported text models.
     *
     * Prices are fetched live from OpenRouter for models in `supportedModels` and historical `formerModels` (for usage accounting).
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: instructor
     */
    async getPrices(): Promise<ModelPrices> {
        const [output, ofiles] = await this.root.execute("instructor.jutgeai.getPrices", null)
        return output
    }

    /**
     * Chat with an AI model using a list of messages.
     *
     * Send a conversation (list of system|user|assistant messages) and get the next assistant reply. Models are listed in the `supportedModels` endpoint. This endpoint uses terminal web streaming: It returns an id from which the chat is streamed over <URL>/api/webstreams/<id>. If `addUsage` is true, the usage of the model will be added at the end of the response as a JSON object between `---USAGE_JSON_START---` and `---USAGE_JSON_END---`.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: instructor
     */
    async chat(data: ChatPrompt): Promise<WebStream> {
        const [output, ofiles] = await this.root.execute("instructor.jutgeai.chat", data)
        return output
    }

    /**
     * Create an image using an AI image model.
     *
     * Some models only accept certain sizes and aspect ratios.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: instructor
     */
    async createImage(data: CreateImageInput): Promise<Download> {
        const [output, ofiles] = await this.root.execute("instructor.jutgeai.createImage", data)
        return ofiles[0]
    }

    /**
     * Get audit usage of LLM models.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: instructor
     */
    async getLlmUsage(): Promise<LlmUsageEntry[]> {
        const [output, ofiles] = await this.root.execute("instructor.jutgeai.getLlmUsage", null)
        return output
    }
}

/**
 *
 * Module to allow playing Jutge.org games. All operations require the `competitions` user. This module is still under development and is not yet ready for production.
 *
 */
class Module_games {
    private readonly root: JutgeApiClient

    constructor(root: JutgeApiClient) {
        this.root = root
    }

    /**
     * Get list of problems that are games.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: competitions
     */
    async getGames(): Promise<string[]> {
        const [output, ofiles] = await this.root.execute("games.getGames", null)
        return output
    }

    /**
     * Get dummy player for a game.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: competitions
     */
    async getDummy(problem_id: string): Promise<string> {
        const [output, ofiles] = await this.root.execute("games.getDummy", problem_id)
        return output
    }

    /**
     * Get a ZIP file with the viewer for a game.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: competitions
     */
    async getViewer(problem_id: string): Promise<Download> {
        const [output, ofiles] = await this.root.execute("games.getViewer", problem_id)
        return ofiles[0]
    }

    /**
     * Submit a match for a game (combat or competition match).
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: competitions
     */
    async submitMatch(data: SubmitMatchIn): Promise<NewSubmissionOut> {
        const [output, ofiles] = await this.root.execute("games.submitMatch", data)
        return output
    }
}

/**
 *
 * Module with administration endpoints. Not meant for regular users. It still lacks lots of endpoints
 *
 */
class Module_admin {
    private readonly root: JutgeApiClient

    readonly instructors: Module_admin_instructors
    readonly courses: Module_admin_courses
    readonly users: Module_admin_users
    readonly dashboard: Module_admin_dashboard
    readonly queue: Module_admin_queue
    readonly tasks: Module_admin_tasks
    readonly stats: Module_admin_stats
    readonly problems: Module_admin_problems

    constructor(root: JutgeApiClient) {
        this.root = root
        this.instructors = new Module_admin_instructors(root)
        this.courses = new Module_admin_courses(root)
        this.users = new Module_admin_users(root)
        this.dashboard = new Module_admin_dashboard(root)
        this.queue = new Module_admin_queue(root)
        this.tasks = new Module_admin_tasks(root)
        this.stats = new Module_admin_stats(root)
        this.problems = new Module_admin_problems(root)
    }
}

/**
 *
 * No description yet
 *
 */
class Module_admin_instructors {
    private readonly root: JutgeApiClient

    constructor(root: JutgeApiClient) {
        this.root = root
    }

    /**
     * Get instructors.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: admin
     */
    async get(): Promise<InstructorEntries> {
        const [output, ofiles] = await this.root.execute("admin.instructors.get", null)
        return output
    }

    /**
     * Add an instructor.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: admin
     */
    async add(data: { email: string; username: string }): Promise<void> {
        const [output, ofiles] = await this.root.execute("admin.instructors.add", data)
        return output
    }

    /**
     * Remove an instructor.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: admin
     */
    async remove(email: string): Promise<void> {
        const [output, ofiles] = await this.root.execute("admin.instructors.remove", email)
        return output
    }
}

/**
 *
 * No description yet
 *
 */
class Module_admin_courses {
    private readonly root: JutgeApiClient

    constructor(root: JutgeApiClient) {
        this.root = root
    }

    /**
     * Get all courses from all instructors.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: admin
     */
    async getAll(): Promise<AdminCourses> {
        const [output, ofiles] = await this.root.execute("admin.courses.getAll", null)
        return output
    }

    /**
     * Set the public and official fields of a course.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: admin
     */
    async setPublicAndOfficial(data: AdminCourseSetPublicAndOfficial): Promise<void> {
        const [output, ofiles] = await this.root.execute(
            "admin.courses.setPublicAndOfficial",
            data
        )
        return output
    }
}

/**
 *
 * No description yet
 *
 */
class Module_admin_users {
    private readonly root: JutgeApiClient

    constructor(root: JutgeApiClient) {
        this.root = root
    }

    /**
     * Count users
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: admin
     */
    async count(): Promise<number> {
        const [output, ofiles] = await this.root.execute("admin.users.count", null)
        return output
    }

    /**
     * Create a user
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: admin
     */
    async create(data: UserCreation): Promise<void> {
        const [output, ofiles] = await this.root.execute("admin.users.create", data)
        return output
    }

    /**
     * Remove a user
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: admin
     */
    async remove(email: string): Promise<void> {
        const [output, ofiles] = await this.root.execute("admin.users.remove", email)
        return output
    }

    /**
     * Set a password for a user
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: admin
     */
    async setPassword(data: {
        email: string
        password: string
        message: string
    }): Promise<void> {
        const [output, ofiles] = await this.root.execute("admin.users.setPassword", data)
        return output
    }

    /**
     * Get all profiles of users whose email or name contains a specific string
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: admin
     */
    async getProfiles(data: string): Promise<ProfileForAdmin[]> {
        const [output, ofiles] = await this.root.execute("admin.users.getProfiles", data)
        return output
    }

    /**
     * Get all users (well, just email and name) whose email contains a specific string
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: admin
     */
    async getAllWithEmail(data: string): Promise<UsersEmailsAndNames> {
        const [output, ofiles] = await this.root.execute("admin.users.getAllWithEmail", data)
        return output
    }

    /**
     * Get a list of emails of spam users
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: admin
     */
    async getSpamUsers(): Promise<string[]> {
        const [output, ofiles] = await this.root.execute("admin.users.getSpamUsers", null)
        return output
    }

    /**
     * Remove spam users
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: admin
     */
    async removeSpamUsers(data: string[]): Promise<void> {
        const [output, ofiles] = await this.root.execute("admin.users.removeSpamUsers", data)
        return output
    }
}

/**
 *
 * No description yet
 *
 */
class Module_admin_dashboard {
    private readonly root: JutgeApiClient

    constructor(root: JutgeApiClient) {
        this.root = root
    }

    /**
     * Get all admin dashboard items.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: admin
     */
    async getAll(): Promise<AdminDashboard> {
        const [output, ofiles] = await this.root.execute("admin.dashboard.getAll", null)
        return output
    }

    /**
     * Get database info.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: admin
     */
    async getDatabasesInfo(): Promise<DatabasesInfo> {
        const [output, ofiles] = await this.root.execute(
            "admin.dashboard.getDatabasesInfo",
            null
        )
        return output
    }

    /**
     * Get free disk space.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: admin
     */
    async getFreeDiskSpace(): Promise<FreeDiskSpace> {
        const [output, ofiles] = await this.root.execute(
            "admin.dashboard.getFreeDiskSpace",
            null
        )
        return output
    }

    /**
     * Get recent connected users.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: admin
     */
    async getRecentConnectedUsers(): Promise<RecentConnectedUsers> {
        const [output, ofiles] = await this.root.execute(
            "admin.dashboard.getRecentConnectedUsers",
            null
        )
        return output
    }

    /**
     * Get recent load averages.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: admin
     */
    async getRecentLoadAverages(): Promise<RecentLoadAverages> {
        const [output, ofiles] = await this.root.execute(
            "admin.dashboard.getRecentLoadAverages",
            null
        )
        return output
    }

    /**
     * Get recent submissions.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: admin
     */
    async getRecentSubmissions(): Promise<RecentSubmissions> {
        const [output, ofiles] = await this.root.execute(
            "admin.dashboard.getRecentSubmissions",
            null
        )
        return output
    }

    /**
     * Get submissions histograms.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: admin
     */
    async getSubmissionsHistograms(): Promise<SubmissionsHistograms> {
        const [output, ofiles] = await this.root.execute(
            "admin.dashboard.getSubmissionsHistograms",
            null
        )
        return output
    }

    /**
     * Get zombies.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: admin
     */
    async getZombies(): Promise<Zombies> {
        const [output, ofiles] = await this.root.execute("admin.dashboard.getZombies", null)
        return output
    }

    /**
     * Get upcoming exams
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: admin
     */
    async getUpcomingExams(data: {
        daysBefore: number
        daysAfter: number
    }): Promise<UpcomingExams> {
        const [output, ofiles] = await this.root.execute(
            "admin.dashboard.getUpcomingExams",
            data
        )
        return output
    }

    /**
     * Get pm2 status
     *
     * This endpoint retrieves the status of PM2 processes as reported by `pm2 jlist`.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: admin
     */
    async getPM2Status(): Promise<any> {
        const [output, ofiles] = await this.root.execute("admin.dashboard.getPM2Status", null)
        return output
    }

    /**
     * Get docker status
     *
     * This endpoint retrieves the status of docker processes as reported by `docker ps --all`.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: admin
     */
    async getDockerStatus(): Promise<any> {
        const [output, ofiles] = await this.root.execute(
            "admin.dashboard.getDockerStatus",
            null
        )
        return output
    }
}

/**
 *
 * No description yet
 *
 */
class Module_admin_queue {
    private readonly root: JutgeApiClient

    constructor(root: JutgeApiClient) {
        this.root = root
    }

    /**
     * Get the lattest submissions from the queue in descending chronological order for a certain verdict.
     *
     * The `limit` parameter tells the number of submissions to retrieve. The `verdicts` parameter is an array of verdicts to filter the submissions. If no verdicts are provided, all submissions will be retrieved.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: admin
     */
    async getQueue(data: QueueQuery): Promise<SubmissionQueueItems> {
        const [output, ofiles] = await this.root.execute("admin.queue.getQueue", data)
        return output
    }
}

/**
 *
 * No description yet
 *
 */
class Module_admin_tasks {
    private readonly root: JutgeApiClient

    constructor(root: JutgeApiClient) {
        this.root = root
    }

    /**
     * Purge expired access tokens.
     *
     * Purge expired access tokens (call it from time to time, it does not hurt)
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: admin
     */
    async purgeAuthTokens(): Promise<void> {
        const [output, ofiles] = await this.root.execute("admin.tasks.purgeAuthTokens", null)
        return output
    }

    /**
     * Clear all memoization caches.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: admin
     */
    async clearCaches(): Promise<void> {
        const [output, ofiles] = await this.root.execute("admin.tasks.clearCaches", null)
        return output
    }

    /**
     * Fatalize IE submissions.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: admin
     */
    async fatalizeIEs(): Promise<void> {
        const [output, ofiles] = await this.root.execute("admin.tasks.fatalizeIEs", null)
        return output
    }

    /**
     * Fatalize pending submissions.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: admin
     */
    async fatalizePendings(): Promise<void> {
        const [output, ofiles] = await this.root.execute("admin.tasks.fatalizePendings", null)
        return output
    }

    /**
     * Resubmit IE submissions.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: admin
     */
    async resubmitIEs(): Promise<void> {
        const [output, ofiles] = await this.root.execute("admin.tasks.resubmitIEs", null)
        return output
    }

    /**
     * Resubmit pending submissions.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: admin
     */
    async resubmitPendings(): Promise<void> {
        const [output, ofiles] = await this.root.execute("admin.tasks.resubmitPendings", null)
        return output
    }

    /**
     * Get full text search database status.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: admin
     */
    async getFullTextSearchDatabase(): Promise<Download> {
        const [output, ofiles] = await this.root.execute(
            "admin.tasks.getFullTextSearchDatabase",
            null
        )
        return ofiles[0]
    }

    /**
     * Update semantic search database.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: admin
     */
    async updateSemanticSearchDatabase(data: string, ifile: File): Promise<void> {
        const [output, ofiles] = await this.root.execute(
            "admin.tasks.updateSemanticSearchDatabase",
            data,
            [ifile]
        )
        return output
    }
}

/**
 *
 * No description yet
 *
 */
class Module_admin_stats {
    private readonly root: JutgeApiClient

    constructor(root: JutgeApiClient) {
        this.root = root
    }

    /**
     * Get counters.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: admin
     */
    async getCounters(): Promise<Record<string, number>> {
        const [output, ofiles] = await this.root.execute("admin.stats.getCounters", null)
        return output
    }

    /**
     * Get distribution of verdicts.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: admin
     */
    async getDistributionOfVerdicts(): Promise<Record<string, number>> {
        const [output, ofiles] = await this.root.execute(
            "admin.stats.getDistributionOfVerdicts",
            null
        )
        return output
    }

    /**
     * Get distribution of verdicts by year.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: admin
     */
    async getDistributionOfVerdictsByYear(): Promise<Record<string, number>[]> {
        const [output, ofiles] = await this.root.execute(
            "admin.stats.getDistributionOfVerdictsByYear",
            null
        )
        return output
    }

    /**
     * Get distribution of compilers.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: admin
     */
    async getDistributionOfCompilers(): Promise<Record<string, number>> {
        const [output, ofiles] = await this.root.execute(
            "admin.stats.getDistributionOfCompilers",
            null
        )
        return output
    }

    /**
     * Get distribution of proglangs.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: admin
     */
    async getDistributionOfProglangs(): Promise<Record<string, number>> {
        const [output, ofiles] = await this.root.execute(
            "admin.stats.getDistributionOfProglangs",
            null
        )
        return output
    }

    /**
     * Get distribution of registered users by year.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: admin
     */
    async getDistributionOfUsersByYear(): Promise<Record<string, number>> {
        const [output, ofiles] = await this.root.execute(
            "admin.stats.getDistributionOfUsersByYear",
            null
        )
        return output
    }

    /**
     * Get distribution of registered users by country.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: admin
     */
    async getDistributionOfUsersByCountry(): Promise<Record<string, number>> {
        const [output, ofiles] = await this.root.execute(
            "admin.stats.getDistributionOfUsersByCountry",
            null
        )
        return output
    }

    /**
     * Get distribution of registered users by submissions using a custom bucket size.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: admin
     */
    async getDistributionOfUsersBySubmissions(data: number): Promise<Record<string, number>> {
        const [output, ofiles] = await this.root.execute(
            "admin.stats.getDistributionOfUsersBySubmissions",
            data
        )
        return output
    }

    /**
     * Get ranking of users.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: admin
     * ‼️ Warning: Input type is not correct
     */
    async getRankingOfUsers(limit: number): Promise<UserRanking> {
        const [output, ofiles] = await this.root.execute("admin.stats.getRankingOfUsers", limit)
        return output
    }

    /**
     * Get distribution of submissions by hour.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: admin
     */
    async getDistributionOfSubmissionsByHour(): Promise<Record<string, number>> {
        const [output, ofiles] = await this.root.execute(
            "admin.stats.getDistributionOfSubmissionsByHour",
            null
        )
        return output
    }

    /**
     * Get distribution of submissions by proglang.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: admin
     */
    async getDistributionOfSubmissionsByProglang(): Promise<Record<string, number>> {
        const [output, ofiles] = await this.root.execute(
            "admin.stats.getDistributionOfSubmissionsByProglang",
            null
        )
        return output
    }

    /**
     * Get distribution of submissions by compiler.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: admin
     */
    async getDistributionOfSubmissionsByCompiler(): Promise<Record<string, number>> {
        const [output, ofiles] = await this.root.execute(
            "admin.stats.getDistributionOfSubmissionsByCompiler",
            null
        )
        return output
    }

    /**
     * Get distribution of submissions by weekday.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: admin
     */
    async getDistributionOfSubmissionsByWeekday(): Promise<Record<string, number>> {
        const [output, ofiles] = await this.root.execute(
            "admin.stats.getDistributionOfSubmissionsByWeekday",
            null
        )
        return output
    }

    /**
     * Get distribution of submissions by year.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: admin
     */
    async getDistributionOfSubmissionsByYear(): Promise<Record<string, number>> {
        const [output, ofiles] = await this.root.execute(
            "admin.stats.getDistributionOfSubmissionsByYear",
            null
        )
        return output
    }

    /**
     * Get distribution of submissions by year for a proglang.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: admin
     */
    async getDistributionOfSubmissionsByYearForProglang(
        proglang: string
    ): Promise<Record<string, number>> {
        const [output, ofiles] = await this.root.execute(
            "admin.stats.getDistributionOfSubmissionsByYearForProglang",
            proglang
        )
        return output
    }

    /**
     * Get distribution of submissions by day.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: admin
     */
    async getDistributionOfSubmissionsByDay(): Promise<Record<string, number>> {
        const [output, ofiles] = await this.root.execute(
            "admin.stats.getDistributionOfSubmissionsByDay",
            null
        )
        return output
    }

    /**
     * Get heatmap calendar of submissions.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: admin
     */
    async getHeatmapCalendarOfSubmissions(data: DateRange): Promise<any> {
        const [output, ofiles] = await this.root.execute(
            "admin.stats.getHeatmapCalendarOfSubmissions",
            data
        )
        return output
    }

    /**
     * Get distribution of domains of users' emails.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: admin
     */
    async getDistributionOfDomains(): Promise<Record<string, number>> {
        const [output, ofiles] = await this.root.execute(
            "admin.stats.getDistributionOfDomains",
            null
        )
        return output
    }
}

/**
 *
 * No description yet
 *
 */
class Module_admin_problems {
    private readonly root: JutgeApiClient

    constructor(root: JutgeApiClient) {
        this.root = root
    }

    /**
     * Get summary for a problem.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: admin
     */
    async getProblemSummary(problem_id: string): Promise<ProblemSummary | null> {
        const [output, ofiles] = await this.root.execute(
            "admin.problems.getProblemSummary",
            problem_id
        )
        return output
    }

    /**
     * Get list of problems with summary.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: admin
     */
    async getProblemsWithSummary(): Promise<string[]> {
        const [output, ofiles] = await this.root.execute(
            "admin.problems.getProblemsWithSummary",
            null
        )
        return output
    }

    /**
     * Get list of problems without summary.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: admin
     */
    async getProblemsWithoutSummary(): Promise<string[]> {
        const [output, ofiles] = await this.root.execute(
            "admin.problems.getProblemsWithoutSummary",
            null
        )
        return output
    }

    /**
     * Get solution tags for an abstract problem.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: admin
     */
    async getAbstractProblemSolutionTags(data: {
        problem_nm: string
    }): Promise<SolutionTags | null> {
        const [output, ofiles] = await this.root.execute(
            "admin.problems.getAbstractProblemSolutionTags",
            data
        )
        return output
    }

    /**
     * Get list of abstract problems with solution tags.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: admin
     */
    async getAbstractProblemsWithSolutionTags(): Promise<string[]> {
        const [output, ofiles] = await this.root.execute(
            "admin.problems.getAbstractProblemsWithSolutionTags",
            null
        )
        return output
    }

    /**
     * Get list of abstract problems without solution tags.
     *
     * 🗂️ Domains: jutge
     * 🔐 Authentication: admin
     */
    async getAbstractProblemsWithoutSolutionTags(): Promise<string[]> {
        const [output, ofiles] = await this.root.execute(
            "admin.problems.getAbstractProblemsWithoutSolutionTags",
            null
        )
        return output
    }
}
