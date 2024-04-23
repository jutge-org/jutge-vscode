/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type TTables = {
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
};

