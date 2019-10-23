import { commands, ExtensionContext, window, workspace, GlobPattern, RelativePattern, Uri } from 'vscode';
import { readFileSync, writeFileSync } from 'fs';
import { KeyLanguagesProvider } from './key-languages-provider';
import Config from './models/config';
import { LangFormPanel } from './edit-panel';
import { LanguageText } from './models/language-text';
import { sortObj, convertFilePath, isPlainObject } from './utils';
import { KeyLanguagesItem } from './key-languages-item';
import { FileJSON } from './models/file-json';

// this method is called when the extension is activated ( the very first time the command is executed)
export function activate(context: ExtensionContext) {
    const viewId = 'i18n-tooblox';
    let languagesFilesUrl: string[];
    const config: Config = {
        i18nFolder: '',
        searchI18nFile: true,
        defaultLanguage: '',
        writeMissingKey: false
    };
    findFilesAndParseJson();
    context.subscriptions.push(
        commands.registerCommand('i18n_toolbox_addChild', (treeViewItem: KeyLanguagesItem) => {
            addChildKey(treeViewItem).then(childJsonPath => {
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
            workspace.findFiles(globPattern).then(files => {
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
        let langJson: LanguageText[] = languagesFilesUrl.map(fileUrl => {
            try {
                return {
                    lang: getFileName(fileUrl),
                    text: jsonPath.split('.').reduce((prev, curr) => (prev && prev[curr]) || '', JSON.parse(readFileSync(fileUrl, 'utf-8'))),
                    jsonPath: jsonPath
                };
            } catch (e) {
                window.showErrorMessage('Cannot read the file ' + fileUrl);
                return {
                    lang: getFileName(fileUrl),
                    jsonPath: jsonPath,
                    text: ''
                };
            }
        });
        const panel = LangFormPanel.createOrShow(context.extensionPath, langJson);
        if (panel) {
            panel._panel.webview.onDidReceiveMessage(
                message => {
                    editKeyValue(message);
                },
                undefined,
                context.subscriptions
            );
        }
    }
    async function setConfigFile() {
        const globPattern: GlobPattern = new RelativePattern(workspace.rootPath || '', 'i18n-toolbox.json');
        await workspace.findFiles(globPattern).then(files => {
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
        await window.showInputBox().then(data => {
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
        window.showInputBox().then(data => {
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
        messages.forEach(message => {
            const filePath = languagesFilesUrl.find(languagueFile => isLangFile(languagueFile, message.lang));
            if (filePath) {
                const fileJson = JSON.parse(readFileSync(filePath, 'utf-8'));
                message.jsonPath.split('.').reduce((p, c, i, arr) => {
                    if (i === arr.length - 1) {
                        if (message.text || message.lang === config.defaultLanguage) {
                            p[c] = message.text;
                        } else {
                            delete p[c];
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
        languagesFilesUrl.forEach(languagesFileUrl => {
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
        let defaultLangJson = JSON.parse(readFileSync(languagesFilesUrl.find(fileUrl => isLangFile(fileUrl, config.defaultLanguage)) as string, 'utf-8'));

        languagesFilesUrl.forEach(fileUrl => {
            if (!isLangFile(fileUrl, config.defaultLanguage)) {
                let fileJson: FileJSON = JSON.parse(readFileSync(fileUrl, 'utf-8'));
                writeFileSync(fileUrl, JSON.stringify(unifyObj(defaultLangJson, fileJson), null, '    '), { encoding: 'utf-8' });
            }
        });
    }
    function unifyObj(defaultLangJson: FileJSON, jsonToUnify: FileJSON) {
        let sortedObj: any = {};
        if (isPlainObject(defaultLangJson)) {
            Object.keys(defaultLangJson)
                .sort()
                .forEach(key => {
                    if (jsonToUnify[key] || config.writeMissingKey) {
                        sortedObj[key] = unifyObj(defaultLangJson[key] as FileJSON, jsonToUnify[key] as FileJSON);
                    }
                });
        } else {
            sortedObj = jsonToUnify || '';
        }
        return sortedObj;
    }

    function isLangFile(fileUrl: string, lang: string) {
        return fileUrl.indexOf(lang + (config.searchI18nFile ? '.i18n' : '') + '.json') !== -1;
    }
}
// this method is called when your extension is deactivated
export function deactivate() {}
