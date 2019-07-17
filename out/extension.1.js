"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require("vscode");
const KeyLanguagesProvider_1 = require("./KeyLanguagesProvider");
// import { JsonOutlineProvider } from './jsonOutline';
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
function activate(context) {
    const viewId = 'translator';
    let translateFolderPath;
    let languagesFiles;
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "i18n" is now active!');
    vscode.commands.registerCommand('extension.openLangKey', (fielPath, jsonPath) => {
        //vscode.commands.executeCommand('vscode.open', vscode.Uri.parse(`https://www.npmjs.com/package/${moduleName}`)));
        // let editor = vscode.window.activeTextEditor;
        // if (editor) {
        //     let document = editor.document;
        //     let selection = editor.selection;
        //     // Get the word within the selection
        //     let word = document.getText(selection);
        //     console.log(document, selection, word);
        //     console.log(editor)
        // }
        vscode.window.createWebviewPanel('ts', 'Languages files', vscode.ViewColumn.Three);
    });
    // The command has been defined in the package.json file
    // Now provide the implementation of the command with registerCommand
    // The commandId parameter must match the command field in package.json
    let disposable = vscode.commands.registerCommand('extension.helloWorld', () => {
        // The code you place here will be executed every time your command is executed
        // Display a message box to the user
        // Samples of `window.registerTreeDataProvider`
        const options = {
            canSelectMany: false,
            canSelectFolders: true,
            openLabel: 'Open'
        };
        vscode.window.showOpenDialog(options).then(fileUri => {
            if (fileUri && fileUri[0]) {
                let folderPath = fileUri[0].path;
                const workspaceName = vscode.workspace.name || '';
                translateFolderPath = folderPath.substring(folderPath.indexOf(workspaceName) + workspaceName.length + 1);
                vscode.workspace.findFiles((translateFolderPath + '/*')).then(files => {
                    languagesFiles = files.map((file) => file.path.substring(1));
                    const keyLanguagesProvider = new KeyLanguagesProvider_1.KeyLanguagesProvider(languagesFiles[0]);
                    vscode.window.registerTreeDataProvider(`${viewId}`, keyLanguagesProvider);
                    vscode.commands.registerCommand(`keyLanguage.refreshEntry`, () => keyLanguagesProvider.refresh());
                    vscode.commands.registerCommand(`keyLanguage.addEntry`, () => vscode.window.showInformationMessage(`Successfully called add entry.`));
                    vscode.commands.registerCommand(`keyLanguage.editEntry`, (node) => vscode.window.showInformationMessage(`Successfully called edit entry on ${node.label}.`));
                    vscode.commands.registerCommand(`keyLanguage.deleteEntry`, (node) => vscode.window.showInformationMessage(`Successfully called delete entry on ${node.label}.`));
                    // Samples of `window.createView`
                    // new FtpExplorer(context);
                    // new FileExplorer(context)
                });
            }
        });
        // const jsonOutlineProvider = new JsonOutlineProvider(context);
        // vscode.window.registerTreeDataProvider('jsonOutline', jsonOutlineProvider);
        // vscode.commands.registerCommand('jsonOutline.refresh', () => jsonOutlineProvider.refresh());
        // vscode.commands.registerCommand('jsonOutline.refreshNode', offset => jsonOutlineProvider.refresh(offset));
        // vscode.commands.registerCommand('jsonOutline.renameNode', offset => jsonOutlineProvider.rename(offset));
        // vscode.commands.registerCommand('extension.openJsonSelection', range => jsonOutlineProvider.select(range));
        //vscode.commands.executeCommand(`onView:$\{${viewId}\}`);
        vscode.window.showInformationMessage('Hello World!');
    });
    context.subscriptions.push(disposable);
}
exports.activate = activate;
// this method is called when your extension is deactivated
function deactivate() { }
exports.deactivate = deactivate;
//# sourceMappingURL=extension.1.js.map