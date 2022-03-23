import { EventType } from './consts';

export interface ServerInfo {
    hostname: string;
    hasRoot: boolean;
    growthParam: number;
    minSecurity: number;
    currSecurity: number;
    currMoney: number;
    maxMoney: number;
    weakenTime: number;
    reqHackSkill: number;
    hackTime: number;
    growTime: number;
    targetValue: number;
}

export interface RunnerInfo {
    hostname: string;
    freeRam: number;
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
    timestamp: number,
    eventType: EventType;
    hostname: string;
    target: string;
    extra?: string;

}

export interface Task {
    taskType: TaskType;
    hostname: string;
    threadsNeeded: number;
    allocatedThreads: ServerThreads[];
}

export interface IServerNode {
    hostname: string;
    parent?: IServerNode;
    children: IServerNode[];
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
    name: string;
    cost: number;
    createSkill: number;
}

export type RunMode = 'normal' | 'takeall' | 'share';

export interface IGlobalSettings {
    isDebug?: boolean;
}

export interface ITargetWorkInfo {
    readyForBatch: boolean;
    target: ServerInfo;
    threadInfos: { [key: string]: ThreadInfo };
    //weakenThreadsNeeded: ThreadInfo,
    //growThreadsNeeded: ThreadInfo;
}

export interface ThreadInfo {
    task: TaskType;
    inProgress: number;
    moreNeeded: number;
    total: number;//this value will increase as grow happens
}

export interface ICompanyJob {
    copmpanyName: string,
    jobName: string;
}
