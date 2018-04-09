# node_modules Dependency Viewer
No more endless scrolling through the node_modules folder to find the package you wanna look into

- Show nested view of project node_modules and treestructure of child dependencies
- Normal and dev dependency seperation
- Direct access to module folder/file if available in root node_modules
- Rightclick a dependency to open on npmjs.org
- Fast and effecient overview of direct project dependencies and subdependencies
- Based of the vscode-extension-samples/tree-view-sample
  - Slimmed down to just include the needed (just the Node dependencies view)
  - Rename the package to prevent possible namespace collision 
  - Added some TreeItem classes to accomodate for files, folders and seperators 
  - All media resources kindly borrowed from source project (files follow the icon theme of the workspace)

## Planned updates

- Configuration options to modify behaviour
- Parse more information from the package.json of the modules
- More fun stuff to do in the context menu
- Implement normal file contex menu if possible (when I figure out how)
- Anyone and everyone are welcome to give suggestions or contribute to the development

- Maybe
  - Directly install new dependencies
  - Remove dependencies
  - Get the reload thingy to work (not sure it is needed)

## Special thanks
To Microsoft for an awesome IDE and the very useful code examples

ref: https://github.com/Microsoft/vscode-extension-samples/tree/master/tree-view-sample

## Running the example from source

- Open this example in VS Code Insiders
- `npm install`
- `npm run compile`
- `F5` to start debugging
