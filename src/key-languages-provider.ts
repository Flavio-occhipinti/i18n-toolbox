import {TreeDataProvider, TreeItemCollapsibleState, EventEmitter, Event, TreeItem, window} from 'vscode';
import { accessSync, readFileSync } from 'fs';
import { KeyLanguagesItem } from './key-languages-item';

export class KeyLanguagesProvider implements TreeDataProvider<KeyLanguagesItem> {
    private _onDidChangeTreeData: EventEmitter<KeyLanguagesItem | undefined> = new EventEmitter<KeyLanguagesItem | undefined>();
    readonly onDidChangeTreeData: Event<KeyLanguagesItem | undefined> = this._onDidChangeTreeData.event;

    constructor(private filePath: string) {}

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: KeyLanguagesItem): TreeItem {
        return element;
    }

    getChildren(element?: KeyLanguagesItem): Thenable<KeyLanguagesItem[]> {
        if (!this.filePath) {
            window.showInformationMessage('No dependency in empty workspace');
            return Promise.resolve([]);
        }


        if (element) {
            return Promise.resolve(this.getKeyInLangFile(this.filePath, element.getJsonPathAccess()));
        } else {
            if (this.pathExists(this.filePath)) {
                return Promise.resolve(this.getKeyInLangFile(this.filePath));
            } else {
                window.showInformationMessage('Workspace has no file');
                return Promise.resolve([]);
            }
        }
    }
    private getKeyInLangFile(filePath: string, jsonPath?: string): KeyLanguagesItem[] {
        if (this.pathExists(filePath)) {
            //File lang
            let langJson = JSON.parse(readFileSync(filePath, 'utf-8'));
            if (jsonPath) {
                langJson = jsonPath.split('.').reduce((p, c) => (p && p[c]) || null, langJson);
            }
            return Object.keys(langJson).map(key => {
                if (typeof langJson[key] === 'string') {
                    return new KeyLanguagesItem(key, TreeItemCollapsibleState.None, jsonPath || "", {
						command: 'i18n_toolbox_openLangKey',
						title: 'Open Languages Key',
						arguments: [jsonPath ? (jsonPath + "." + key) : key]
					});
                }

                return new KeyLanguagesItem(key, TreeItemCollapsibleState.Collapsed, jsonPath || "");
			});
        }
        return [];
    }

    private pathExists(p: string): boolean {
        try {
            accessSync(p);
        } catch (err) {
            return false;
        }
        return true;
    }
}
