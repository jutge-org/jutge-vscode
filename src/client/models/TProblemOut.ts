/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type TProblemOut = {
  problem_id: string;
  problem_nm: string;
  language_id: string;
  title: string;
  original_language_id: string;
  translator: null | string;
  translator_email: null | string;
  checked: null | number;
  abstract_problem: {
    problem_nm: string;
    author: null | string;
    author_email: null | string;
    public: null | number;
    official: null | number;
    deprecation: null | string;
    owner: {
      email: string;
      name: string;
      username: null | string;
    };
  };
};
