/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Time } from '../models/Time';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class RootService {
    /**
     * Root
     * @param accept
     * @returns any Successful Response
     * @throws ApiError
     */
    public static root(
        accept?: (string | null),
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/',
            headers: {
                'accept': accept,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Ping
     * @returns string Successful Response
     * @throws ApiError
     */
    public static ping(): CancelablePromise<string> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/ping',
        });
    }
    /**
     * Do Not Try
     * @returns string Successful Response
     * @throws ApiError
     */
    public static doNotTry(): CancelablePromise<string> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/do-not-try',
        });
    }
    /**
     * Get Time
     * @returns Time Successful Response
     * @throws ApiError
     */
    public static getTime(): CancelablePromise<Time> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/time',
        });
    }
}
