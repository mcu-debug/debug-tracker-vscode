import * as vscode from 'vscode';
import { DebugProtocol } from '@vscode/debugprotocol';
/** Return value of a subscription. It will be used in subsequent calls to identify the caller */
export interface IDebuggerSubscription {
    /**
     * Every call to subscribe will get a unique id. Use this to unsubscribe.
     * It may be used in future for other API functions as well
     */
    clientId: string;
}
/** Current status of a session. Will be used for a status change event as well */
export declare enum DebugSessionStatus {
    Unknown = "unknown",
    /**
     * There are things that occur before the session starts that we need to know sometimes.
     * vscode.debug.onDidStartDebugSession triggers much later. `Initializing` will start from
     * the 'initialize' request which might be important to know the adapters capabilities.
     *
     * For instance, capabilities can be monitored during the initializing stage.
     */
    Initializing = "initializing",
    /**
     * This is when vscode.debug.onDidStartDebugSession was called. One should assume at the start
     * the program is busy or running so avoid making requests until you get to a stopped state
     * It depends on the debug-adapter
     */
    Started = "started",
    /**
     * When a program officially stopped for any reason. Note that you can get a `Stopped` event immediately followed
     * by a continue/running state. This can happen many different ways. Manipulating breakpoints while program is
     * running for instance. or the user aggressively single stepping.
     *
     * It is a good idea to debounce this event
     */
    Stopped = "stopped",
    /**
     * We can enter Running state in many ways. resume, stepIn, stepOut, etc.
     */
    Running = "running",
    /**
     * This can happen when vscode.debug.onDidTerminateDebugSession is called. But this may never
     * be called if it did not even get to the `Started` stage. So, even the session did not actually
     * start we try to monitor for failure to start and synthesize a Terminated event for you.
     */
    Terminated = "terminated"
}
/** Other miscellaneous events that are not status change */
export declare enum OtherDebugEvents {
    /**
     * We don't try to figure this out. We generate this event if another client makes a stackTrace
     * request after a pause. Generally, VSCode is the one who queries the stackTrace. We piggy back
     * on that instead of generating another request.
     * If this does not suite your needs, then you can always generate your own requests. Remember to
     * save the current threadId from the Stopped event
     */
    FirstStackTrace = "first-stack-trace",
    /**
     * Get a notification for capabilities. You can get that as a result of the Initialize request
     * or at random times. Of all the protocol events, this is separated out as a special event
     */
    Capabilities = "capabilities",
    /**
     * PROTOCOLEVENT means an event occurred that is specified by Debug Adapter Protocol
     * This is except for the RESUMED (continued), STOPPED and CAPABILITIES events which we already
     * special/specific events that can occur in various ways (not just by an DA created event)
     */
    ProtocolEvent = "protocol-event"
}
/** All callbacks will be tagged as one of these types */
export declare type DebuggerTrackerEventType = DebugSessionStatus | OtherDebugEvents;
/**
 * Used for returning a session information.
 */
export interface ITrackedDebugSession {
    session: vscode.DebugSession;
    status: DebugSessionStatus;
}
/** Used as an argument to the callback when an event occurs */
export interface IDebuggerTrackerEvent {
    clientId: string;
    event: DebuggerTrackerEventType;
    /** `sessionId` is always passed even when `session` is not passed */
    sessionId: string;
    /**
     * Only used for 'Initializing' event. Also used if it was already initialized but subscribed to later.
     * The full session information can be rather large for some debuggers and as such not passed all the
     * time as it may involve serialization. We try to pass it just once or upon request
     */
    session?: vscode.DebugSession;
    /** Only used for 'STOPPED' event */
    stoppedEvent?: DebugProtocol.StoppedEvent;
    /** Only used for FIRST_FRAME_ID event */
    stackTrace?: DebugProtocol.StackTraceResponse;
    /** Only used for CAPABILITIES event */
    capabilities?: DebugProtocol.Capabilities;
    /** See PROTOCOLEVENT */
    protocolEvent?: DebugProtocol.Event;
}
/** Event-handler (callback) signature */
export declare type DebugEventHandler = (arg: IDebuggerTrackerEvent) => Promise<void>;
/** This is version 1 of the interface used when subscribing */
export interface IDebuggerTrackerSubscribeArgBodyV1 {
    /** List of debug adapters to subscribe to, or all sessions */
    debuggers: string[] | '*';
    /** The callback used when an event occurs */
    handler: DebugEventHandler;
    /**
     * Request the current status if debug sessions(s) already exist when subscribing.
     * If falsy, you will only get notified when the next event occurs. In the very next
     * `handler` call, you will find the session info as if they session had just started
     * but the current status will reflect the actual status
     */
    wantCurrentStatus?: boolean;
    /**
     * Normally, we do not notify all the events that Debug Adapter generates. We interpret some important
     * ones that indicate a session status change but ignore others. With this flag enabled, you will get
     * all the others
     */
    notifyAllEvents?: boolean;
}
/** Used while subscribing to this extension */
export interface IDebuggerTrackerSubscribeArg {
    /** API version number. Must be an integer. Must be 1 */
    version: number;
    body: IDebuggerTrackerSubscribeArgBodyV1;
}
/** The main interface to the tracker */
export interface IDebugTracker {
    /**
     * Should be the first call, to register to track debugers.
     * @param arg See {@link IDebuggerTrackerSubscribeArg }
     * @returns A string is it is an error (like malformed arg) or an {@link IDebuggerSubscription} if success
     */
    subscribe(arg: IDebuggerTrackerSubscribeArg): IDebuggerSubscription | string;
    /**
     *
     * @param clientId An id that was returned in {@link IDebuggerSubscription}, when {@link subscribe} was called
     */
    unsubscribe(clientId: string): void;
    /**
     * @param sessionId This is the ID of the debug session that is part of vscode.DebugSession
     * @returns Returns the current status of a session. This can be DebugSessionStatus.Unknown if the session does not exist anymore
     */
    getSessionStatus(sessionId: string): DebugSessionStatus;
    /**
     * @param sessionId This is the ID of the debug session that is part of vscode.DebugSession
     * @returns Returns the session information. This can be `undefined` if the session does not exist anymore
     */
    getSessionInfo(sessionId: string): ITrackedDebugSession | undefined;
}
export declare class DebugTracker implements IDebugTracker {
    private context;
    private tracker;
    constructor(context: vscode.ExtensionContext);
    /**
     * Should be the first call, to register to track debugers.
     * @param arg See {@link IDebuggerTrackerSubscribeArg }
     * @returns A string is it is an error (like malformed arg) or an {@link IDebuggerSubscription} if success
     */
    subscribe(arg: IDebuggerTrackerSubscribeArg): IDebuggerSubscription | string;
    /**
     *
     * @param clientId An id that was returned in {@link IDebuggerSubscription}, when {@link subscribe} was called
     */
    unsubscribe(clientId: string): void;
    /**
     * @param sessionId This is the ID of the debug session that is part of vscode.DebugSession
     * @returns Returns the current status of a session. This can be DebugSessionStatus.Unknown if the session does not exist anymore
     */
    getSessionStatus(sessionId: string): DebugSessionStatus;
    /**
     * @param sessionId This is the ID of the debug session that is part of vscode.DebugSession
     * @returns Returns the session information. This can be `undefined` if the session does not exist anymore
     */
    getSessionInfo(sessionId: string): ITrackedDebugSession | undefined;
}
