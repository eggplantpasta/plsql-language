import * as vscode from 'vscode';

import { PLSQLSettings, PLSQLConnection } from './plsql.settings';

export interface PLSQLConnectionGroup {
    group: string;
    active?: boolean;
    items: PLSQLConnection[];
}

export class ConnectController {

    public readonly active: PLSQLConnection;
    private connections: PLSQLConnection[];
    private activeInfos: string;
    private patternActiveInfos: string;

    constructor() {
    }

    public getConnections(refresh?: boolean): PLSQLConnection[] {
        if (refresh || !this.connections) {
            this.connections = PLSQLSettings.getConnections();
            // TODO if !database, group = database ?
            this.connections.sort((a,b) => a.database.localeCompare(b.database));

            const active = PLSQLSettings.getConnectionActiveInfos();
            this.activeInfos = active.activeInfos;
            this.patternActiveInfos = active.patternActiveInfos;
        }
        return this.connections;
    }

    public getConnectionsHierarchie(refresh?: boolean): PLSQLConnectionGroup[] {
        let group;
        const result: PLSQLConnectionGroup[] = [];

        this.getConnections(refresh);
        if (this.connections)
            this.connections.forEach(item => {
                // TODO if group = database ?
                if (!group || (group.group !== item.database)) {
                    if (group)
                        group.active = group.items.find(connection => connection.active) != null;
                    group = {group: item.database, items: []};
                    result.push(group);
                }
                group.items.push(item);
            });

        return result;
    }

    public format(connection: PLSQLConnection) {
        return connection.name || connection.username;
    }

    public updateActiveInfos(connection: PLSQLConnection) {
        this.activeInfos =
            this.patternActiveInfos
                .replace('${database}', connection.database)
                .replace('${username}', connection.username)
                .replace('${password}', connection.password)
                .replace('${schema}', connection.schema);
    }

    public setActive(connection: PLSQLConnection) {
        const element = this.connections.find(item => item.active);
        if (element)
            element.active = false;
        connection.active = true;
        this.updateActiveInfos(connection);
        this.saveConnections();
    }

    public addConnection(connection) {
        if (connection.active) {
            const element = this.connections.find(item => item.active);
            if (element)
                element.active = false;
            this.updateActiveInfos(connection);
        }
        this.connections.push(connection);
        this.saveConnections();
    }

    public saveConnections() {
        const config = vscode.workspace.getConfiguration('plsql-language');
        // TODO if no workspace !...
        config.update('connections', this.connections, false);
        config.update('connection.activeInfos', this.activeInfos, false);
    }

}
