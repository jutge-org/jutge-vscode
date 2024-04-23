/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class TablesService {
    /**
     * Get all tables
     * Get all compilers, countries, drivers, languages, proglangs, and verdicts in a single request. This data does not change often, so you should only request it once per session.
     * @returns any
     * @throws ApiError
     */
    public static getAllTables(): CancelablePromise<{
        languages: Record<string, {
            language_id: string;
            eng_name: string;
            own_name: string;
        }>;
        countries: Record<string, {
            country_id: string;
            eng_name: string;
        }>;
        compilers: Record<string, {
            compiler_id: string;
            name: string;
            language: string;
            extension: string;
            description: (null | string);
            version: (null | string);
            flags1: (null | string);
            flags2: (null | string);
            type: (null | string);
            warning: (null | string);
            status: (null | string);
            notes: (null | string);
        }>;
        drivers: Record<string, {
            driver_id: string;
        }>;
        verdicts: Record<string, {
            verdict_id: string;
            name: string;
            description: string;
        }>;
        proglangs: Array<string>;
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/tables/',
        });
    }
    /**
     * Get all languages
     * @returns any
     * @throws ApiError
     */
    public static getAllLanguages(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/tables/languages',
        });
    }
    /**
     * Get a language
     * @param languageId
     * @returns any
     * @throws ApiError
     */
    public static getLanguage(
        languageId: string,
    ): CancelablePromise<{
        language_id: string;
        eng_name: string;
        own_name: string;
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/tables/languages/{language_id}',
            path: {
                'language_id': languageId,
            },
        });
    }
    /**
     * Get all countries
     * @returns any
     * @throws ApiError
     */
    public static getAllCountries(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/tables/countries',
        });
    }
    /**
     * Get a country
     * @param countryId
     * @returns any
     * @throws ApiError
     */
    public static getCountry(
        countryId: string,
    ): CancelablePromise<{
        country_id: string;
        eng_name: string;
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/tables/countries/{country_id}',
            path: {
                'country_id': countryId,
            },
        });
    }
    /**
     * Get all compilers
     * @returns any
     * @throws ApiError
     */
    public static getAllCompilers(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/tables/compilers',
        });
    }
    /**
     * Get a compiler
     * @param compilerId
     * @returns any
     * @throws ApiError
     */
    public static getCompiler(
        compilerId: string,
    ): CancelablePromise<{
        compiler_id: string;
        name: string;
        language: string;
        extension: string;
        description: (null | string);
        version: (null | string);
        flags1: (null | string);
        flags2: (null | string);
        type: (null | string);
        warning: (null | string);
        status: (null | string);
        notes: (null | string);
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/tables/compilers/{compiler_id}',
            path: {
                'compiler_id': compilerId,
            },
        });
    }
    /**
     * Get all drivers
     * @returns any
     * @throws ApiError
     */
    public static getAllDrivers(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/tables/drivers',
        });
    }
    /**
     * Get a driver
     * @param driverId
     * @returns any
     * @throws ApiError
     */
    public static getDriver(
        driverId: string,
    ): CancelablePromise<{
        driver_id: string;
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/tables/drivers/{driver_id}',
            path: {
                'driver_id': driverId,
            },
        });
    }
    /**
     * Get all verdicts
     * @returns any
     * @throws ApiError
     */
    public static getAllVerdicts(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/tables/verdicts',
        });
    }
    /**
     * Get a verdict
     * @param verdictId
     * @returns any
     * @throws ApiError
     */
    public static getVerdict(
        verdictId: string,
    ): CancelablePromise<{
        verdict_id: string;
        name: string;
        description: string;
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/tables/verdicts/{verdict_id}',
            path: {
                'verdict_id': verdictId,
            },
        });
    }
    /**
     * Get all proglangs
     * @returns string
     * @throws ApiError
     */
    public static getAllProglangs(): CancelablePromise<Array<string>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/tables/proglangs',
        });
    }
}
