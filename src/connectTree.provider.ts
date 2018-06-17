import * as vscode from 'vscode';

import { ConnectController, PLSQLConnectionGroup} from './connect.controller';
import ConnectUIController from './connectUI.controller';
import { PLSQLConnection } from './plsql.settings';

import path = require('path');

const enum EConnectTreeItem {
    Group = 0,
    Connection
}

export default class ConnectTreeProvider implements vscode.TreeDataProvider<ConnectTreeItem>  {

    private connections: PLSQLConnectionGroup[];

    // save tree structure to be able to redraw
    private tree;  // {GRP_NAME: {group: ConnectTreeItem, items: ConnectTreeItem[]}}

    /* tslint:disable */
    private _onDidChangeTreeData: vscode.EventEmitter<ConnectTreeItem | undefined> = new vscode.EventEmitter<ConnectTreeItem | undefined>();
    readonly onDidChangeTreeData: vscode.Event<ConnectTreeItem | undefined> = this._onDidChangeTreeData.event;
    /* tslint:enable*/

    public readonly iconPath = {
        database: {
            light: path.join(__filename, '..', '..', '..', 'resources', 'images', 'light', 'database.png'),
            dark: path.join(__filename, '..', '..', '..', 'resources', 'images', 'dark', 'database.png')
        },
        databaseActive: path.join(__filename, '..', '..', '..', 'resources', 'images', 'common', 'database_active.png'),
        connection: {
            light: path.join(__filename, '..', '..', '..', 'resources', 'images', 'light', 'connection.png'),
            dark: path.join(__filename, '..', '..', '..', 'resources', 'images', 'dark', 'connection.png')
        },
        connectionActive: path.join(__filename, '..', '..', '..', 'resources', 'images', 'common', 'connection_active.png')
    }


    constructor(private controllerUI: ConnectUIController, private controller: ConnectController) {
    }

    getTreeItem(element: ConnectTreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: ConnectTreeItem): Promise<ConnectTreeItem[]> {
        return new Promise(resolve => {
            if (!element) { // root
                if (!this.tree) {
                    this.tree = {};
                    if (!this.connections)
                        this.connections = this.controller.getConnectionsHierarchie(true);
                    this.connections.forEach(item => {
                        this.tree[item.group] = {group: new ConnectTreeItem(this, item.group, EConnectTreeItem.Group, item)};
                    });
                }
                resolve(Object.keys(this.tree).map(item => this.tree[item].group));
            } else {
                const group = this.tree[element.label];
                if (!group.items) {
                    const connectionGroup = this.connections.find(item => item.group === element.label);
                    group.items = connectionGroup.items.map(connection =>
                        new ConnectTreeItem(this, this.controller.format(connection), EConnectTreeItem.Connection, group, connection)
                    )
                }
                resolve(group.items);
            }
        });
    }

    private redraw() {
        delete this.tree;
        this._onDidChangeTreeData.fire();
    }

    public refresh(): void {
        delete this.tree;
        delete this.connections;
        this._onDidChangeTreeData.fire();
    }

    public settings(): void {
        vscode.commands.executeCommand('workbench.action.openWorkspaceSettings');
    }

    public new(): void {
        this.controllerUI.addConnection();
        this.refresh();
    }

    public activateEntry(element: ConnectTreeItem): void {
        this.controller.setActive(element.connection);

        this.connections.forEach(item => {
            item.active = item.items.find(connection => connection.active) != null;
        });

        this.redraw();
    }

    // public editEntry(element: ConnectTreeItem): void {
    //     // TODO
    // }

    // public deleteEntry(element: ConnectTreeItem): void {
    //     // TODO
    // }

}

class ConnectTreeItem extends vscode.TreeItem {

    public readonly kind: EConnectTreeItem;
    public readonly connection: PLSQLConnection;
    public readonly group: PLSQLConnectionGroup;
    public readonly provider: ConnectTreeProvider;

    constructor(provider: ConnectTreeProvider, label: string = '', kind: EConnectTreeItem, group: PLSQLConnectionGroup, connection?: PLSQLConnection) {

        super(label, kind === EConnectTreeItem.Group ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None);

        this.kind = kind;
        this.connection = connection;
        this.group = group;
        this.provider = provider;
        this.setIconPath();

        switch (this.kind) {
            case EConnectTreeItem.Connection:
                this.contextValue = 'plsqlLanguageConnection';
                this.command = {
                    command: 'treePLSQLLanguage.activateEntry',
                    title: 'Activate',
                    arguments: [this]
                };
                break;
            case EConnectTreeItem.Group:
                this.contextValue = 'plsqlLanguageGroup';
                break;
            default:
                this.contextValue = 'plsqlLanguageNone';
        }
    }

    public setIconPath() {
        switch (this.kind) {
            case EConnectTreeItem.Connection:
                this.iconPath = this.connection.active ? this.provider.iconPath.connectionActive : this.provider.iconPath.connection;
                break;
            case EConnectTreeItem.Group:
                this.iconPath = this.group.active ? this.provider.iconPath.databaseActive : this.provider.iconPath.database;
                break;
        }
    }
}
