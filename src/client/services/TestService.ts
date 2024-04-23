/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class TestService {
    /**
     * Ping to get a Pong
     * @returns any
     * @throws ApiError
     */
    public static ping(): CancelablePromise<{
        message: string;
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/test/ping',
        });
    }
    /**
     * Get string in uppercase
     * @param str
     * @returns any
     * @throws ApiError
     */
    public static upper(
        str: string,
    ): CancelablePromise<{
        message: string;
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/test/upper',
            query: {
                'str': str,
            },
        });
    }
    /**
     * Do not try
     * @returns any
     * @throws ApiError
     */
    public static doNotTry(): CancelablePromise<{
        message: string;
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/test/do-not-try',
        });
    }
}
