/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
export class MyCoursesService {
  /**
   * Get all available and enrolled courses
   * @returns any
   * @throws ApiError
   */
  public static getAllCourses(): CancelablePromise<{
    enrolled: Record<
      string,
      {
        course_nm: string;
        title: null | string;
        description: null | string;
        annotation: null | string;
        public: number;
        official: number;
      }
    >;
    available: Record<
      string,
      {
        course_nm: string;
        title: null | string;
        description: null | string;
        annotation: null | string;
        public: number;
        official: number;
      }
    >;
  }> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/my/courses",
    });
  }
  /**
   * Get all available courses
   * @returns any
   * @throws ApiError
   */
  public static getAllAvailableCourses(): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/my/courses/available",
    });
  }
  /**
   * Get an available course
   * Includes owner and lists.
   * @param courseKey
   * @returns any
   * @throws ApiError
   */
  public static getAvailableCourse(courseKey: string): CancelablePromise<{
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
  }> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/my/courses/available/{course_key}",
      path: {
        course_key: courseKey,
      },
    });
  }
  /**
   * Enroll in an available course
   * @param courseKey
   * @returns any
   * @throws ApiError
   */
  public static enrollCourse(courseKey: string): CancelablePromise<{
    success: boolean;
  }> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/my/courses/available/{course_key}/enroll",
      path: {
        course_key: courseKey,
      },
    });
  }
  /**
   * Get all enrolled courses
   * @returns any
   * @throws ApiError
   */
  public static getAllEnrolledCourses(): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/my/courses/enrolled",
    });
  }
  /**
   * Get an enrolled course
   * Includes owner, lists.
   * @param courseKey
   * @returns any
   * @throws ApiError
   */
  public static getEnrolledCourse(courseKey: string): CancelablePromise<{
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
  }> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/my/courses/enrolled/{course_key}",
      path: {
        course_key: courseKey,
      },
    });
  }
  /**
   * Unenroll from an enrolled course
   * @param courseKey
   * @returns any
   * @throws ApiError
   */
  public static unenrollCourse(courseKey: string): CancelablePromise<{
    success: boolean;
  }> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/my/courses/enrolled/{course_key}/unenroll",
      path: {
        course_key: courseKey,
      },
    });
  }
}
