import { commands, ExtensionContext, window, workspace, GlobPattern, RelativePattern, Uri } from 'vscode';
import { readFileSync, writeFileSync } from 'fs';
import { KeyLanguagesProvider } from './key-languages-provider';
import Config from './models/config';
import { LangFormPanel } from './edit-panel';
import { LanguageText } from './models/language-text';
import { sortObj, convertFilePath } from './utils';
import { KeyLanguagesItem } from './key-languages-item';


// this method is called when the extension is activated ( the very first time the command is executed)
export function activate(context: ExtensionContext) {
    const viewId = 'i18n-tooblox';
    let languagesFilesUrl: string[];
    const config: Config = {
        i18nFolder: '',
        searchI18nFile: true,
        defaultLanguage: ''
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
        translatorWebView(),
        commands.registerCommand('i18n_toolbox_refresh_extension', () => {
            commands.executeCommand('i18n_toolbox_refresh');
        })
       
    );
   

    function translatorWebView() {
        return commands.registerCommand('i18n_toolbox_openLangKey', (jsonPath: string) => {
            openPanelAndGetLangText(jsonPath);
        });
    }

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
                commands.registerCommand(`i18n_toolbox_refresh`, () => keyLanguagesProvider.refresh());
            });
        });
    }
    function openPanelAndGetLangText(jsonPath: string) {
        let langJson: LanguageText[] = languagesFilesUrl.map(fileUrl => ({
            lang: fileUrl.substring(fileUrl.lastIndexOf('/') + 1, fileUrl.lastIndexOf('.i18n.')),
            text: jsonPath.split('.').reduce((prev, curr) => (prev && prev[curr]) || '', JSON.parse(readFileSync(fileUrl, 'utf-8'))),
            jsonPath: jsonPath
        }));
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
            }
        });
    }

    async function addChildKey(treeViewItem: KeyLanguagesItem) {
        let jsonPath = treeViewItem.jsonPath ? treeViewItem.jsonPath + '.' + treeViewItem.label : treeViewItem.label;
        await window.showInputBox().then(data => {
            if (data) {
                const newKey = data.toUpperCase().replace(' ', '_');
                languagesFilesUrl.forEach(languagesFileUrl => {
                    const fileJson = JSON.parse(readFileSync(languagesFileUrl, 'utf-8'));
                    jsonPath.split('.').reduce((p, c, i, arr) => {
                        if (i === arr.length - 1) {
                            p[c][newKey] = '';
                        }
                        return p[c];
                    }, fileJson);
                    const sortFileJson = sortObj(fileJson);
                    writeFileSync(languagesFileUrl, JSON.stringify(sortFileJson, null, '    '), { encoding: 'utf-8' });
                });
                jsonPath += '.' + newKey;
            }
        });
        return jsonPath;
    }
    function renameKey(treeViewItem: KeyLanguagesItem) {
        const jsonPath = treeViewItem.jsonPath ? treeViewItem.jsonPath + '.' + treeViewItem.label : treeViewItem.label;
        window.showInputBox().then(data => {
            if (data) {
                languagesFilesUrl.forEach(languagesFileUrl => {
                    const fileJson = JSON.parse(readFileSync(languagesFileUrl, 'utf-8'));
                    jsonPath.split('.').reduce((p, c, i, arr) => {
                        if (i === arr.length - 1) {
                            p[data.toUpperCase().replace(' ', '_')] = p[c];
                            delete p[c];
                        } else {
                            p[c] = p[c] || {};
                        }
                        return p[c];
                    }, fileJson);
                    const sortFileJson = sortObj(fileJson);
                    writeFileSync(languagesFileUrl, JSON.stringify(sortFileJson, null, '    '), { encoding: 'utf-8' });
                });
            }
        });
    }
    function editKeyValue(messages: LanguageText[]) {
        messages.forEach(message => {
            const filePath = languagesFilesUrl.find(languagueFile => languagueFile.indexOf(message.lang + '.i18n.json') > 0);
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
}
// this method is called when your extension is deactivated
export function deactivate() {
}
