"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_1 = require("vscode");
class LangFormPanel {
    constructor(panel, extensionPath, langsText) {
        this._disposables = [];
        this._panel = panel;
        this._extensionPath = extensionPath;
        // Set the webview's initial html content
        this._update(langsText);
        // Listen for when the panel is disposed
        // This happens when the user closes the panel or when the panel is closed programatically
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
    }
    static createOrShow(extensionPath, langsText) {
        // If we already have a panel, show it.
        if (LangFormPanel.currentPanel) {
            LangFormPanel.currentPanel._update(langsText);
            LangFormPanel.currentPanel._panel.reveal();
        }
        else {
            const panel = vscode_1.window.createWebviewPanel('ts', 'Cat Coding', vscode_1.ViewColumn.Three, {
                // Enable javascript in the webview
                enableScripts: true
                // And restrict the webview to only loading content from our extension's `media` directory.
                //localResourceRoots: [vscode.Uri.file(path.join(extensionPath, 'media'))]
            });
            LangFormPanel.currentPanel = new LangFormPanel(panel, extensionPath, langsText);
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
    _update(langsText) {
        this._panel.title = 'title ';
        this._panel.webview.html = this._getHtmlForWebview(langsText);
    }
    _getHtmlForWebview(langsText) {
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
                <title>Translator</title>
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
      }
    </style>
    <div class="container">
            <span class="center">Key : ${langsText[0].jsonPath} </span> <br/>

            ${langsText
            .map(langs => `${langs.lang} <textarea type="text" name="${langs.lang}" onchange="${this._panel.webview.postMessage('refactor')}" >${langs.text}</textarea>  <br/>`)
            .join('')}
                <button class="save-button" onclick="onSave()">Save</button>
                </div>
              
                <!-- <script src="${ /*scriptUri*/''}"></script> !-->
                <script>
                const vscode = acquireVsCodeApi();
                function onSave() {
                    const inputs = [...document.getElementsByTagName('textarea')];
                   
                    vscode.postMessage(inputs.map(input => {
                        return {
                            lang : input.name, 
                            text : input.value, 
                            jsonPath : "${langsText[0].jsonPath.toString()}"
                        }
                    }))
                }
                </script>
            </body>
            </html>`;
    }
}
exports.LangFormPanel = LangFormPanel;
//# sourceMappingURL=edit-panel.js.map