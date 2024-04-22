/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Date } from '../models/Date';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class AuthenticationService {
    /**
     * Login: Get an access token
     *
     *
     * **Request an authentication token to be used in authenticated routes (json interface).**
     *
     * Httpie example:
     *
     * ```bash
     * export ADDR="https://api.jutge.org"
     * ```
     *
     * ```bash
     * https $ADDR/authentication/login email=user@example.com password=mysecret
     * ```
     *
     * Under [`/documentation`](/documentation) you can also get the token clicking on the lock sign.
     *
     * You can set the returned token to an environment variable with `jq`:
     *
     * ```bash
     * export TOKEN=$(https $ADDR/authentication/login email=user@example.com password=mysecret | jq -r .token)
     * echo $TOKEN
     * ```
     *
     * After getting the token, you should use Bearer Token authentication.
     *
     * Httpie example:
     *
     * ```bash
     * https -A bearer -a $TOKEN $ADDR/authentication/check
     * ```
     *
     * The token will expire after some hours.
     *
     * Note: While API is in dev, only admins and allowed users can log in.
     *
     * @param requestBody
     * @returns any
     * @throws ApiError
     */
    public static login(
        requestBody?: {
            email: string;
            password: string;
        },
    ): CancelablePromise<{
        token: string;
        expiration: (Date | string);
        user_uid: string;
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/authentication/login',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Login: Get an access token
     *
     *
     * **Request an authentication token to be used in authenticated routes (form interface).**
     *
     * Httpie example:
     *
     * ```bash
     * export ADDR="https://api.jutge.org"
     * ```
     *
     * ```bash
     * https --form $ADDR/authentication/login-oauth2 username=user@example.com password=mysecret
     * ```
     *
     * Under [`/documentation`](/documentation) you can also get the token clicking on the lock sign.
     *
     * You can set the returned token to an environment variable with `jq`:
     *
     * ```bash
     * export TOKEN=$(https --form $ADDR/authentication/login-oauth2 username=user@example.com password=mysecret | jq -r .token)
     * echo $TOKEN
     * ```
     *
     * After getting the token, you should use Bearer Token authentication.
     *
     * Httpie example:
     *
     * ```bash
     * https -A bearer -a $TOKEN $ADDR/authentication/check
     * ```
     *
     * The token will expire after some hours.
     *
     * Note: While API is in dev, only admins and allowed users can log in.
     *
     * Note: This is meant for the OAuth2 password flow. Scalar interface does not seem to accept it, but Swagger does.
     *
     * @param requestBody
     * @returns any
     * @throws ApiError
     */
    public static loginOAuth2(
        requestBody?: {
            username: string;
            password: string;
            grant_type?: string;
        },
    ): CancelablePromise<{
        access_token: string;
        token_type: string;
        expiration: (Date | string);
        user_uid: string;
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/authentication/login-oauth2',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Logout: Discard access token
     *
     * **Discard an authentication token.**
     *
     * Httpie example:
     *
     * ```bash
     * export ADDR="https://api.jutge.org"
     * ```
     *
     * ```bash
     * https -A bearer -a $TOKEN POST $ADDR/authentication/logout
     * ```
     *
     * @returns any
     * @throws ApiError
     */
    public static logout(): CancelablePromise<{
        success: boolean;
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/authentication/logout',
        });
    }
    /**
     * Check for valid access token
     *
     * **Check an authentication token.**
     *
     * Httpie example:
     *
     * ```bash
     * export ADDR="https://api.jutge.org"
     * ```
     *
     * ```bash
     * https -A bearer -a $TOKEN POST $ADDR/authentication/check
     * ```
     *
     * @returns any
     * @throws ApiError
     */
    public static check(): CancelablePromise<{
        success: boolean;
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/authentication/check',
        });
    }
}
