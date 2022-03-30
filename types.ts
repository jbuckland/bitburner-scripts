import {DebugLevel, EventType} from './consts';

export interface ServerInfo {
    currMoney: number;
    currSecurity: number;
    growTime: number;
    growthParam: number;
    hackTime: number;
    hasRoot: boolean;
    hostname: string;
    maxMoney: number;
    minSecurity: number;
    reqHackSkill: number;
    targetValue: number;
    weakenTime: number;
}

export interface RunnerInfo {
    freeRam: number;
    hostname: string;
}


export enum TaskCategory {
    batch = 'batch',
    prep = 'prep',
    share = 'share'
}

export enum TaskType {
    hack = 'hack',
    weaken = 'weaken',
    grow = 'grow',
    batchHack = 'batch-hack',
    batchWeaken = 'batch-weaken',
    batchGrow = 'batch-grow',
}

export interface ServerThreads {
    hostname: string;
    pid: number;
    threadCount: number;

}

export interface ServerEvent {
    eventType: EventType;
    extra?: string;
    hostname: string;
    target: string;
    timestamp: number,

}

export interface Task {
    allocatedThreads: ServerThreads[];
    hostname: string;
    taskType: TaskType;
    threadsNeeded: number;
}

export interface IServerNode {
    children: IServerNode[];
    hostname: string;
    parent?: IServerNode;
}

export interface IFaction {
    name: string;
}

export interface IServerFaction extends IFaction {
    hostname: string;
}

export interface IHackFaction extends IServerFaction {
}

export interface ICityFaction extends IFaction {
    homeCity: string;
}

export interface ICompanyFaction extends IServerFaction {
    city: string;
    repNeededForInvite: number;
}

export interface IDarkwebTool {
    cost: number;
    createSkill: number;
    name: string;
}

export type RunMode = 'normal' | 'takeall' | 'share';

export interface IGlobalSettings {
    debug?: boolean;
    expGain?: boolean;
    hackPercent?: number;
    ramBuffer?: number;
    share?: boolean;
}

export interface ITargetWorkInfo {
    readyForBatch: boolean;
    target: ServerInfo;
    threadInfos: { [key: string]: ThreadInfo };
    //weakenThreadsNeeded: ThreadInfo,
    //growThreadsNeeded: ThreadInfo;
}

export interface ThreadInfo {
    inProgress: number;
    moreNeeded: number;
    task: TaskType;
    total: number;
}

export interface ICompanyJob {
    copmpanyName: string,
    jobName: string;
}

export interface IRunnerServer {
    freeRam: number;
    hostname: string;
    maxRam: number;
    usedRam: number;
}

export interface IDebugMessage {
    extraData?: any;
    level: DebugLevel,
    msg: string,
    source: string,
    time: number,
}


export interface IBatchRequest {
    batchId: number,
    delayUntilGrow: number,
    delayUntilHack: number,
    delayUntilWeakenGrow: number,
    delayUntilWeakenHack: number,
    growThreadsNeeded: number,
    growTime: number;
    hackThreadCount: number,
    hackTime: number;
    target: string;
    totalRamNeeded: number;
    weakenThreadsNeededFromGrow: number,
    weakenThreadsNeededFromHack: number,
    weakenTime: number;
}



