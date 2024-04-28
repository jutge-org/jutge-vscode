/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Date } from "../models/Date";
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
export class MyAwardsService {
  /**
   * Get my awards
   * @returns any
   * @throws ApiError
   */
  public static getAllAwards(): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/my/awards",
    });
  }
  /**
   * Get an award
   * @param awardId
   * @returns any
   * @throws ApiError
   */
  public static getAward(awardId: string): CancelablePromise<{
    award_id: string;
    time: Date | string;
    type: string;
    icon: string;
    title: string;
    info: string;
    youtube: null | string;
    submission: null | {
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
    };
  }> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/my/awards/{award_id}",
      path: {
        award_id: awardId,
      },
    });
  }
}
