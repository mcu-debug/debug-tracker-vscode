/* eslint-disable @typescript-eslint/no-empty-function */
import * as vscode from 'vscode';
import { DebugTrackerFactory } from './debug-tracker';
import { DebugTracker, IDebugTracker } from './exports';

/** Our primary interface to other extensions */
export class DebugTrackerExtension extends DebugTracker {
    constructor(context: vscode.ExtensionContext, private channel: vscode.OutputChannel | undefined) {
        super(context, channel);
        this.fromSettings();
        context.subscriptions.push(
            vscode.commands.registerCommand('mcu-debug.debug-tracker-vscode.start', () => {
                vscode.window.showInformationMessage('debug-tracker-vscode.start activated via command');
            }),
            vscode.workspace.onDidChangeConfiguration(this.settingsChanged.bind(this)),
            vscode.commands.registerCommand('mcu-debug.debug-tracker-vscode.debugLevel', () => {
                const opts: vscode.QuickPickOptions = {
                    title: 'Select logging level',
                    canPickMany: false
                };
                vscode.window.showQuickPick(this.debugLevelStrings, opts).then((val) => {
                    const old = DebugTrackerFactory.dbgLevel;
                    this.setDebugLevel(val);
                    if (old !== DebugTrackerFactory.dbgLevel) {
                        const config = vscode.workspace.getConfiguration(this.section);
                        config.update(this.debugLevel, DebugTrackerFactory.dbgLevel);
                    }
                });
            })
        );
    }

    private setDebugLevel(val: string | undefined) {
        if (val) {
            const oldValue = DebugTrackerFactory.dbgLevel;
            const newValue = parseInt(val);
            if (oldValue !== newValue) {
                switch (newValue) {
                    case 0: DebugTrackerFactory.dbgLevel = 0; break;
                    case 1: DebugTrackerFactory.dbgLevel = 1; break;
                    case 2: DebugTrackerFactory.dbgLevel = 2; break;
                    default: return;
                }
                if (this.channel) {
                    this.channel.appendLine('Setting log level to ' + this.debugLevelStrings[DebugTrackerFactory.dbgLevel]);
                }
            }
        }
    }

    private readonly section = 'mcu-debug.debug-tracker-vscode';
    private readonly debugLevel = 'debugLevel';
    private readonly debugLevelStrings = [
        '0 - Disable debug logging',
        '1 - Status changes and important events only',
        '2 - Very verbose and includes all transactions'];
    private settingsChanged(e: vscode.ConfigurationChangeEvent) {
        if (e.affectsConfiguration(this.section + '.' + this.debugLevel)) {
            this.fromSettings();
        }
    }

    private fromSettings() {
        const config = vscode.workspace.getConfiguration(this.section);
        const val = config.get(this.debugLevel, 0);
        this.setDebugLevel(val.toString());
    }
}

// The return value can be used by client extensions and they can use all the public
// methods in the DebugTrackerVSCode as an API
export function activate(context: vscode.ExtensionContext): IDebugTracker {
    let channel = undefined;
    try {
        channel = vscode.window.createOutputChannel('Mcu-debug Tracker');
        channel.appendLine(`This channel was created by the extension ${context.extension.id} for debugging the tracker. Default logging level is 0 (none)`);
        channel.appendLine('You can set the logging level using the Command Palette, look for "Debug Tracker: Set debug log level". There is also an extension setting');
    } finally {
    }
    return new DebugTrackerExtension(context, channel);
}

export function deactivate() { }
