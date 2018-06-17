import * as vscode from 'vscode';

import { ConnectController} from './connect.controller';
import ConnectInputPanel from './connect.inputPannel';

export default class ConnectUIController {

    constructor(private context: vscode.ExtensionContext, private controller: ConnectController) {
    }

    public addConnection() {
        ConnectInputPanel.createOrShow(this.context.extensionPath, this.controller);
    }
}
