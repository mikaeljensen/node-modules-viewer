'use strict';

import * as vscode from 'vscode';

import { DepNodeProvider } from './node-modules-viewer'

import {inspect} from 'util'

export function activate(context: vscode.ExtensionContext) {
	const rootPath = vscode.workspace.rootPath;
	const config = vscode.workspace.getConfiguration('node-modules-viewer')

	const nodeDependenciesProvider = new DepNodeProvider(rootPath);

	vscode.window.registerTreeDataProvider('node-modules-viewer', nodeDependenciesProvider);
	vscode.commands.registerCommand('node-modules-viewer.refreshEntry', () => nodeDependenciesProvider.refresh());
	vscode.commands.registerCommand('node-modules-viewer.openPackageOnNpm', moduleName => nodeDependenciesProvider.openOnNPM(moduleName.label || moduleName));
	vscode.commands.registerCommand('node-modules-viewer.openFileInEditor', Uri => nodeDependenciesProvider.openFileInEditor(Uri));

}
