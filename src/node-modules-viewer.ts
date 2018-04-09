import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import {inspect} from 'util'; 

export class DepNodeProvider implements vscode.TreeDataProvider < DependencyTreeItem > {

	private _onDidChangeTreeData: vscode.EventEmitter < DependencyTreeItem | undefined > = new vscode.EventEmitter < DependencyTreeItem | undefined > ();
	readonly onDidChangeTreeData: vscode.Event < DependencyTreeItem | undefined > = this._onDidChangeTreeData.event;



	constructor(private workspaceRoot: string) {}

	refresh(): void {
		this._onDidChangeTreeData.fire();
	}

	openLink(URL): void {
		URL = vscode.Uri.parse(URL)
		vscode.commands.executeCommand('vscode.open', URL);
	}

	openOnNPM(moduleName): void {
		let URL = vscode.Uri.parse(`https://www.npmjs.com/package/${moduleName}`)
		this.openLink(URL)
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

	getChildren(element ? : any): Thenable < DependencyTreeItem[] > {
		if (!this.workspaceRoot) {
			vscode.window.showInformationMessage('No dependency in empty workspace');
			return Promise.resolve([]);
		}

		if (!element) {
			const packageJsonPath = path.join(this.workspaceRoot, 'package.json');
			if (this.pathExists(packageJsonPath)) {
				return Promise.resolve(this.ParsePackageJson(packageJsonPath));
			} else {
				vscode.window.showInformationMessage('Workspace has no package.json');
				return Promise.resolve([]);
			}
		}

		if (element.type == 'folder') {
			return new Promise(resolve => {
				// TODO Not sure the right way to handle this error without setting input to type any
				let return_array = []
				let tmp_array = []
				fs.readdirSync(element.folderPath).forEach(folderElement => {
					let elementPath = path.join(element.folderPath, folderElement)
					if (fs.statSync(elementPath).isDirectory()) {
						return_array.push(new PackageTreeFolder(elementPath, folderElement))
					} else {
						tmp_array.push(new PackageTreeFile(vscode.Uri.file(elementPath)))
					}
				})
				resolve(return_array.concat(tmp_array))
			})
		}

		if (element.type == 'dependency') {
			return new Promise(resolve => {
				let folderElement: (DependencyTreeItem | PackageTreeFolder | Dependency)[]
				folderElement = [new PackageTreeFolder(path.join(this.workspaceRoot, 'node_modules', element.label), "Browse module folder")]
				resolve(folderElement.concat(this.ParsePackageJson(path.join(this.workspaceRoot, 'node_modules', element.label, 'package.json'))));
			});
		}

		vscode.window.showInformationMessage('This should not happen, something wrong with ', inspect(element));
		Promise.resolve([]);

	}


	/**
	 * Given the path to package.json, read all its dependencies and devDependencies.
	 */
	private ParsePackageJson(packageJsonPath: string): DependencyTreeItem[] {
		if (this.pathExists(packageJsonPath)) {
			const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

			const toDep = (moduleName: string, version: string): Dependency => {
				const folderPath = path.join(this.workspaceRoot, 'node_modules', moduleName)
				if (this.pathExists(folderPath)) {
					return new Dependency(moduleName, version, vscode.TreeItemCollapsibleState.Collapsed);
				} else {
					return new Dependency(moduleName, version, vscode.TreeItemCollapsibleState.None);
				}
			}

			const dep = packageJson.dependencies ?
				Object.keys(packageJson.dependencies).map(dep => toDep(dep, packageJson.dependencies[dep])) : [new Seperator('--- No Dependencies ---')];
			const devdep = packageJson.devDependencies ? [new Seperator('--- Dev Dependencies ---')].concat(Object.keys(packageJson.devDependencies).map(dep => toDep(dep, packageJson.devDependencies[dep]))) : [new Seperator('--- No Dev Dependencies ---')];
			return [].concat(dep).concat(devdep);
		} else {
			return [];
		}
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
	) {
		super(label, vscode.TreeItemCollapsibleState.Collapsed);
	}

	get tooltip(): string {
		return `${this.folderPath}`
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
		public readonly command ? : vscode.Command
	) {
		super(label, collapsibleState);
	}

	get tooltip(): string {
		return `${this.label}-${this.version}`
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