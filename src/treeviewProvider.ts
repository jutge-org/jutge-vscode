import * as vscode from "vscode";

import {
  MyCoursesService,
  MyListsService,
  MyProblemsService,
  TCourseOut,
  TListOut,
} from "./client";

import { isUserAuthenticated } from "./jutgeAuth";
import { getDefaultProblemId } from "./utils";

export function registerTreeViewCommands(context: vscode.ExtensionContext) {
  const treeViewProvider = new TreeViewProvider();
  context.subscriptions.push(
    vscode.window.registerTreeDataProvider("jutgeTreeView", treeViewProvider)
  );
  context.subscriptions.push(
    vscode.commands.registerCommand("jutge-vscode.refreshTree", () => treeViewProvider.refresh())
  );
}

class JutgeTreeItem extends vscode.TreeItem {
  // API-related ID for the tree item (courseKey, listKey, or problemNm).
  public itemKey?: string;

  constructor(label: string, collapsibleState: vscode.TreeItemCollapsibleState) {
    super(label, collapsibleState);
  }
}

export class TreeViewProvider implements vscode.TreeDataProvider<JutgeTreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<JutgeTreeItem | undefined | null | void> =
    new vscode.EventEmitter<JutgeTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<JutgeTreeItem | undefined | null | void> =
    this._onDidChangeTreeData.event;

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  // Get TreeItem representation of the element (part of the TreeDataProvider interface).
  getTreeItem(element: JutgeTreeItem): JutgeTreeItem {
    return element;
  }

  /**
   * Get children of an element.
   * If an empty list is returned, a welcome view is shown.
   * viewsWelcome are defined in `package.json`.
   */
  async getChildren(element?: JutgeTreeItem): Promise<JutgeTreeItem[]> {
    if ((await isUserAuthenticated()) === false) {
      return [];
    }
    if (!element) {
      return this._getEnrolledCourseList();
    } else if (element.contextValue === "course") {
      return this._getListsFromCourseNm(element.itemKey as string);
    } else if (element.contextValue === "list") {
      return this._getProblemsFromListNm(element.itemKey as string);
    }
    return [];
  }

  private async _getEnrolledCourseList(): Promise<JutgeTreeItem[]> {
    try {
      const courses = (await MyCoursesService.getAllEnrolledCourses()) as {
        [key: string]: TCourseOut;
      };
      return Object.keys(courses).map((courseKey) => {
        const course = courses[courseKey];
        const courseItem = new JutgeTreeItem(
          course.course_nm,
          vscode.TreeItemCollapsibleState.Collapsed
        );
        courseItem.contextValue = "course";
        courseItem.itemKey = courseKey;
        return courseItem;
      });
    } catch (error) {
      console.error(error);
      vscode.window.showErrorMessage("Failed to get enrolled courses");
      return [];
    }
  }

  private async _getListsFromCourseNm(courseKey: string): Promise<JutgeTreeItem[]> {
    try {
      const course_info = await MyCoursesService.getEnrolledCourse({ courseKey });
      const lists = course_info.lists as { [key: string]: TListOut };
      return Object.keys(lists).map((listKey) => {
        const list = lists[listKey];
        const listItem = new JutgeTreeItem(list.list_nm, vscode.TreeItemCollapsibleState.Collapsed);
        listItem.contextValue = "list";
        listItem.itemKey = listKey;
        return listItem;
      });
    } catch (error) {
      console.error(error);
      vscode.window.showErrorMessage("Failed to get lists from course: " + courseKey);
      return [];
    }
  }

  private async _getProblemsFromListNm(listKey: string): Promise<JutgeTreeItem[]> {
    try {
      const list_info = await MyListsService.getList({ listKey });

      // Get data for each problem (concurrently)
      const promises = list_info.items.map(async (problem) => {
        const { problem_nm } = problem;
        if (problem_nm === null) {
          return new JutgeTreeItem(
            "Problem name unavailable",
            vscode.TreeItemCollapsibleState.None
          );
        }
        const problemItem = new JutgeTreeItem(problem_nm, vscode.TreeItemCollapsibleState.None);

        // Get the problem title
        const problem_id = getDefaultProblemId(problem_nm);
        const { title } = await MyProblemsService.getProblem({
          problemNm: problem_nm,
          problemId: problem_id,
        });

        // TODO: Maybe we should set up a JutgeTreeItemBuilder class to make this easier.
        problemItem.contextValue = "problem";
        problemItem.itemKey = problem_nm;
        problemItem.label = title;
        problemItem.command = {
          command: "jutge-vscode.showProblem",
          title: "Open Problem",
          arguments: [problem.problem_nm],
        };
        return problemItem;
      });

      const problemItems = await Promise.allSettled(promises);

      // Accumulate fulfilled promises and log rejected ones
      const result: JutgeTreeItem[] = [];
      for (const pitem of problemItems) {
        if (pitem.status === "rejected") {
          console.error(pitem.reason);
        } else {
          result.push(pitem.value);
        }
      }

      return result;
      //
    } catch (error) {
      console.error(error);
      vscode.window.showErrorMessage("Failed to get problems from list: " + listKey);
      return [];
    }
  }
}
