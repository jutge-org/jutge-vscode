/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class MyListsService {
    /**
     * Get all allowed lists
     * @returns any
     * @throws ApiError
     */
    public static getAllLists(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/my/lists',
        });
    }
    /**
     * Get an enrolled list
     * Includes items, owner.
     * @param listKey
     * @returns any
     * @throws ApiError
     */
    public static getList(
        listKey: string,
    ): CancelablePromise<{
        list_nm: string;
        title: (null | string);
        description: (null | string);
        annotation: (null | string);
        public: number;
        official: number;
        owner: ({
            username: (null | string);
        } & {
            email: string;
            name: string;
            username: (null | string);
        });
        items: Array<{
            problem_nm: (null | string);
            description: (null | string);
        }>;
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/my/lists/{list_key}',
            path: {
                'list_key': listKey,
            },
        });
    }
}
