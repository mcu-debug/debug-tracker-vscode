/* eslint-disable @typescript-eslint/no-empty-function */
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { DebugTrackerFactory } from './debug-tracker';

export interface IDebuggerTracker {
	nonce: string;
}

export interface IDebuggerTrackerSubscribeArgBodyV1 {
	handler: (arg: any) => void;
}

export interface IDebuggerTrackerSubscribeArg {
	version: number;
	debuggers: [];
}

class DebugTrackerVSCode {
	private tracker: DebugTrackerFactory;
	constructor(private context: vscode.ExtensionContext) {
		console.log(`VSCode extension "debug-tracker-vscode" is now active from ${context.extensionPath}`);
		context.subscriptions.push(
			vscode.commands.registerCommand('debug-tracker-vscode.activate', () => {})
		);

		this.tracker = DebugTrackerFactory.register(context);
	}

	public subscribe(debuggers: string[]): string {

	}
}

// The return value can be used by client extensions and they can use all the public
// methods in the DebugTrackerVSCode as an API
export function activate(context: vscode.ExtensionContext) {

	return new DebugTrackerVSCode(context);
}

export function deactivate() { }
