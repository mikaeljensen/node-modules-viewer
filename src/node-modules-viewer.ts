import * as vscode from 'vscode';
import * as fs from 'fs-extra';
import * as path from 'path';
import {inspect} from 'util';
import * as findUp from 'find-up';
import {PackageJson} from '@npm/types'

export class DepNodeProvider implements vscode.TreeDataProvider < vscode.TreeItem > {

	private _onDidChangeTreeData: vscode.EventEmitter < DependencyTreeItem | undefined > = new vscode.EventEmitter < DependencyTreeItem | undefined > ();
	readonly onDidChangeTreeData: vscode.Event < DependencyTreeItem | undefined > = this._onDidChangeTreeData.event;

	// private _npmConf?: typeof import('@lerna/npm-conf');
	private _npmConf?: any;

	constructor(private workspaceRoot: string) {}

	get npmConf() {
		if (!this._npmConf) {
			const npmConf = require('@lerna/npm-conf');
			this._npmConf = npmConf();
		}
		return this._npmConf;
	}

	refresh(): void {
		this._onDidChangeTreeData.fire();
	}

	openLink(u: string): void {
		const uri = vscode.Uri.parse(u)
		vscode.commands.executeCommand('vscode.open', uri);
	}

	openOnNPM(moduleName: string): void {
		const scope = moduleName.split('/', 1)[0];
		const registryHtmlPrefix = this.npmConf.get((scope ? `${scope}:` : '') + 'registry-html-prefix') || 'https://www.npmjs.com/package/';
		this.openLink(`${registryHtmlPrefix}${moduleName}`);
	}

	openFileInEditor(Uri: vscode.Uri) {
		try {
			vscode.workspace.openTextDocument(Uri).then(doc => {
				console.log("opened")
				vscode.window.showTextDocument(doc, ).then(editor => {
					console.log("show")
				})
			})
		} catch (e) {
			console.error("error", e)
		}
	}

	getTreeItem(element: DependencyTreeItem): vscode.TreeItem {
		return element;
	}

	getChildren(element?: PackageTreeFolder | Dependency): Thenable < vscode.TreeItem[] > {
		if (!this.workspaceRoot) {
			vscode.window.showInformationMessage('No dependency in empty workspace');
			return Promise.resolve([]);
		}

		if (!element) {
			const packageJsonPath = path.join(this.workspaceRoot, 'package.json');
			if (this.pathExists(packageJsonPath)) {
				return this.ParsePackageJson(packageJsonPath).then(({items}) => items);
			} else {
				vscode.window.showInformationMessage('Workspace has no package.json');
				return Promise.resolve([]);
			}
		}

		if (element.type == 'folder') {
			return fs.readdir(element.folderPath)
			.then((elements) => Promise.all(elements.map((folderElement) => {
				let elementPath = path.join(element.folderPath, folderElement)
				return fs.stat(elementPath).then((stats) =>
					stats.isDirectory()
						? new PackageTreeFolder(elementPath, folderElement)
						: new PackageTreeFile(vscode.Uri.file(elementPath), folderElement)
				)
			})))
			.then((elements) =>
				elements.sort((a, b) => {
					if (a.type === b.type) {
						return a.label.localeCompare(b.label)
					}
					return a.type === 'folder' ? -1 : 1
				})
			)
		}

		if (element.type == 'dependency') {
			const folderPath = element.folderPath || path.join(this.workspaceRoot, 'node_modules', element.label)
			return this.ParsePackageJson(path.join(folderPath, 'package.json'), element.parents)
			.then(({pkg, items}) => [
				new PackageTreeFolder(
					folderPath,
					`Browse folder @ ${pkg.version}`,
					this.workspaceRoot
				),
				...items
			]);
		}

		vscode.window.showInformationMessage('This should not happen, something wrong with ', inspect(element));
		Promise.resolve([]);
	}


