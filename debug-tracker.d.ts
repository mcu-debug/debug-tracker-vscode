import * as vscode from 'vscode';
import { DebugSessionStatus, IDebuggerSubscription, IDebuggerTrackerSubscribeArg, ITrackedDebugSession } from './extension';
export interface ITrackedDebugSessionXfer {
    sessionId: string;
    sessionName: string;
    sessionType: string;
    wsFolder: string;
    canWriteMemory: boolean;
    canReadMemory: boolean;
    status: DebugSessionStatus;
    frameId?: number;
}
export declare class DebuggerTracker implements vscode.DebugAdapterTracker {
    session: vscode.DebugSession;
    private static allSessionsById;
    private fistStackTrace;
    private isTerminated;
    status: DebugSessionStatus;
    constructor(session: vscode.DebugSession);
    static getSessionById(id: string): DebuggerTracker;
    onDidSendMessage(msg: any): void;
    onWillReceiveMessage(msg: any): void;
    static trackAllSessions(): vscode.Disposable[];
    private terminate;
    private static notifyClientsGeneric;
    private static notifyClients;
    private static notifyEventClients;
    private static setStatus;
    private static sendCapabilities;
    private static sendFirstStackTrace;
}
export declare class DebugTrackerFactory implements vscode.DebugAdapterTrackerFactory {
    static context: vscode.ExtensionContext;
    static register(cxt: vscode.ExtensionContext): DebugTrackerFactory;
    constructor();
    private settingsChanged;
    createDebugAdapterTracker(session: vscode.DebugSession): vscode.ProviderResult<vscode.DebugAdapterTracker>;
    subscribe(arg: IDebuggerTrackerSubscribeArg): IDebuggerSubscription | string;
    unsubscribe(clientId: string): void;
    getSessionStatus(sessionId: string): DebugSessionStatus;
    getSessionInfo(sessionId: string): ITrackedDebugSession | undefined;
}
//# sourceMappingURL=debug-tracker.d.ts.map