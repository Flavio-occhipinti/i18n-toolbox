"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const vscode_1 = require("vscode");
class LangFormPanel {
    constructor(panel, extensionPath, langsText, keysLangs) {
        this._disposables = [];
        this._panel = panel;
        this._panel.title = 'i18n Toolbox';
        this._extensionPath = extensionPath;
        // Set the webview's initial html content
        this._update(langsText, keysLangs);
        // Listen for when the panel is disposed
        // This happens when the user closes the panel or when the panel is closed programatically
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
    }
    static createOrShow(extensionPath, langsText, keysLangs) {
        // If we already have a panel, show it.
        if (LangFormPanel.currentPanel) {
            LangFormPanel.currentPanel._update(langsText, keysLangs);
            LangFormPanel.currentPanel._panel.reveal();
        }
        else {
            const panel = vscode_1.window.createWebviewPanel('ts', 'i18n Toolbox', vscode_1.ViewColumn.Three, {
                // Enable javascript in the webview
                enableScripts: true,
                localResourceRoots: [vscode_1.Uri.file(path.join(extensionPath, 'ressources'))],
            });
            LangFormPanel.currentPanel = new LangFormPanel(panel, extensionPath, langsText, keysLangs);
            return this.currentPanel;
        }
    }
    dispose() {
        LangFormPanel.currentPanel = undefined;
        // Clean up our resources
        this._panel.dispose();
        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }
    _update(langsText, keysLangs) {
        if (langsText) {
            this._panel.webview.html = this._getLangsTextView(langsText);
        }
        else {
            const ressourceSrc = vscode_1.Uri.file(path.join(this._extensionPath, 'ressources')).with({ scheme: 'vscode-resource' }).toString() + '/';
            // const EditSrc = Uri.file(path.join(this._extensionPath, 'ressources', 'pencil.png')).with({ scheme: 'vscode-resource' }).toString() + '/';
            this._panel.webview.html = this._getEmptyKeysView(keysLangs, ressourceSrc);
        }
    }
    _getEmptyKeysView(keysLangs = {}, ressourceSrc) {
        const langs = Object.keys(keysLangs).sort();
        return `<!DOCTYPE html>
        <html lang="en">
        <head>
        <!-- Use a content security policy to only allow loading images from https or from our extension directory,
        and only allow scripts that have a specific nonce.-->

        <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>i18n Tooblox</title>
        </head>
        <body>
        <base href="${ressourceSrc}">
        <style>
  .container {
    display: flex;
    flex-direction: column;
    width: 100%;
  }
  .lang-wrapper{
      display : flex;
      background: #ffd88e;
      color : #000;
      margin-bottom : 10px;
      padding : 10px;
      border-radius : 10px;
  }
  .lang-wrapper > *{
    flex : 1;
}
.lang{
    padding: 0 10px;
    text-transform: uppercase;
}
.keys {
  
}
.key {
    margin-bottom : 10px;
    display : flex;
}
.key button {
    background : #000;
    border : none;
    display : flex;
    align-items : center;
    border-radius : 4px;
    padding : 5px;
    margin-left : 5px;
}
.key img{
    max-heigth : 15px;
    min-heigth : 5px;
    min-width : 10px;
}
  .center {
    text-align: center;
  }
  .save-button {
    background: #ffd88e;
    border: none;
    box-shadow: 1px 5px 20px #00000069;
    width: 100px;
    padding: 7px;
    margin: auto;
    border-radius: 10px;
    cursor : pointer;
  }

</style>
<div class="container">
    <h3 class="center">Empty keys</h2>
    ${langs
            .map((lang) => `<div class="lang-wrapper"><div class="lang">${lang}</div><div class="keys">${keysLangs[lang]
            .map(({ key, line, jsonPath }) => `<div class="key">${key} <button onclick="openFile('${lang}','${key}',${line})"><img src="external-link.png" alt="external link" /></button> <button onclick="openEditValue('${jsonPath}')"><img  src="pencil.png" alt="edit" /></button></div>`)
            .join('')}</div></div>`)
            .join('')}
            </div>
          
            <!-- <script src="${ /*scriptUri*/''}"></script> !-->
            <script>
            const vscode = acquireVsCodeApi();

            function openFile(lang, key, line){
                vscode.postMessage({
                    command : 'openFile',
                    lang,
                    key,
                    line
                })
            }

            function openEditValue(jsonPath){
                vscode.postMessage({
                    command : 'openEditValue',
                    jsonPath
                })
            }
            
            </script>
        </body>
        </html>`;
    }
    _getLangsTextView(langsText) {
        // Local path to main script run in the webview
        //const scriptPathOnDisk = vscode.Uri.file(path.join(this._extensionPath, 'media', 'main.js'));
        // And the uri we use to load this script in the webview
        //const scriptUri = scriptPathOnDisk.with({ scheme: 'vscode-resource' });
        //const sha256Key = sha256('');
        return `<!DOCTYPE html>
            <html lang="en">
            <head>
            <!-- Use a content security policy to only allow loading images from https or from our extension directory,
            and only allow scripts that have a specific nonce.-->

            <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>i18n Tooblox</title>
            </head>
            <body>
            <style>
      .container {
        display: flex;
        flex-direction: column;
        width: 100%;
      }
      .center {
        text-align: center;
      }
      .save-button {
        background: #ffd88e;
        border: none;
        box-shadow: 1px 5px 20px #00000069;
        width: 100px;
        padding: 7px;
        margin: auto;
        border-radius: 10px;
        cursor : pointer;
      }
    </style>
    <div class="container">
            <span class="center">Key : ${langsText[0].jsonPath} </span> <br/>
            ${langsText
            .map((langs) => {
            return `${langs.lang} <textarea type="text" name="${langs.lang}" onchange="onTextUpdate" >${langs.text
                .split('&nbsp;')
                .join('&amp;nbsp;')}</textarea>  <br/>`;
        })
            .join('')}
                <button class="save-button" onclick="onSave()">Save</button>
                </div>
              
                <!-- <script src="${ /*scriptUri*/''}"></script> !-->
                <script>
                const vscode = acquireVsCodeApi();
                function onSave() {
                    const inputs = [...document.getElementsByTagName('textarea')];

                    vscode.postMessage({
                        command : 'editValue',
                        payload : inputs.map(input => {
                            return {
                                lang : input.name, 
                                text : input.value, 
                                jsonPath : "${langsText[0].jsonPath.toString()}"
                            }
                        })
                    })
                }
                function onTextUpdate(e){
                    vscode.postMessage({
                        command: 'textChanged',
                        text : e.target.value
                    })
                }
                </script>
            </body>
            </html>`;
    }
}
exports.LangFormPanel = LangFormPanel;
//# sourceMappingURL=edit-panel.js.map