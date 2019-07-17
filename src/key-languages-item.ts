import { TreeItemCollapsibleState, TreeItem, Command } from "vscode";

export class KeyLanguagesItem extends TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: TreeItemCollapsibleState,
        public readonly jsonPath: string,
        public readonly command?: Command
    ) {
        super(label, collapsibleState);
        this.contextValue = collapsibleState === TreeItemCollapsibleState.None ? 'text' : 'folder';
    }

    getJsonPathAccess() {
        if (this.jsonPath) {
            return this.jsonPath + '.' + this.label;
        }
        return this.label;
    }
}
