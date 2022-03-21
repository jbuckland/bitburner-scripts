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
}

export interface RunnerInfo {
    hostname: string;
    freeRam: number;
}

export type TaskType = 'hack' | 'weaken' | 'grow';

export interface ServerThreads {
    hostname: string;
    pid: number;
    threadCount: number;

}

export type EventType = 'hackComplete' | 'weakenComplete' | 'growComplete';

export interface ServerEvent {
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

export interface IHackFaction extends IFaction {
    hostname: string;
}

export interface ICityFaction extends IFaction {
    homeCity: string;
}

export interface ICompanyFaction extends IFaction {
    name: string;
    hostname: string;
    city: string;
}

export interface IDarkwebTool {
    name: string;
    cost: number;
    createSkill: number;
}

export type TOAST_VARIANT = 'success' | 'info' | 'warning' | 'error';

export type RunMode = 'normal' | 'takeall' | 'share';

export interface IGlobalSettings {
    mode: RunMode;
}