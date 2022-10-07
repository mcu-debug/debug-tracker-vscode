import { DebugProtocol } from '@vscode/debugprotocol';
import * as vscode from 'vscode';
import { v4 as uuidv4 } from 'uuid';

import {
    DebugEventHandler,
    DebugSessionStatus,
    IDebuggerSubscription,
    IDebuggerTrackerEvent,
    IDebuggerTrackerSubscribeArg,
    ITrackedDebugSession,
    OtherDebugEvents
} from './exports';

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

class ClientInfo {
    constructor(public clientId: string, public handler: DebugEventHandler) { }
}

let ExtensionName = 'unknown extension name';
const DebugClients: { [debugAdapter: string]: ClientInfo[] } = {};
const DebugEventClients: { [debugAdapter: string]: ClientInfo[] } = {};
const AllSessionsById: { [sessionId: string]: DebuggerTracker } = {};
let DebugLevel = 0;

export class DebuggerTracker implements vscode.DebugAdapterTracker {
    private fistStackTrace: DebugProtocol.StackTraceResponse | undefined;
    private isTerminated = false;
    public status = DebugSessionStatus.Unknown;

    constructor(public session: vscode.DebugSession) {
        AllSessionsById[session.id] = this;
        DebuggerTracker.setStatus(session, DebugSessionStatus.Initializing);
    }

    public static getSessionById(id: string): DebuggerTracker {
        return AllSessionsById[id];
    }

    public onDidSendMessage(msg: any): void {
        if (this.isTerminated) return;
        appendMsgToTmpDir('--> ', msg);
        const message = msg as DebugProtocol.ProtocolMessage;
        if (!message) {
            return;
        }
        switch (message.type) {
            case 'event': {
                const ev: DebugProtocol.Event = message as DebugProtocol.Event;
                if (ev) {
                    if (ev.event === 'stopped') {
                        this.fistStackTrace = undefined;
                        DebuggerTracker.setStatus(this.session, DebugSessionStatus.Stopped, ev as DebugProtocol.StoppedEvent);
                        return;
                    } else if (ev.event === 'continued') {
                        // A debug adapter does not have to issue a continued event
                        DebuggerTracker.setStatus(this.session, DebugSessionStatus.Running);
                        return;
                    } else if (ev.event === 'capabilities') {
                        const capabilities = ev.body?.capabilities as DebugProtocol.Capabilities;
                        if (capabilities) {
                            DebuggerTracker.sendCapabilities(this.session, capabilities);
                        }
                        return;
                    }
                }

                const arg: IDebuggerTrackerEvent = {
                    clientId: '',
                    event: OtherDebugEvents.ProtocolEvent,
                    sessionId: this.session.id,
                    protocolEvent: ev
                };
                DebuggerTracker.notifyEventClients(this.session.type, arg);
                break;
            }
            case 'response': {
                const rsp: DebugProtocol.Response = message as DebugProtocol.Response;
                if (rsp) {
                    if (!rsp.success && (['initialize', 'launch', 'attach'].find((v) => v === rsp.command))) {
                        // If one of these fail, then there the session may not have actually started and we don't get
                        // the global sessionStarted and sessionTerminated events at all
                        this.terminate();
                        break;
                    }
                    const continueCommands = ['continue', 'reverseContinue', 'step', 'stepIn', 'stepOut', 'stepBack', 'next', 'goto'];
                    // We don't actually do anything when the session is paused. We wait until someone (VSCode) makes
                    // a stack trace request and we get the frameId from there. Any one will do. Either this or we
                    // have to make our requests for threads, scopes, stackTrace, etc. Unnecessary traffic and work
                    // for the adapter. Downside is if no stackTrace is requested by someone else, then we don't do anything
                    // but then who is the main client for the adapter?
                    if (rsp.success && rsp.command === 'stackTrace') {
                        if (
                            rsp.body?.stackFrames &&
                            rsp.body.stackFrames.length > 0 &&
                            this.fistStackTrace === undefined
                        ) {
                            this.fistStackTrace = rsp as DebugProtocol.StackTraceResponse;
                            DebuggerTracker.sendFirstStackTrace(this.session, this.fistStackTrace);
                        }
                    } else if (rsp.success && continueCommands.includes(rsp.command)) {
                        DebuggerTracker.setStatus(this.session, DebugSessionStatus.Running);
                    } else if (rsp.command === 'initialize') {
                        const capabilities = rsp.body as DebugProtocol.Capabilities;
                        if (capabilities) {
                            DebuggerTracker.sendCapabilities(this.session, capabilities);
                        }
                    }
                }
                break;
            }
            default: {
                // console.log('Unhandled Message type ' + message.type);
                break;
            }
        }
    }

