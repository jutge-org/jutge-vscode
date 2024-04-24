/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Date } from "../models/Date";
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
import FormData = require("form-data");

export class MySubmissionsService {
  /**
   * Get all submissions
   * Flat array of submissions in chronological order.
   * @returns any
   * @throws ApiError
   */
  public static getAllSubmissions(): CancelablePromise<
    Array<{
      problem_id: string;
      submission_id: string;
      compiler_id: string;
      annotation: null | string;
      state: string;
      time_in: Date | string;
      veredict: null | string;
      veredict_info: null | string;
      veredict_publics: null | string;
      ok_publics_but_wrong: number;
    }>
  > {
    return __request(OpenAPI, {
      method: "GET",
      url: "/my/submissions",
    });
  }
  /**
   * Get all submissions for an abstract problem
   * Grouped by problem
   * @param problemNm
   * @returns any
   * @throws ApiError
   */
  public static getAllSubmissionsAbstractProblem(problemNm: string): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/my/submissions/{problem_nm}",
      path: {
        problem_nm: problemNm,
      },
    });
  }
  /**
   * Get all submissions for a problem
   * @param problemNm
   * @param problemId
   * @returns any
   * @throws ApiError
   */
  public static getAllSubmissionsProblem(
    problemNm: string,
    problemId: string
  ): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/my/submissions/{problem_nm}/{problem_id}",
      path: {
        problem_nm: problemNm,
        problem_id: problemId,
      },
    });
  }
  /**
   * Get a submission for a problem
   * @param problemNm
   * @param problemId
   * @param submissionId
   * @returns any
   * @throws ApiError
   */
  public static getSubmission(
    problemNm: string,
    problemId: string,
    submissionId: string
  ): CancelablePromise<{
    problem_id: string;
    submission_id: string;
    compiler_id: string;
    annotation: null | string;
    state: string;
    time_in: Date | string;
    veredict: null | string;
    veredict_info: null | string;
    veredict_publics: null | string;
    ok_publics_but_wrong: number;
  }> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/my/submissions/{problem_nm}/{problem_id}/{submission_id}",
      path: {
        problem_nm: problemNm,
        problem_id: problemId,
        submission_id: submissionId,
      },
    });
  }
  /**
   * Submit a solution to a problem
   *
   * ❗️In order to perform a submission, the request should have a `multipart/form-data` content type.
   *
   * HTTPie Example:
   *
   * ```
   * https --multipart -A bearer -a $TOKEN $ADDR/my/submissions/P68688/P68688_en/submit compiler_id=GCC annotation="My new shiny submission ✨" file@P68688.c
   * ```
   *
   * ❗️The submitted file should be a source file, not an executable file.
   *
   * @param problemNm
   * @param problemId
   * @param requestBody
   *  {
   *      compiler_id: string;
   *      annotation: string;
   *      file: any;
   *  }
   * @returns any
   * @throws ApiError
   */
  public static submit(
    problemNm: string,
    problemId: string,
    requestBody: FormData
  ): CancelablePromise<{
    submission_id: string;
  }> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/my/submissions/{problem_nm}/{problem_id}/submit",
      path: {
        problem_nm: problemNm,
        problem_id: problemId,
      },
      body: requestBody,
      mediaType: "multipart/form-data",
    });
  }
}
