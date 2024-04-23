/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Body_Request_authentication_token__form_interface_ } from '../models/Body_Request_authentication_token__form_interface_';
import type { CredentialsIn } from '../models/CredentialsIn';
import type { CredentialsOut } from '../models/CredentialsOut';
import type { Success } from '../models/Success';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class AuthService {
    /**
     * Request Authentication Token (Form Interface)
     * **Request an authentication token to be used in authenticated routes (form interface).**
     *
     * Httpie example:
     *
     * ```bash
     * https --form https://api.jutge.org/auth/login username=user@example.com password=mysecret
     * ```
     *
     * Under [`/docs`](/docs) you can also get the token clicking on the lock sign.
     *
     * You can set the returned token to an environment variable with `jq`:
     *
     * ```bash
     * export TOKEN=$(https --form https://api.jutge.org/auth/login username=user@example.com password=mysecret | jq -r .access_token)
     * echo $TOKEN
     * ```
     *
     * After getting the token, you should use Bearer Token authentication.
     *
     * Httpie example:
     *
     * ```bash
     * https -A bearer -a $TOKEN https://api.jutge.org/auth/check
     * ```
     *
     * The token will expire after some hours.
     *
     * Note: While API is in dev, only admins and allowed users can log in.
     * @param formData
     * @returns CredentialsOut Successful Response
     * @throws ApiError
     */
    public static requestAuthenticationTokenFormInterface(
        formData: Body_Request_authentication_token__form_interface_,
    ): CancelablePromise<CredentialsOut> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/auth/signin',
            formData: formData,
            mediaType: 'application/x-www-form-urlencoded',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Request Authentication Token (Json Interface)
     * **Request an authentication token to be used in authenticated routes (json interface).**
     *
     * Httpie example:
     *
     * ```bash
     * https https://api.jutge.org/auth/login username=user@example.com password=mysecret
     * ```
     *
     * Under [`/docs`](/docs) you can also get the token clicking on the lock sign.
     *
     * You can set the returned token to an environment variable with `jq`:
     *
     * ```bash
     * export TOKEN=$(https https://api.jutge.org/auth/login username=user@example.com password=mysecret | jq -r .access_token)
     * echo $TOKEN
     * ```
     *
     * After getting the token, you should use Bearer Token authentication.
     *
     * Httpie example:
     *
     * ```bash
     * https -A bearer -a $TOKEN https://api.jutge.org/auth/check
     * ```
     *
     * The token will expire after some hours.
     *
     * Note: While API is in dev, only admins and allowed users can log in.
     * @param requestBody
     * @returns CredentialsOut Successful Response
     * @throws ApiError
     */
    public static requestAuthenticationTokenJsonInterface(
        requestBody: CredentialsIn,
    ): CancelablePromise<CredentialsOut> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/auth/login',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Discard Authentication Token (Logout)
     * **Discard an authentication token.**
     *
     * Httpie example:
     *
     * ```bash
     * https -A bearer -a $TOKEN POST https://api.jutge.org/auth/logout
     * ```
     * @returns Success Successful Response
     * @throws ApiError
     */
    public static discardAuthenticationTokenLogout(): CancelablePromise<Success> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/auth/logout',
        });
    }
    /**
     * Check Authentication Token
     * Check authentication token
     * @returns Success Successful Response
     * @throws ApiError
     */
    public static checkAuthenticationToken(): CancelablePromise<Success> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/auth/check',
        });
    }
    /**
     * Purge Expired Authentication Tokens (To Be Called Once In A While)
     * Purge expired authentication tokens (to be called once in a while)
     * @returns Success Successful Response
     * @throws ApiError
     */
    public static purgeExpiredAuthenticationTokensToBeCalledOnceInAWhile(): CancelablePromise<Success> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/auth/purge',
        });
    }
}