    public onWillReceiveMessage(msg: any) {
        if (this.isTerminated) return;
        appendMsgToTmpDir('<-- ', msg);
    }

    public static trackAllSessions(): vscode.Disposable[] {
        const ret = [
            vscode.debug.onDidStartDebugSession((s: vscode.DebugSession) => {
                // A session is truly not running until we get the first this event.
                // May never happen
                DebuggerTracker.setStatus(s, DebugSessionStatus.Started);
            }),
            vscode.debug.onDidTerminateDebugSession((s: vscode.DebugSession) => {
                const tracker = AllSessionsById[s.id];
                if (tracker) {
                    tracker.terminate();
                }
            })
        ];
        return ret;
    }

    private terminate() {
        if (!this.isTerminated) {
            this.isTerminated = true;
            DebuggerTracker.setStatus(this.session, DebugSessionStatus.Terminated);
            delete AllSessionsById[this.session.id];
        }
    }

    private static notifyClientsGeneric(arg: IDebuggerTrackerEvent, clients: ClientInfo[]) {
        for (const client of clients) {
            const tmp: IDebuggerTrackerEvent = { ...arg, clientId: client.clientId };
            try {
                client.handler(tmp).catch((e) => {
                    console.error(`debug-tracer: Client handler threw an exception, ${e}`, tmp);
                });
            }
            catch (e) {
                console.error(`debug-tracer: Could not run client handler, ${e}`, tmp);
            }
        }
    }

    private static notifyClients(daName: string, arg: IDebuggerTrackerEvent) {
        const wildOnes = DebugClients['*'] || [];
        const thisOne = DebugClients[daName] || [];
        const all = wildOnes.concat(thisOne);
        DebuggerTracker.notifyClientsGeneric(arg, all);
    }

    private static notifyEventClients(daName: string, arg: IDebuggerTrackerEvent) {
        const wildOnes = DebugEventClients['*'] || [];
        const thisOne = DebugEventClients[daName] || [];
        const all = wildOnes.concat(thisOne);
        DebuggerTracker.notifyClientsGeneric(arg, all);
    }

    private static setStatus(
        s: vscode.DebugSession,
        status: DebugSessionStatus,
        optArg?: DebugProtocol.StoppedEvent) {
        if (DebugLevel) {
            const str = `${ExtensionName}: Session '${s.type}:${s.name}': Status '${status}', id = ${s.id}`;
            console.log(str);
            appendMsgToTmpDir(str, undefined);
        }
        const tracker = AllSessionsById[s.id];
        if (tracker && (tracker.status !== status)) {
            tracker.status = status;
            const arg: IDebuggerTrackerEvent = {
                clientId: '',
                event: status,
                sessionId: s.id
            };
            if (status === DebugSessionStatus.Initializing) {
                arg.session = s;
            } else if (status === DebugSessionStatus.Stopped) {
                arg.stoppedEvent = optArg as DebugProtocol.StoppedEvent;
            }
            this.notifyClients(s.type, arg);
        }
    }

    private static sendCapabilities(s: vscode.DebugSession, capabilities: DebugProtocol.Capabilities) {
        if (DebugLevel) {
            const str = `${ExtensionName}: Session '${s.type}:${s.name}': event '${OtherDebugEvents.Capabilities}', id = ${s.id}`;
            console.log(str);
            appendMsgToTmpDir(str, undefined);
        }
        const arg: IDebuggerTrackerEvent = {
            clientId: '',
            event: OtherDebugEvents.Capabilities,
            sessionId: s.id,
            capabilities: capabilities
        };
        this.notifyClients(s.type, arg);
    }

    private static sendFirstStackTrace(s: vscode.DebugSession, response: DebugProtocol.StackTraceResponse) {
        if (DebugLevel) {
            const str = `${ExtensionName}: Session '${s.type}:${s.name}': event '${OtherDebugEvents.FirstStackTrace}', id = ${s.id}`;
            console.log(str);
            appendMsgToTmpDir(str, undefined);
        }
        const arg: IDebuggerTrackerEvent = {
            clientId: '',
            event: OtherDebugEvents.FirstStackTrace,
            sessionId: s.id,
            stackTrace: response
        };
        this.notifyClients(s.type, arg);
    }

    public notifyCurrentStatus(clientId: string) {
        const arg: IDebuggerTrackerEvent = {
            clientId: clientId,
            event: this.status,
            sessionId: this.session.id,
            session: this.session
        };
        DebuggerTracker.notifyClients(this.session.type, arg);
    }
}

