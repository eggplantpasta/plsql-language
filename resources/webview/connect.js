// This script will be run within the webview itself
// It cannot access the main VS Code APIs directly.

(function () {
    const vscode = acquireVsCodeApi();

    // add submit event
    document.getElementById('connection')
        .addEventListener('submit', submitConnection);

    function submitConnection(event) {
        alert('submit');
        vscode.postMessage({
            command: 'newConnection',
            data: {
                name: document.connection.name.value,
                database: document.connection.database.value,
                user: document.connection.user.value,
                password: document.connection.password.value,
                schema: document.connection.schema.value,
                active: document.connection.active.checked ? true : false
            }
        });
    }

    // Handle messages sent from the extension to the webview
    window.addEventListener('message', event => {
        const message = event.data; // The json data that the extension sent
        if (message.command = 'newConnection') {
            document.connection.name.value = message.data.name;
            document.connection.database.value = message.data.database;
            document.connection.user.value = message.data.user;
            document.connection.password.value = message.data.password;
            document.connection.schema.value = message.data.schema;
            if (message.data.active)
                document.connection.active.value = true;
        }
    });

}());