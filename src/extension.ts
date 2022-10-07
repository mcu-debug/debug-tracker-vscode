/* eslint-disable @typescript-eslint/no-empty-function */
import * as vscode from 'vscode';
import { DebugTracker, IDebugTracker } from './exports';

/** Our primary interface to other extensions */
export class DebugTrackerExtension extends DebugTracker {
    constructor(context: vscode.ExtensionContext) {
        super(context);
        context.subscriptions.push(
            vscode.commands.registerCommand('debug-tracker-vscode.start', () => {
                vscode.window.showInformationMessage('debug-tracker-vscode.start activated via command');
            })
        );
    }
}

// The return value can be used by client extensions and they can use all the public
// methods in the DebugTrackerVSCode as an API
export function activate(context: vscode.ExtensionContext): IDebugTracker {
    // console.log(`VSCode extension "debug-tracker-vscode" is now active from ${context.extensionUri.path}`);
    return new DebugTrackerExtension(context);
}

export function deactivate() { }