	/**
	 * Given the path to package.json, read all its dependencies and devDependencies.
	 */
	private ParsePackageJson(packageJsonPath: string, parents: ReadonlyArray<string> = []): Promise<{pkg: PackageJson, items: DependencyTreeItem[]}> {
		return fs.readJson(packageJsonPath)
		.catch(() => ({pkg: {}, items: []}))
		.then((pkg: PackageJson) => {
			const pkgFolderPath = path.dirname(packageJsonPath);
			if (parents.indexOf(pkgFolderPath) >= 0) return {pkg, items: []};

			const childParents = parents.concat(pkgFolderPath)
			const toDep = (moduleName: string, version: string): Dependency => {
				const folderPath = findUp.sync(`node_modules/${moduleName}`, {cwd: this.workspaceRoot, type: 'directory'})
				if (folderPath && !(parents.indexOf(folderPath) >= 0)) {
					return new Dependency(moduleName, version, vscode.TreeItemCollapsibleState.Collapsed, undefined, folderPath, childParents);
				} else {
					return new Dependency(moduleName, version, vscode.TreeItemCollapsibleState.None);
				}
			}

			const dep = pkg.dependencies ?
				Object.keys(pkg.dependencies).map(dep => toDep(dep, pkg.dependencies[dep])) : [new Seperator('--- No Dependencies ---')];
			const devdep = pkg.devDependencies ? [
				new Seperator('--- Dev Dependencies ---')
			].concat(
				Object.keys(pkg.devDependencies)
				.map(dep => toDep(dep, pkg.devDependencies[dep]))
			) : [new Seperator('--- No Dev Dependencies ---')];
			return {pkg, items: [].concat(dep).concat(devdep)};
		})
	}


	private pathExists(p: string): boolean {
		try {
			fs.accessSync(p);
		} catch (err) {
			return false;
		}

		return true;
	}
}


class DependencyTreeItem extends vscode.TreeItem {

	public type = "unassigned"

	constructor(
		public readonly label: string, 
		public readonly collapsibleState: vscode.TreeItemCollapsibleState,
		public readonly folderPath?: string
	) {
		super(label, collapsibleState);
	}

	get tooltip(): string {
		return `This Super should not be shown`
	}

	get contextValue(): string {
		return this.type
	}

	set contextValue(value: string) {
		this.type = value
	}

}

class PackageTreeFolder extends DependencyTreeItem {

	public readonly type = "folder"

	constructor(
		public readonly folderPath: string,
		public readonly label: string,
		public readonly workspaceRoot?: string
	) {
		super(label, vscode.TreeItemCollapsibleState.Collapsed);
	}

	get tooltip(): string {
		return this.workspaceRoot ? path.relative(this.workspaceRoot, this.folderPath) : this.folderPath
	}

	iconPath = {
		light: path.join(__filename, '..', '..', '..', 'resources', 'light', 'folder.svg'),
		dark: path.join(__filename, '..', '..', '..', 'resources', 'dark', 'folder.svg')
	};

}

class PackageTreeFile extends vscode.TreeItem {

	public readonly type = "file"
	public readonly command ? : vscode.Command

	constructor(
		public readonly resourceUri: vscode.Uri,
		public readonly label: string
	) {
		super(resourceUri);
		this.command = {
			command: 'node-modules-viewer.openFileInEditor',
			title: 'Open File in Editor',
			arguments: [resourceUri]
		}
	}
}
class Dependency extends DependencyTreeItem {

	public readonly type = "dependency"

	constructor(
		public readonly label: string,
		public readonly version: string,
		public readonly collapsibleState: vscode.TreeItemCollapsibleState,
		public readonly command ? : vscode.Command,
		public readonly folderPath?: string,
		public readonly parents: ReadonlyArray<string> = []
	) {
		super(label, collapsibleState, folderPath);
	}

	get tooltip(): string {
		return `${this.label}@${this.version}`
	}


	iconPath = {
		light: path.join(__filename, '..', '..', '..', 'resources', 'light', 'dependency.svg'),
		dark: path.join(__filename, '..', '..', '..', 'resources', 'dark', 'dependency.svg')
	};
}
class Seperator extends DependencyTreeItem {

	constructor(
		public readonly label: string
	) {
		super(label, vscode.TreeItemCollapsibleState.None);
		this.type = "seperator"
	}


	get tooltip(): string {
		return `It is just a seperator, nothing to see here`
	}

}
