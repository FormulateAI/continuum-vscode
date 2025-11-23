import * as vscode from 'vscode';
import axios from 'axios';

const SERVER_URL = 'http://localhost:8000';

export function activate(context: vscode.ExtensionContext) {
    console.log('Context Hub Connector is now active!');

    // Command: Connect
    let connectDisposable = vscode.commands.registerCommand('context-hub.connect', async () => {
        try {
            const response = await axios.get(`${SERVER_URL}/`);
            if (response.status === 200) {
                vscode.window.showInformationMessage('Connected to Context Hub!');
            }
        } catch (error) {
            vscode.window.showErrorMessage('Failed to connect to Context Hub. Is the server running?');
        }
    });

    // Command: Push Selection
    let pushDisposable = vscode.commands.registerCommand('context-hub.pushSelection', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showWarningMessage('No active editor found.');
            return;
        }

        const selection = editor.selection;
        const text = editor.document.getText(selection);

        if (!text) {
            vscode.window.showWarningMessage('No text selected.');
            return;
        }

        try {
            // Get current session (simplified for MVP)
            // In real app, we might store session ID in workspace state
            const sessionResp = await axios.get(`${SERVER_URL}/session/current`);

            await axios.post(`${SERVER_URL}/context/add`, {
                type: 'code_selection',
                content: text,
                metadata: {
                    file: editor.document.fileName,
                    language: editor.document.languageId
                }
            });

            vscode.window.showInformationMessage('Selection pushed to Context Hub!');
        } catch (error) {
            vscode.window.showErrorMessage('Failed to push context. Ensure a session is active.');
        }
    });

    context.subscriptions.push(connectDisposable);
    context.subscriptions.push(pushDisposable);
}

export function deactivate() { }
