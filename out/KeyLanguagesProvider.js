"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
const fs = require("fs");
class KeyLanguagesProvider {
    constructor(filePath) {
        this.filePath = filePath;
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
    }
    refresh() {
        this._onDidChangeTreeData.fire();
    }
    getTreeItem(element) {
        return element;
    }
    getChildren(element) {
        if (!this.filePath) {
            vscode.window.showInformationMessage('No dependency in empty workspace');
            return Promise.resolve([]);
        }
        if (element) {
            return Promise.resolve(this.getKeyInLangFile(this.filePath, element.getJsonPathAccess()));
        }
        else {
            if (this.pathExists(this.filePath)) {
                return Promise.resolve(this.getKeyInLangFile(this.filePath));
            }
            else {
                vscode.window.showInformationMessage('Workspace has no file');
                return Promise.resolve([]);
            }
        }
    }
    getKeyInLangFile(filePath, jsonPath) {
        if (this.pathExists(filePath)) {
            //File lang
            let langJson = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
            if (jsonPath) {
                langJson = jsonPath.split('.').reduce((p, c) => (p && p[c]) || null, langJson);
            }
            return Object.keys(langJson).map(key => {
                if (typeof langJson[key] === 'string') {
                    return new Dependency(key, vscode.TreeItemCollapsibleState.None, jsonPath || "", {
                        command: 'extension.openLangKey',
                        title: 'open key',
                        arguments: [jsonPath + "." + key]
                    });
                }
                return new Dependency(key, vscode.TreeItemCollapsibleState.Collapsed, jsonPath || "");
            });
        }
        return [];
    }
    pathExists(p) {
        try {
            fs.accessSync(p);
        }
        catch (err) {
            return false;
        }
        return true;
    }
}
exports.KeyLanguagesProvider = KeyLanguagesProvider;
class Dependency extends vscode.TreeItem {
    constructor(label, collapsibleState, jsonPath, command) {
        super(label, collapsibleState);
        this.label = label;
        this.collapsibleState = collapsibleState;
        this.jsonPath = jsonPath;
        this.command = command;
        this.contextValue = collapsibleState === vscode.TreeItemCollapsibleState.None ? 'text' : 'folder';
    }
    getJsonPathAccess() {
        if (this.jsonPath) {
            return this.jsonPath + '.' + this.label;
        }
        return this.label;
    }
}
exports.Dependency = Dependency;
//# sourceMappingURL=KeyLanguagesProvider.js.map