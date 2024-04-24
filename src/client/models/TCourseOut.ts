/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type TCourseOut = {
  course_nm: string;
  title: null | string;
  description: null | string;
  annotation: null | string;
  public: number;
  official: number;
  owner: {
    email: string;
    name: string;
    username: null | string;
  };
  lists: Record<
    string,
    {
      list_nm: string;
      title: null | string;
      description: null | string;
      annotation: null | string;
      public: number;
      official: number;
      owner: {
        username: null | string;
      };
    }
  >;
};
