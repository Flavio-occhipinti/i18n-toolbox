"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_1 = require("vscode");
const fs_1 = require("fs");
const key_languages_item_1 = require("./key-languages-item");
class KeyLanguagesProvider {
    constructor(filePath) {
        this.filePath = filePath;
        this._onDidChangeTreeData = new vscode_1.EventEmitter();
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
            vscode_1.window.showInformationMessage('No dependency in empty workspace');
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
                vscode_1.window.showInformationMessage('Workspace has no file');
                return Promise.resolve([]);
            }
        }
    }
    getKeyInLangFile(filePath, jsonPath) {
        if (this.pathExists(filePath)) {
            //File lang
            let langJson = JSON.parse(fs_1.readFileSync(filePath, 'utf-8'));
            if (jsonPath) {
                langJson = jsonPath.split('.').reduce((p, c) => (p && p[c]) || null, langJson);
            }
            return Object.keys(langJson).map(key => {
                if (typeof langJson[key] === 'string') {
                    return new key_languages_item_1.KeyLanguagesItem(key, vscode_1.TreeItemCollapsibleState.None, jsonPath || "", {
                        command: 'i18n_toolbox_openLangKey',
                        title: 'Open Languages Key',
                        arguments: [jsonPath ? (jsonPath + "." + key) : key]
                    });
                }
                return new key_languages_item_1.KeyLanguagesItem(key, vscode_1.TreeItemCollapsibleState.Collapsed, jsonPath || "");
            });
        }
        return [];
    }
    pathExists(p) {
        try {
            fs_1.accessSync(p);
        }
        catch (err) {
            return false;
        }
        return true;
    }
}
exports.KeyLanguagesProvider = KeyLanguagesProvider;
//# sourceMappingURL=key-languages-provider.js.map