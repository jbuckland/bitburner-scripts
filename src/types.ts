import {CodingContractType, CrimeMode, DebugLevel, EventType, HacknetMode} from 'lib/consts';
import {GangOtherInfoObject} from 'NetscriptDefinitions';

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

export interface IGlobalSettings {
    doRunnerWork?: boolean;
    doHackingWork?: boolean;
    debug?: boolean;
    hackPercent?: number;
    ramBuffer?: number;
    crimeMode?: CrimeMode;
    hacknetMode?: HacknetMode;
    maxHashCostBen?: number;
    moneyBuffer?: number;
    autoStartWork?: boolean;
    forceSwitchWork?: boolean;

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
    batchId: string,
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

export interface IControllerConfig {
    scriptName: string;
    sequenceNumber: number;
    ramBuffer: number;
    ramReq: number;
}

export type OtherGangInfo = GangOtherInfoObject & { name: string, winChance: number }

export interface INetscriptExtra {
    heart: {
        /**
         * show player's current karma
         */
        break(): number;
    };

    alterReality(): void;

    bypass(doc: Document): void;

    exploit(): void;

    rainbow(guess: string): void;
}

/**
 * These are limits. If the total is >100, it's not a huge deal
 */
export interface IRamUsageSettings {
    batchPct: number;
    prepPct: number;
    sharePct: number;
    expPct: number;

}

export type FlagSchema = [string, string | number | boolean | string[]][]

export interface IRunnerJob {
    runner: string;
    scriptName: string;
    threads: number,
    ramUsed: number,
    args: any[]
}

export interface IContract {
    filename: string;
    host: string;
    type: CodingContractType;
    targetFaction?: string;
}


export interface IAugmentationInfo {
    name: string,
    price: number,
    baseRepCost: number,
    baseAdditionalRepCost: number,
    totalRepMult: number,
    adjustedAdditionalRepCost: number
}
