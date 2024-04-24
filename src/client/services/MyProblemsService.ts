/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
export class MyProblemsService {
  /**
   * Get all abstract problems
   * Includes owner and problems
   * @returns any
   * @throws ApiError
   */
  public static getAllAbstractProblems(): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/my/problems",
    });
  }
  /**
   * Get an abstract problem
   * Includes owner and problems
   * @param problemNm
   * @returns any
   * @throws ApiError
   */
  public static getAbstractProblem(problemNm: string): CancelablePromise<{
    problem_nm: string;
    author: null | string;
    author_email: null | string;
    public: null | number;
    official: null | number;
    deprecation: null | string;
    owner: {
      email: string;
      name: string;
      username: null | string;
    };
    problems: Array<{
      problem_id: string;
      problem_nm: string;
      language_id: string;
      title: string;
      original_language_id: string;
      translator: null | string;
      translator_email: null | string;
      checked: null | number;
    }>;
  }> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/my/problems/{problem_nm}",
      path: {
        problem_nm: problemNm,
      },
    });
  }
  /**
   * Get extras of an abstract problem
   * Includes accepted compilers and accepted proglangs
   * @param problemNm
   * @returns any
   * @throws ApiError
   */
  public static getAbstractProblemExtras(problemNm: string): CancelablePromise<{
    compilers_with_ac: Array<string>;
    proglangs_with_ac: Array<string>;
  }> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/my/problems/{problem_nm}/extras",
      path: {
        problem_nm: problemNm,
      },
    });
  }
  /**
   * Get a problem
   * Includes abstract problem, which includes owner
   * @param problemNm
   * @param problemId
   * @returns any
   * @throws ApiError
   */
  public static getProblem(
    problemNm: string,
    problemId: string
  ): CancelablePromise<{
    problem_id: string;
    problem_nm: string;
    language_id: string;
    title: string;
    original_language_id: string;
    translator: null | string;
    translator_email: null | string;
    checked: null | number;
    abstract_problem: {
      problem_nm: string;
      author: null | string;
      author_email: null | string;
      public: null | number;
      official: null | number;
      deprecation: null | string;
      owner: {
        email: string;
        name: string;
        username: null | string;
      };
    };
  }> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/my/problems/{problem_nm}/{problem_id}",
      path: {
        problem_nm: problemNm,
        problem_id: problemId,
      },
    });
  }
  /**
   * Get sample testcases of a problem
   * @param problemNm
   * @param problemId
   * @returns any
   * @throws ApiError
   */
  public static getSampleTestcases(
    problemNm: string,
    problemId: string
  ): CancelablePromise<
    Array<{
      name: string;
      input_b64: string;
      correct_b64: string;
    }>
  > {
    return __request(OpenAPI, {
      method: "GET",
      url: "/my/problems/{problem_nm}/{problem_id}/testcases/sample",
      path: {
        problem_nm: problemNm,
        problem_id: problemId,
      },
    });
  }
  /**
   * Get public testcases of a problem
   * @param problemNm
   * @param problemId
   * @returns any
   * @throws ApiError
   */
  public static getPublicTestcases(
    problemNm: string,
    problemId: string
  ): CancelablePromise<
    Array<{
      name: string;
      input_b64: string;
      correct_b64: string;
    }>
  > {
    return __request(OpenAPI, {
      method: "GET",
      url: "/my/problems/{problem_nm}/{problem_id}/testcases/public",
      path: {
        problem_nm: problemNm,
        problem_id: problemId,
      },
    });
  }
  /**
   * Get extras of a problem
   * Includes accepted compilers, accepted proglangs and official solutions checks
   * @param problemNm
   * @param problemId
   * @returns any
   * @throws ApiError
   */
  public static getProblemExtras(
    problemNm: string,
    problemId: string
  ): CancelablePromise<{
    compilers_with_ac: Array<string>;
    proglangs_with_ac: Array<string>;
    official_solution_checks: Record<string, boolean>;
  }> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/my/problems/{problem_nm}/{problem_id}/extras",
      path: {
        problem_nm: problemNm,
        problem_id: problemId,
      },
    });
  }
  /**
   * Get Html statement of a problem
   * Currently, this is suboptimal, but I already know how to improve it.
   * @param problemNm
   * @param problemId
   * @returns any
   * @throws ApiError
   */
  public static getHtmlStatement(problemNm: string, problemId: string): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/my/problems/{problem_nm}/{problem_id}/html",
      path: {
        problem_nm: problemNm,
        problem_id: problemId,
      },
    });
  }
  /**
   * Get Text statement of a problem
   * Currently, this is suboptimal and returns the Html, but I already know how to improve it.
   * @param problemNm
   * @param problemId
   * @returns any
   * @throws ApiError
   */
  public static getTextStatement(problemNm: string, problemId: string): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/my/problems/{problem_nm}/{problem_id}/text",
      path: {
        problem_nm: problemNm,
        problem_id: problemId,
      },
    });
  }
  /**
   * Get Markdown statement of a problem
   * Currently, this is suboptimal and returns the Html, but I already know how to improve it.
   * @param problemNm
   * @param problemId
   * @returns any
   * @throws ApiError
   */
  public static getMdStatement(problemNm: string, problemId: string): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/my/problems/{problem_nm}/{problem_id}/md",
      path: {
        problem_nm: problemNm,
        problem_id: problemId,
      },
    });
  }
  /**
   * Get PDF statement of a problem
   * @param problemNm
   * @param problemId
   * @returns any
   * @throws ApiError
   */
  public static getPdfStatement(problemNm: string, problemId: string): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/my/problems/{problem_nm}/{problem_id}/pdf",
      path: {
        problem_nm: problemNm,
        problem_id: problemId,
      },
    });
  }
  /**
   * Get ZIP archive of a problem
   * @param problemNm
   * @param problemId
   * @returns any
   * @throws ApiError
   */
  public static getZipStatement(problemNm: string, problemId: string): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/my/problems/{problem_nm}/{problem_id}/zip",
      path: {
        problem_nm: problemNm,
        problem_id: problemId,
      },
    });
  }
}
