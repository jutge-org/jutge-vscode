/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type TListOut = {
  list_nm: string;
  title: null | string;
  description: null | string;
  annotation: null | string;
  public: number;
  official: number;
  owner: {
    username: null | string;
  } & {
    email: string;
    name: string;
    username: null | string;
  };
  items: Array<{
    problem_nm: null | string;
    description: null | string;
  }>;
};
