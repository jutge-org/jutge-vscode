/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { StatisticsHomeOut } from '../models/StatisticsHomeOut';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class StatisticsService {
    /**
     * Get Home Page Statistics
     * @returns StatisticsHomeOut Successful Response
     * @throws ApiError
     */
    public static getHomePageStatistics(): CancelablePromise<StatisticsHomeOut> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/statistics/home',
        });
    }
}
