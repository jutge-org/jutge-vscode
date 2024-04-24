import * as vscode from 'vscode';

import { MyCoursesService, MyListsService } from './client';

import { isUserAuthenticated } from './jutgeAuth';
import { WebviewPanelHandler } from './webviewProvider';
import { getExtensionContext } from './extension';


export function registerTreeViewCommands(context: vscode.ExtensionContext) {
	const treeViewProvider = new TreeViewProvider();
	context.subscriptions.push(vscode.window.registerTreeDataProvider('jutgeTreeView', treeViewProvider));
	context.subscriptions.push(vscode.commands.registerCommand('jutge-vscode.refreshTree', () => treeViewProvider.refresh()));
}

class JutgeTreeItem extends vscode.TreeItem {
	public itemKey?: string // Object-dependent key related to API calls.
}

export class TreeViewProvider implements vscode.TreeDataProvider<JutgeTreeItem> {
	private _onDidChangeTreeData: vscode.EventEmitter<JutgeTreeItem | undefined | null | void> = new vscode.EventEmitter<JutgeTreeItem | undefined | null | void>();
	readonly onDidChangeTreeData: vscode.Event<JutgeTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

	refresh(): void {
		this._onDidChangeTreeData.fire();
	}

	getTreeItem(element: JutgeTreeItem): JutgeTreeItem {
		return element;
	}

	async getChildren(element?: JutgeTreeItem): Promise<JutgeTreeItem[]> {
		if (await isUserAuthenticated() === false) {
			return Promise.resolve([]);
		}
		if (!element) {
			return this._getEnrolledCourseList();
		} else if (element.contextValue === 'course') {
			return this._getListsFromCourseNm(element.itemKey as string);
		} else if (element.contextValue === 'list') {
			return this._getProblemsFromListNm(element.itemKey as string);
		}
		return Promise.resolve([]);
	}

	private async _getEnrolledCourseList(): Promise<JutgeTreeItem[]> {
		const courses = await MyCoursesService.getAllEnrolledCourses();
		console.log(courses);
		return Object.keys(courses).map(courseKey => {
			const course = courses[courseKey];
			const courseItem = new JutgeTreeItem(course.course_nm, vscode.TreeItemCollapsibleState.Collapsed);
			courseItem.contextValue = 'course';
			courseItem.itemKey = courseKey;
			return courseItem;
		});
	}

	private async _getListsFromCourseNm(courseKey: string): Promise<JutgeTreeItem[]> {
		const course_info = await MyCoursesService.getEnrolledCourse(courseKey);
		const lists = course_info.lists;
		return Object.keys(lists).map(listKey => {
			const list = lists[listKey];
			const listItem = new JutgeTreeItem(list.list_nm, vscode.TreeItemCollapsibleState.Collapsed);
			listItem.contextValue = 'list';
			listItem.itemKey = listKey;
			return listItem;
		});
	}

	private async _getProblemsFromListNm(listKey: string): Promise<JutgeTreeItem[]> {
		const list_info = await MyListsService.getList(listKey);
		const problems = list_info.items;
		return problems.map(problem => {
			if (problem.problem_nm === null) {
				return new JutgeTreeItem('No problems found', vscode.TreeItemCollapsibleState.None);
			}
			const problemItem = new JutgeTreeItem(problem.problem_nm, vscode.TreeItemCollapsibleState.None);
			problemItem.contextValue = 'problem';
			problemItem.itemKey = problem.problem_nm;
			problemItem.command = {
				command: 'jutge-vscode.showProblem',
				title: 'Open Problem',
				arguments: [problem.problem_nm]
			};
			return problemItem;
		});
	}
}
