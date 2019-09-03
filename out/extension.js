"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_1 = require("vscode");
const fs_1 = require("fs");
const key_languages_provider_1 = require("./key-languages-provider");
const edit_panel_1 = require("./edit-panel");
const utils_1 = require("./utils");
// this method is called when the extension is activated ( the very first time the command is executed)
function activate(context) {
    const viewId = 'i18n-tooblox';
    let languagesFilesUrl;
    const config = {
        i18nFolder: '',
        searchI18nFile: true,
        defaultLanguage: ''
    };
    findFilesAndParseJson();
    context.subscriptions.push(vscode_1.commands.registerCommand('i18n_toolbox_addChild', (treeViewItem) => {
        addChildKey(treeViewItem).then(childJsonPath => {
            vscode_1.commands.executeCommand('i18n_toolbox_refresh');
            vscode_1.commands.executeCommand('i18n_toolbox_openLangKey', childJsonPath);
        });
    }), vscode_1.commands.registerCommand('i18n_toolbox_rename', (treeViewItem) => {
        renameKey(treeViewItem);
        vscode_1.commands.executeCommand('i18n_toolbox_refresh');
    }), vscode_1.commands.registerCommand('i18n_toolbox_openLangKey', (jsonPath) => {
        openPanelAndGetLangText(jsonPath);
    }), vscode_1.commands.registerCommand('i18n_toolbox_refresh_extension', () => {
        vscode_1.commands.executeCommand('i18n_toolbox_refresh');
    }), vscode_1.commands.registerCommand('i18n_toolbox_delete_key', (treeViewItem) => {
        deleteKey(treeViewItem);
        vscode_1.commands.executeCommand('i18n_toolbox_refresh');
    }));
    function findFilesAndParseJson() {
        setConfigFile().then(() => {
            let globPattern;
            if (config.searchI18nFile) {
                globPattern = new vscode_1.RelativePattern(vscode_1.workspace.rootPath || '', '**/*.i18n.json');
            }
            else {
                globPattern = new vscode_1.RelativePattern(config.i18nFolder || '', '**/*.json');
            }
            vscode_1.workspace.findFiles(globPattern).then(files => {
                languagesFilesUrl = files.map((file) => utils_1.convertFilePath(file.path));
                const keyLanguagesProvider = new key_languages_provider_1.KeyLanguagesProvider(languagesFilesUrl[0]);
                vscode_1.window.registerTreeDataProvider(`${viewId}`, keyLanguagesProvider);
                if (!config.defaultLanguage) {
                    config.defaultLanguage = getFileName(languagesFilesUrl[0]);
                }
                vscode_1.commands.registerCommand(`i18n_toolbox_refresh`, () => keyLanguagesProvider.refresh());
            });
        });
    }
    function openPanelAndGetLangText(jsonPath) {
        let langJson = languagesFilesUrl.map(fileUrl => {
            try {
                return {
                    lang: getFileName(fileUrl),
                    text: jsonPath.split('.').reduce((prev, curr) => (prev && prev[curr]) || '', JSON.parse(fs_1.readFileSync(fileUrl, 'utf-8'))),
                    jsonPath: jsonPath
                };
            }
            catch (e) {
                vscode_1.window.showErrorMessage('Cannot read the file ' + fileUrl);
                return {
                    lang: getFileName(fileUrl),
                    jsonPath: jsonPath,
                    text: ''
                };
            }
        });
        const panel = edit_panel_1.LangFormPanel.createOrShow(context.extensionPath, langJson);
        if (panel) {
            panel._panel.webview.onDidReceiveMessage(message => {
                editKeyValue(message);
            }, undefined, context.subscriptions);
        }
    }
    function setConfigFile() {
        return __awaiter(this, void 0, void 0, function* () {
            const globPattern = new vscode_1.RelativePattern(vscode_1.workspace.rootPath || '', 'i18n-toolbox.json');
            yield vscode_1.workspace.findFiles(globPattern).then(files => {
                if (files[0]) {
                    const userConfig = JSON.parse(fs_1.readFileSync(utils_1.convertFilePath(files[0].path), 'utf-8'));
                    console.log(utils_1.convertFilePath(files[0].path));
                    config.i18nFolder = `${vscode_1.workspace.rootPath}/${userConfig.i18nFolder}`;
                    config.searchI18nFile = userConfig.searchI18nFile;
                    config.defaultLanguage = userConfig.defaultLanguage;
                }
            });
        });
    }
    function addChildKey(treeViewItem) {
        return __awaiter(this, void 0, void 0, function* () {
            let jsonPath = treeViewItem ? (treeViewItem.jsonPath ? treeViewItem.jsonPath + '.' + treeViewItem.label : treeViewItem.label) : '';
            yield vscode_1.window.showInputBox().then(data => {
                if (data) {
                    const newKey = data.toUpperCase().replace(' ', '_');
                    editLangFiles((fileJson) => {
                        if (jsonPath) {
                            jsonPath.split('.').reduce((p, c, i, arr) => {
                                if (i === arr.length - 1) {
                                    if (p[c][newKey]) {
                                        vscode_1.window.showErrorMessage('This key already exists');
                                    }
                                    else {
                                        p[c][newKey] = '';
                                        jsonPath += '.' + newKey;
                                    }
                                }
                                return p[c];
                            }, fileJson);
                        }
                        else {
                            if (fileJson[newKey]) {
                                vscode_1.window.showErrorMessage('This key already exists');
                            }
                            else {
                                fileJson[newKey] = '';
                                jsonPath = newKey;
                            }
                        }
                        return fileJson;
                    });
                }
            });
            return jsonPath;
        });
    }
    function renameKey(treeViewItem) {
        const jsonPath = treeViewItem.jsonPath ? treeViewItem.jsonPath + '.' + treeViewItem.label : treeViewItem.label;
        vscode_1.window.showInputBox().then(data => {
            if (data) {
                const newKey = data.toUpperCase().replace(' ', '_');
                editLangFiles((fileJson) => {
                    jsonPath.split('.').reduce((p, c, i, arr) => {
                        if (i === arr.length - 1) {
                            p[newKey] = p[c];
                            delete p[c];
                        }
                        else {
                            p[c] = p[c] || {};
                        }
                        return p[c];
                    }, fileJson);
                    return fileJson;
                });
            }
        });
    }
    function deleteKey(treeViewItem) {
        const jsonPath = treeViewItem.jsonPath ? treeViewItem.jsonPath + '.' + treeViewItem.label : treeViewItem.label;
        editLangFiles((fileJson) => {
            jsonPath.split('.').reduce((p, c, i, arr) => {
                if (i === arr.length - 1) {
                    delete p[c];
                }
                else {
                    p[c] = p[c] || {};
                }
                return p[c];
            }, fileJson);
            return fileJson;
        });
    }
    function editKeyValue(messages) {
        messages.forEach(message => {
            const filePath = languagesFilesUrl.find(languagueFile => languagueFile.indexOf(message.lang + (config.searchI18nFile ? '.i18n' : '') + '.json') > 0);
            if (filePath) {
                const fileJson = JSON.parse(fs_1.readFileSync(filePath, 'utf-8'));
                message.jsonPath.split('.').reduce((p, c, i, arr) => {
                    if (i === arr.length - 1) {
                        if (message.text || message.lang === config.defaultLanguage) {
                            p[c] = message.text;
                        }
                        else {
                            delete p[c];
                        }
                    }
                    else {
                        p[c] = p[c] || {};
                    }
                    return p[c];
                }, fileJson);
                const sortFileJson = utils_1.sortObj(fileJson);
                fs_1.writeFileSync(filePath, JSON.stringify(sortFileJson, null, '    '), { encoding: 'utf-8' });
            }
        });
    }
    function editLangFiles(editMethod) {
        languagesFilesUrl.forEach(languagesFileUrl => {
            let fileJson = JSON.parse(fs_1.readFileSync(languagesFileUrl, 'utf-8'));
            fileJson = editMethod(fileJson);
            const sortFileJson = utils_1.sortObj(fileJson);
            fs_1.writeFileSync(languagesFileUrl, JSON.stringify(sortFileJson, null, '    '), { encoding: 'utf-8' });
        });
    }
    function getFileName(path) {
        const fileName = path.substring(path.lastIndexOf('/') + 1, path.lastIndexOf('.json'));
        return fileName.substring(0, fileName.indexOf('.i18n')) || fileName;
    }
}
exports.activate = activate;
// this method is called when your extension is deactivated
function deactivate() { }
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map