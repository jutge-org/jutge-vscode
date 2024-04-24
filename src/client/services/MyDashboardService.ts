/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
export class MyDashboardService {
  /**
   * Get my dashboard
   * @returns any
   * @throws ApiError
   */
  public static getDashboard(): CancelablePromise<{
    statistics: Record<string, any>;
    heatmap: Array<{
      date: number;
      value: number;
    }>;
    distributions: {
      verdicts: Record<string, any>;
      compilers: Record<string, any>;
      proglangs: Record<string, any>;
      submissions_by_hour: Record<string, any>;
      submissions_by_weekday: Record<string, any>;
    };
  }> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/my/dashboard",
    });
  }
  /**
   * Get my dashboard statistics
   * @returns any
   * @throws ApiError
   */
  public static getStatistics(): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/my/dashboard/statistics",
    });
  }
  /**
   * Get my heatmap calendar of submissions
   * Data is provided as required by https://cal-heatmap.com
   * @returns any
   * @throws ApiError
   */
  public static getHeatmapCalendar(): CancelablePromise<
    Array<{
      date: number;
      value: number;
    }>
  > {
    return __request(OpenAPI, {
      method: "GET",
      url: "/my/dashboard/heatmap-calendar",
    });
  }
  /**
   * Get all my distributions
   * @returns any
   * @throws ApiError
   */
  public static getAllDistributions(): CancelablePromise<{
    verdicts: Record<string, any>;
    compilers: Record<string, any>;
    proglangs: Record<string, any>;
    submissions_by_hour: Record<string, any>;
    submissions_by_weekday: Record<string, any>;
  }> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/my/dashboard/distributions",
    });
  }
  /**
   * Get my verdicts distribution
   * @returns any
   * @throws ApiError
   */
  public static getVerdictsDistribution(): CancelablePromise<Record<string, any>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/my/dashboard/distributions/verdicts",
    });
  }
  /**
   * Get my compilers distribution
   * @returns any
   * @throws ApiError
   */
  public static getCompilersDistribution(): CancelablePromise<Record<string, any>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/my/dashboard/distributions/compilers",
    });
  }
  /**
   * Get my programming languages distribution
   * @returns any
   * @throws ApiError
   */
  public static getProglangsDistribution(): CancelablePromise<Record<string, any>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/my/dashboard/distributions/proglangs",
    });
  }
  /**
   * Get my submissions by hour distribution
   * @returns any
   * @throws ApiError
   */
  public static getSubmissionsByHour(): CancelablePromise<Record<string, any>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/my/dashboard/distributions/submissions-by-hour",
    });
  }
  /**
   * Get my submissions by weekday distribution
   * @returns any
   * @throws ApiError
   */
  public static getSubmissionsByWeekDay(): CancelablePromise<Record<string, any>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/my/dashboard/distributions/submissions-by-weekday",
    });
  }
}