export class DebugTrackerFactory implements vscode.DebugAdapterTrackerFactory {
    static context: vscode.ExtensionContext;
    public static register(cxt: vscode.ExtensionContext): DebugTrackerFactory {
        DebugTrackerFactory.context = cxt;
        const elements = cxt.extensionUri.path.split(/[\\/]+/);
        ExtensionName = elements.pop() || cxt.extensionUri.path;
        return new DebugTrackerFactory();
    }
    constructor() {
        DebugTrackerFactory.context.subscriptions.push(
            ...DebuggerTracker.trackAllSessions(),
            vscode.workspace.onDidChangeConfiguration(this.settingsChanged.bind(this)),
            vscode.debug.registerDebugAdapterTrackerFactory('*', this)
        );
    }

    private settingsChanged(e: vscode.ConfigurationChangeEvent) {
        console.log(e);
    }

    public createDebugAdapterTracker(session: vscode.DebugSession): vscode.ProviderResult<vscode.DebugAdapterTracker> {
        return new DebuggerTracker(session);
    }

    public subscribe(arg: IDebuggerTrackerSubscribeArg): IDebuggerSubscription | string {
        const uuid = uuidv4();
        const item = new ClientInfo(uuid, arg.body.handler);
        const add = (daName: string) => {
            let existing = DebugClients[daName];
            if (existing) {
                existing.push(item);
            } else {
                DebugClients[daName] = [item];
            }
            if (arg.body.wantCurrentStatus) {
                // We don't want to notify before subscribe returns. Generate events if any
                // asynchronously
                setImmediate(() => {
                    for (const [_id, tracker] of Object.entries(AllSessionsById)) {
                        tracker.notifyCurrentStatus(uuid);
                        if ((daName === '*') || (daName === tracker.session.type)) {
                            tracker.notifyCurrentStatus(uuid);
                        }
                    }
                });
            }
            if (arg.body.notifyAllEvents) {
                existing = DebugEventClients[daName];
                if (existing) {
                    existing.push(item);
                } else {
                    DebugEventClients[daName] = [item];
                }
            }
        };

        if (!arg.body) {
            return 'Body field missing for debug-tracker subscribe()';
        } else if (!arg.body.debuggers) {
            return 'No debuggers specified in debug-tracker subscribe()';
        } else if (!arg.body.handler) {
            return 'No handler specified in debug-tracker subscribe()';
        } else if (typeof arg.body.handler !== 'function') {
            return 'Invalid handler, must be a function in debug-tracker subscribe()';
        } else if (arg.body.debuggers === '*') {
            add('*');
        } else {
            for (const daName of arg.body.debuggers) {
                add(daName);
            }
        }

        if ((arg.body.debugLevel !== undefined) && (arg.body.debugLevel > DebugLevel)) {
            DebugLevel = arg.body.debugLevel;
        }
        const tmp: IDebuggerSubscription = {
            clientId: uuid
        };
        return tmp;
    }

    public unsubscribe(clientId: string) {
        for (const item of [DebugClients, DebugEventClients]) {
            for (const daName of Object.getOwnPropertyNames(item)) {
                const clientInfo = item[daName];
                item[daName] = clientInfo.filter((v) => v.clientId !== clientId);
                if (item[daName].length === 0) {
                    delete item[daName];
                }
            }
        }
    }

    public getSessionStatus(sessionId: string): DebugSessionStatus {
        const session = DebuggerTracker.getSessionById(sessionId);
        if (!session) {
            return DebugSessionStatus.Unknown;
        }
        return session.status;
    }

    public getSessionInfo(sessionId: string): ITrackedDebugSession | undefined {
        const session = DebuggerTracker.getSessionById(sessionId);
        if (!session) {
            return undefined;
        }
        const ret: ITrackedDebugSession = {
            session: session.session,
            status: session.status
        };
        return ret;
    }
}

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
let firstDebugOutput = true;
function appendMsgToTmpDir(str: string, obj: any) {
    if (fs === undefined) {
        return;
    }
    if (DebugLevel > 1) {
        str += (obj ? JSON.stringify(obj) : '') + '\n';
        try {
            const fname = path.join(os.tmpdir(), 'debug-tracker-log.txt');
            if (firstDebugOutput) {
                fs.writeFileSync(fname, str);
                firstDebugOutput = false;
            } else {
                fs.appendFileSync(fname, str);
            }
        }
        catch (e: any) {
            console.log(e ? e.toString() : 'unknown exception?');
        }
    }
}
