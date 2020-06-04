import { readFileSync, writeFileSync } from 'fs';
import { commands, ExtensionContext, GlobPattern, Position, Range, RelativePattern, Uri, window, workspace } from 'vscode';
import { LangFormPanel } from './edit-panel';
import { KeyLanguagesItem } from './key-languages-item';
import { KeyLanguagesProvider } from './key-languages-provider';
import Config from './models/config';
import { FileJSON } from './models/file-json';
import { KeysLangs } from './models/keys-lang';
import { LanguageText } from './models/language-text';
import { convertFilePath, isPlainObject, sortObj } from './utils';

// this method is called when the extension is activated ( the very first time the command is executed)
export function activate(context: ExtensionContext) {
    const viewId = 'i18n-tooblox';
    let languagesFilesUrl: string[];
    const config: Config = {
        i18nFolder: '',
        searchI18nFile: true,
        defaultLanguage: '',
        writeMissingKey: false,
    };
    findFilesAndParseJson();
    context.subscriptions.push(
        commands.registerCommand('i18n_toolbox_addChild', (treeViewItem: KeyLanguagesItem) => {
            addChildKey(treeViewItem).then((childJsonPath) => {
                commands.executeCommand('i18n_toolbox_refresh');
                commands.executeCommand('i18n_toolbox_openLangKey', childJsonPath);
            });
        }),
        commands.registerCommand('i18n_toolbox_rename', (treeViewItem: KeyLanguagesItem) => {
            renameKey(treeViewItem);
            commands.executeCommand('i18n_toolbox_refresh');
        }),
        commands.registerCommand('i18n_toolbox_openLangKey', (jsonPath: string) => {
            openPanelAndGetLangText(jsonPath);
        }),
        commands.registerCommand('i18n_toolbox_refresh_extension', () => {
            commands.executeCommand('i18n_toolbox_refresh');
        }),
        commands.registerCommand('i18n_toolbox_delete_key', (treeViewItem: KeyLanguagesItem) => {
            deleteKey(treeViewItem);
            commands.executeCommand('i18n_toolbox_refresh');
        }),
        commands.registerCommand('i18n_toolbox_search_empty_key', () => {
            openPanelAndGetEmptyKeys();
        })
    );

    function findFilesAndParseJson() {
        setConfigFile().then(() => {
            let globPattern: GlobPattern;
            if (config.searchI18nFile) {
                globPattern = new RelativePattern(workspace.rootPath || '', '**/*.i18n.json');
            } else {
                globPattern = new RelativePattern(config.i18nFolder || '', '**/*.json');
            }
            workspace.findFiles(globPattern).then((files) => {
                languagesFilesUrl = files.map((file: Uri) => convertFilePath(file.path));
                const keyLanguagesProvider = new KeyLanguagesProvider(languagesFilesUrl[0]);
                window.registerTreeDataProvider(`${viewId}`, keyLanguagesProvider);

                if (!config.defaultLanguage) {
                    config.defaultLanguage = getFileName(languagesFilesUrl[0]);
                }

                commands.registerCommand(`i18n_toolbox_refresh`, () => {
                    cleanFiles();
                    keyLanguagesProvider.refresh();
                });
            });
        });
    }
    function openPanelAndGetLangText(jsonPath: string) {
        let langJson: LanguageText[] = languagesFilesUrl.map((fileUrl) => {
            try {
                return {
                    lang: getFileName(fileUrl),
                    text: jsonPath.split('.').reduce((prev, curr) => (prev && prev[curr]) || '', JSON.parse(readFileSync(fileUrl, 'utf-8'))),
                    jsonPath: jsonPath,
                };
            } catch (e) {
                window.showErrorMessage('Cannot read the file ' + fileUrl);
                return {
                    lang: getFileName(fileUrl),
                    jsonPath: jsonPath,
                    text: '',
                };
            }
        });
        const panel = LangFormPanel.createOrShow(context.extensionPath, langJson);
        panel && webviewListener(panel);
    }
    function openPanelAndGetEmptyKeys() {
        if (languagesFilesUrl) {
            const emptyKeys: KeysLangs = {};
            languagesFilesUrl.forEach((filePath) => {
                const fileJson = JSON.parse(readFileSync(filePath, 'utf-8'));
                const lang = getLangFile(filePath);
                emptyKeys[lang] = [];
                exploreJson(fileJson, (key: string, value: string, line: number, jsonPath: string) => {
                    if (!value) {
                        emptyKeys[lang].push({
                            key,
                            line,
                            jsonPath,
                        });
                    }
                });
            });

            const panel = LangFormPanel.createOrShow(context.extensionPath, undefined, emptyKeys);
            panel && webviewListener(panel);
        } else {
            window.showErrorMessage('Files not yet loaded');
        }
    }
    function webviewListener(panel: LangFormPanel) {
        panel._panel.webview.onDidReceiveMessage(
            (action: { command: 'openFile' | 'openEditValue' | 'editValue'; payload: any; lang: string; line: number; jsonPath: string }) => {
                switch (action.command) {
                    case 'openEditValue':
                        commands.executeCommand('i18n_toolbox_openLangKey', action.jsonPath);
                        break;
                    case 'openFile':
                        const path = getFullPathUrl(action.lang);
                        if (path) {
                            workspace.openTextDocument(path).then((doc) => {
                                window.showTextDocument(doc).then((file) => {
                                    file.revealRange(new Range(new Position(+action.line, 4), new Position(+action.line, 4)), 1);
                                });
                            });
                        } else {
                            window.showErrorMessage('File not found');
                        }
                        break;
                    case 'editValue':
                        editKeyValue(action.payload);
                        break;
                }
            },
            undefined,
            context.subscriptions
        );
    }
    async function setConfigFile() {
        const globPattern: GlobPattern = new RelativePattern(workspace.rootPath || '', 'i18n-toolbox.json');
        await workspace.findFiles(globPattern).then((files) => {
            if (files[0]) {
                const userConfig: Config = JSON.parse(readFileSync(convertFilePath(files[0].path), 'utf-8'));
                config.i18nFolder = `${workspace.rootPath}/${userConfig.i18nFolder}`;
                config.searchI18nFile = userConfig.searchI18nFile;
                config.defaultLanguage = userConfig.defaultLanguage;
                config.writeMissingKey = userConfig.writeMissingKey;
            }
        });
    }

    async function addChildKey(treeViewItem: KeyLanguagesItem) {
        let jsonPath = treeViewItem ? (treeViewItem.jsonPath ? treeViewItem.jsonPath + '.' + treeViewItem.label : treeViewItem.label) : '';
        await window.showInputBox().then((data) => {
            if (data) {
                const newKey = data.toUpperCase().replace(' ', '_');
                editLangFiles((fileJson: FileJSON) => {
                    if (jsonPath) {
                        jsonPath.split('.').reduce((p: FileJSON, c, i, arr) => {
                            if (i === arr.length - 1) {
                                if ((p[c] as FileJSON)[newKey]) {
                                    window.showErrorMessage('This key already exists');
                                } else {
                                    (p[c] as FileJSON)[newKey] = '';
                                    jsonPath += '.' + newKey;
                                }
                            }
                            return p[c] as FileJSON;
                        }, fileJson);
                    } else {
                        if (fileJson[newKey]) {
                            window.showErrorMessage('This key already exists');
                        } else {
                            fileJson[newKey] = '';
                            jsonPath = newKey;
                        }
                    }
                    return fileJson;
                });
            }
        });
        return jsonPath;
    }
    function renameKey(treeViewItem: KeyLanguagesItem) {
        const jsonPath = treeViewItem.jsonPath ? treeViewItem.jsonPath + '.' + treeViewItem.label : treeViewItem.label;
        window.showInputBox().then((data) => {
            if (data) {
                const newKey = data.toUpperCase().replace(' ', '_');
                editLangFiles((fileJson: FileJSON) => {
                    jsonPath.split('.').reduce((p: FileJSON, c, i, arr) => {
                        if (i === arr.length - 1) {
                            p[newKey] = p[c];
                            delete p[c];
                        } else {
                            p[c] = p[c] || {};
                        }
                        return p[c] as FileJSON;
                    }, fileJson);
                    return fileJson;
                });
            }
        });
    }
    function deleteKey(treeViewItem: KeyLanguagesItem) {
        const jsonPath = treeViewItem.jsonPath ? treeViewItem.jsonPath + '.' + treeViewItem.label : treeViewItem.label;
        editLangFiles((fileJson: FileJSON) => {
            jsonPath.split('.').reduce((p: FileJSON, c, i, arr) => {
                if (i === arr.length - 1) {
                    delete p[c];
                } else {
                    p[c] = p[c] || {};
                }
                return p[c] as FileJSON;
            }, fileJson);
            return fileJson;
        });
    }

    function editKeyValue(messages: LanguageText[]) {
        messages.forEach((message) => {
            const filePath = languagesFilesUrl.find((languagueFile) => isLangFile(languagueFile, message.lang));
            if (filePath) {
                const fileJson = JSON.parse(readFileSync(filePath, 'utf-8'));
                message.jsonPath.split('.').reduce((p, c, i, arr) => {
                    if (i === arr.length - 1) {
                        if (message.text || message.lang === config.defaultLanguage) {
                            p[c] = message.text;
                        } else {
                            if (config.writeMissingKey) {
                                p[c] = '';
                            } else {
                                delete p[c];
                            }
                        }
                    } else {
                        p[c] = p[c] || {};
                    }
                    return p[c];
                }, fileJson);
                const sortFileJson = sortObj(fileJson);
                writeFileSync(filePath, JSON.stringify(sortFileJson, null, '    '), { encoding: 'utf-8' });
            }
        });
    }
    function editLangFiles(editMethod: Function) {
        languagesFilesUrl.forEach((languagesFileUrl) => {
            let fileJson = JSON.parse(readFileSync(languagesFileUrl, 'utf-8'));
            fileJson = editMethod(fileJson);
            const sortFileJson = sortObj(fileJson);
            writeFileSync(languagesFileUrl, JSON.stringify(sortFileJson, null, '    '), { encoding: 'utf-8' });
        });
    }
    function getFileName(path: string) {
        const fileName = path.substring(path.lastIndexOf('/') + 1, path.lastIndexOf('.json'));
        return fileName.substring(0, fileName.indexOf('.i18n')) || fileName;
    }
    function cleanFiles() {
        const defaultLangFilePath = languagesFilesUrl.find((fileUrl) => isLangFile(fileUrl, config.defaultLanguage)) as string;
        let defaultLangJson = JSON.parse(readFileSync(defaultLangFilePath, 'utf-8'));

        writeFileSync(defaultLangFilePath, JSON.stringify(sortObj(defaultLangJson), null, '    '), { encoding: 'utf-8' });

        languagesFilesUrl.forEach((fileUrl) => {
            if (!isLangFile(fileUrl, config.defaultLanguage)) {
                let fileJson: FileJSON = JSON.parse(readFileSync(fileUrl, 'utf-8'));
                writeFileSync(fileUrl, JSON.stringify(unifyObj(defaultLangJson, fileJson), null, '    '), { encoding: 'utf-8' });
            }
        });
    }
    function exploreJson(json: FileJSON, keyValueFunc: Function, lineNumber?: number, key?: string, jsonPath?: string) {
        let line = lineNumber || 1;
        if (isPlainObject(json)) {
            Object.keys(json)
                .sort()
                .forEach((key, index) => {
                    line++;
                    line = exploreJson(json[key] as FileJSON, keyValueFunc, line, key, (jsonPath ? jsonPath + '.' : '') + key);
                });
            line++;
        } else {
            keyValueFunc(key, json, line, jsonPath);
        }
        return line;
    }
    function unifyObj(defaultLangJson: FileJSON, jsonToUnify: FileJSON) {
        let sortedObj: any = {};
        if (isPlainObject(defaultLangJson)) {
            Object.keys(defaultLangJson)
                .sort()
                .forEach((key) => {
                    if (jsonToUnify[key] || config.writeMissingKey) {
                        let fileToUnify = jsonToUnify[key];
                        if (!fileToUnify && config.writeMissingKey && isPlainObject(defaultLangJson[key])) {
                            fileToUnify = {};
                        }
                        sortedObj[key] = unifyObj(defaultLangJson[key] as FileJSON, fileToUnify as FileJSON);
                    }
                });
        } else {
            sortedObj = jsonToUnify || '';
        }
        return sortedObj;
    }

    function getFullPathUrl(lang: string) {
        return languagesFilesUrl.find((fileUrl) => fileUrl.indexOf(lang + (config.searchI18nFile ? '.i18n' : '') + '.json') !== -1);
    }
    function isLangFile(fileUrl: string, lang: string) {
        return fileUrl.indexOf(lang + (config.searchI18nFile ? '.i18n' : '') + '.json') !== -1;
    }
    function getLangFile(fileUrl: string) {
        return fileUrl.substring(fileUrl.lastIndexOf('/') + 1, fileUrl.lastIndexOf((config.searchI18nFile ? '.i18n' : '') + '.json'));
    }
}
// this method is called when your extension is deactivated
export function deactivate() {}
