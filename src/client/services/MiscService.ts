/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
export class MiscService {
  /**
   * Get server time
   * @returns any
   * @throws ApiError
   */
  public static getTime(): CancelablePromise<{
    full_time: string;
    int_timestamp: number;
    float_timestamp: number;
    time: string;
    date: string;
  }> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/misc/time",
    });
  }
  /**
   * Get homepage statistics
   * @returns any
   * @throws ApiError
   */
  public static getHomepageStatistics(): CancelablePromise<{
    users: number;
    problems: number;
    submissions: number;
  }> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/misc/homepage-statistics",
    });
  }
  /**
   * Get a fortune quote
   * @returns any
   * @throws ApiError
   */
  public static getFortune(): CancelablePromise<{
    message: string;
  }> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/misc/fortune",
    });
  }
}
