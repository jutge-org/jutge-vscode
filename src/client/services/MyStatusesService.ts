/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class MyStatusesService {
    /**
     * Get statuses for all problems
     * @returns any
     * @throws ApiError
     */
    public static getAllStatuses(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/my/statuses',
        });
    }
    /**
     * Get status of an abstract problem
     * @param problemNm
     * @returns any
     * @throws ApiError
     */
    public static getStatusAbstractProblem(
        problemNm: string,
    ): CancelablePromise<{
        problem_nm: string;
        nb_submissions: number;
        nb_pending_submissions: number;
        nb_accepted_submissions: number;
        nb_rejected_submissions: number;
        nb_scored_submissions: number;
        status: string;
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/my/statuses/{problem_nm}',
            path: {
                'problem_nm': problemNm,
            },
        });
    }
    /**
     * Get status of a problem
     * @param problemNm
     * @param problemId
     * @returns any
     * @throws ApiError
     */
    public static getStatusProblem(
        problemNm: string,
        problemId: string,
    ): CancelablePromise<{
        problem_id: string;
        problem_nm: string;
        nb_submissions: number;
        nb_pending_submissions: number;
        nb_accepted_submissions: number;
        nb_rejected_submissions: number;
        nb_scored_submissions: number;
        status: string;
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/my/statuses/{problem_nm}/{problem_id}',
            path: {
                'problem_nm': problemNm,
                'problem_id': problemId,
            },
        });
    }
}
