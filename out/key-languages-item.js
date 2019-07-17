"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_1 = require("vscode");
class KeyLanguagesItem extends vscode_1.TreeItem {
    constructor(label, collapsibleState, jsonPath, command) {
        super(label, collapsibleState);
        this.label = label;
        this.collapsibleState = collapsibleState;
        this.jsonPath = jsonPath;
        this.command = command;
        this.contextValue = collapsibleState === vscode_1.TreeItemCollapsibleState.None ? 'text' : 'folder';
    }
    getJsonPathAccess() {
        if (this.jsonPath) {
            return this.jsonPath + '.' + this.label;
        }
        return this.label;
    }
}
exports.KeyLanguagesItem = KeyLanguagesItem;
//# sourceMappingURL=key-languages-item.js.map