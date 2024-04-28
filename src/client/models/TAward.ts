/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Date } from "./Date";
export type TAward = {
  award_id: string;
  time: Date | string;
  type: string;
  icon: string;
  title: string;
  info: string;
  youtube: null | string;
  submission: null | {
    problem_id: string;
    submission_id: string;
    compiler_id: string;
    annotation: null | string;
    state: string;
    time_in: Date | string;
    veredict: null | string;
    veredict_info: null | string;
    veredict_publics: null | string;
    ok_publics_but_wrong: number;
  };
};
