import {DebugLevel, SCRIPTS} from './consts';
import {NS, ProcessInfo, RunningScript} from './NetscriptDefinitions';
import {ITargetWorkInfo, ServerInfo, Task, TaskType} from './types';
import {
    debugLog,
    getAllHosts,
    getAllRunnerNames,
    getAllServerInfo,
    getPriorityServers,
    getThreadsNeededToGrowHost,
    getThreadsNeededToHackAllHost,
    getThreadsNeededToWeakenHost
} from './utils';

const MIN_MONEY = 5000;
const HACK_FRACTION_INITIAL: number = 0.1; //what percent to take when hacking

export function updateTaskList(ns: NS, taskList: Task[]) {
    //first clear out any processes we know about that are no longer running
    for (let i = 0; i < taskList.length; i++) {
        let task = taskList[i];

        if (task.allocatedThreads && task.allocatedThreads.length > 0) {

            task.allocatedThreads = task.allocatedThreads.filter(allocThread => {
                return ns.isRunning(allocThread.pid, allocThread.hostname);
            });

        }

    }

    //next, record any processes we didn't already know about
    for (let i = 0; i < getAllHosts(ns).length; i++) {
        let host = getAllHosts(ns)[i];

        //look for SCRIPTS.weaken
        let weakenScriptInfo: RunningScript = ns.getRunningScript(SCRIPTS.weaken, host);
        if (weakenScriptInfo && weakenScriptInfo.threads > 0) {

            let weakenTarget = weakenScriptInfo.args[0];
            let weakenTask = taskList.find(t => t.hostname === weakenTarget);
            if (!weakenTask) {
                weakenTask = {
                    hostname: weakenTarget,
                    taskType: TaskType.weaken,
                    threadsNeeded: getThreadsNeededToWeakenHost(ns, weakenTarget),
                    allocatedThreads: []
                };
            }
            if (!weakenTask.allocatedThreads.find(t => t.pid === weakenScriptInfo.pid)) {
                ns.print(`${host} was running ${SCRIPTS.weaken} and we didn't know about it! Logging it`, weakenScriptInfo);

                weakenTask.allocatedThreads.push({
                    hostname: weakenScriptInfo.server,
                    pid: weakenScriptInfo.pid,
                    threadCount: weakenScriptInfo.threads
                });
            }

        }

        //look for SCRIPTS.grow
        let growScriptInfo: RunningScript = ns.getRunningScript(SCRIPTS.grow, host);
        if (growScriptInfo && growScriptInfo.threads > 0) {

            let growTarget = growScriptInfo.args[0];
            let growTask = taskList.find(t => t.hostname === growTarget);
            if (!growTask) {
                growTask = {
                    hostname: growTarget,
                    taskType: TaskType.grow,
                    threadsNeeded: getThreadsNeededToGrowHost(ns, growTarget),
                    allocatedThreads: []
                };
            }
            if (!growTask.allocatedThreads.find(t => t.pid === growScriptInfo.pid)) {
                ns.print(`${host} was running ${SCRIPTS.grow} and we didn't know about it! Logging it`, growScriptInfo);

                growTask.allocatedThreads.push({
                    hostname: growScriptInfo.server,
                    pid: growScriptInfo.pid,
                    threadCount: growScriptInfo.threads
                });
            }

        }

        //look for SCRIPTS.hack
        let hackScriptInfo: RunningScript = ns.getRunningScript(SCRIPTS.hack, host);
        if (hackScriptInfo && hackScriptInfo.threads > 0) {

            let hackTarget = hackScriptInfo.args[0];
            let hackTask = taskList.find(t => t.hostname === hackTarget);

            if (!hackTask) {
                hackTask = {
                    hostname: hackTarget,
                    taskType: TaskType.hack,
                    threadsNeeded: getThreadsNeededToHackAllHost(ns, hackTarget),
                    allocatedThreads: []
                };
            }

            //if we don't already know about this process, log it
            if (!hackTask.allocatedThreads.find(t => t.pid === hackScriptInfo.pid)) {
                ns.print(`${host} was running ${SCRIPTS.hack} and we didn't know about it! Logging it`, hackScriptInfo);

                hackTask.allocatedThreads.push({
                    hostname: hackScriptInfo.server,
                    pid: hackScriptInfo.pid,
                    threadCount: hackScriptInfo.threads
                });
            }

        }
    }

}

export function getThreadsNeededForTask(ns: NS, serverInfo: ServerInfo, taskType: TaskType): number {
    if (taskType === 'grow') {
        return getThreadsNeededToGrow(ns, serverInfo);
    } else if (taskType === 'hack') {
        return getThreadsNeededToHack(ns, serverInfo, HACK_FRACTION_INITIAL);
    } else if (taskType === 'weaken') {
        return getThreadsNeededToWeaken(ns, serverInfo);
    } else {
        return 0;
    }
}

export function getThreadsNeededToWeaken(ns: NS, serverInfo: ServerInfo): number {
    let secLevelToWeaken = (serverInfo.currSecurity ?? 0) - (serverInfo.minSecurity ?? 0);

    let threadsPerSecLevel = 1 / ns.weakenAnalyze(1);

    let totalThreadsNeeded = Math.ceil(secLevelToWeaken * threadsPerSecLevel);

    return totalThreadsNeeded;

}

export function getThreadsNeededToGrow(ns: NS, target: ServerInfo): number {
    //example
    //max = 1000
    //curr = 250    
    //needed = 1000-250 = 750
    //growthMultiplier = (750/250)+1 = (3)+1 = 4

    let neededMoney = target.maxMoney - target.currMoney;

    let growthMultiplier = (neededMoney / (target.currMoney || 1)) + 1;

    let threadsNeeded = Math.ceil(ns.growthAnalyze(target.hostname, growthMultiplier));
    return threadsNeeded;
}

export function getThreadsNeededToHack(ns: NS, serverInfo: ServerInfo, fractionDesired: number): number {

    let serverMoney = ns.getServerMoneyAvailable(serverInfo.hostname);

    let minMoneyThreshold = getMinMoneyThreshold(ns, serverInfo);

    let fractionForOneThread = ns.hackAnalyze(serverInfo.hostname);

    //example
    //fractionDesired = 0.1 //I want to take 10% of what it currently has
    //fractionForOneThread 0.0025 //hacking with one thread will take 0.25% of current money
    //threadsNeeded = 0.1 / 0.0025 = 40 threads needed

    let threadsNeeded = fractionDesired / fractionForOneThread;

    return Math.ceil(threadsNeeded);

}

export function getMinMoneyThreshold(ns: NS, serverInfo: ServerInfo): number {
    let minMoneyThreshold = (MIN_MONEY * serverInfo.minSecurity);

    return minMoneyThreshold;
}

export function getNumRunningThreads(ns: NS, taskList: Task[], serverInfo: ServerInfo, type: TaskType): number {
    let threads = 0;

    let tasks = taskList.filter(t => t.hostname === serverInfo.hostname && t.taskType == type);

    tasks.forEach(t => {
        t.allocatedThreads.forEach(allocThread => {
            threads += allocThread.threadCount;
        });
    });

    return threads;
}


export function getWorkInfo(ns: NS): ITargetWorkInfo[] {

    let workInfo: ITargetWorkInfo[] = makeWorkInfoForTargets(ns);

    //at this point, we should have a PrepWork item for every target server

    //find existing threads that are currently running on each Runner
    let runnerNames = getAllRunnerNames(ns);
    for (let i = 0; i < runnerNames.length; i++) {
        const runnerName = runnerNames[i];

        let processes: ProcessInfo[] = ns.ps(runnerName);
        for (let j = 0; j < processes.length; j++) {
            const process = processes[j];
            let scriptName = process.filename;

            let taskType: TaskType | undefined;

            if (scriptName === SCRIPTS.grow) {
                taskType = TaskType.grow;
            } else if (scriptName === SCRIPTS.batchGrow) {
                taskType = TaskType.batchGrow;
            } else if (scriptName === SCRIPTS.hack) {
                taskType = TaskType.hack;
            } else if (scriptName === SCRIPTS.batchHack) {
                taskType = TaskType.batchHack;
            } else if (scriptName === SCRIPTS.weaken) {
                taskType = TaskType.weaken;
            } else if (scriptName === SCRIPTS.batchWeaken) {
                taskType = TaskType.batchWeaken;
            }

            if (taskType) {
                let targetName = process.args[0];
                let workItem = workInfo.find(w => w.target.hostname === targetName);
                if (workItem) {
                    updateThreadInfo(workItem, taskType, process);
                } else {
                    //this could happen because we've filtered out this server,
                    //but some other process is running tasks on it
                    debugLog(ns, DebugLevel.warn, `didn't find a PrepWork item for ${targetName}!`);
                }
            } else {
                //some other script we don't care about
            }

        }

    }

    for (let i = 0; i < workInfo.length; i++) {
        const w = workInfo[i];
        if (!w.readyForBatch) {
            w.readyForBatch = isReadyForBatch(w);
        }

    }

    workInfo.sort((a, b) => {
        return (b.readyForBatch ? 1 : 0) - (a.readyForBatch ? 1 : 0) ||
            b.target.targetValue - a.target.targetValue ||
            a.target.currSecurity - b.target.currSecurity;
    });

    return workInfo;
}


export function makeWorkInfoForTargets(ns: NS): ITargetWorkInfo[] {
    let workInfo: ITargetWorkInfo[] = [];

    //we start with the data from last pass
    let targetServers = getPriorityServers(ns, getAllServerInfo(ns));

    //targetServers = targetServers.filter(s => {
    //    return s.hostname !== 'sigma-cosmetics' && s.hostname !== 'harakiri-sushi';
    //});


    for (let i = 0; i < targetServers.length; i++) {
        const server = targetServers[i];

        let work: ITargetWorkInfo = {target: server, readyForBatch: false, threadInfos: {}};

        work.threadInfos[TaskType.hack] = {task: TaskType.hack, inProgress: 0, moreNeeded: 0, total: 0};

        let growThreadsTotalNeeded = Math.ceil(getThreadsNeededForTask(ns, server, TaskType.grow));
        work.threadInfos[TaskType.grow] = {
            task: TaskType.grow,
            inProgress: 0,
            moreNeeded: growThreadsTotalNeeded,
            total: growThreadsTotalNeeded
        };

        let weakenThreadsTotalNeeded = Math.ceil(getThreadsNeededForTask(ns, server, TaskType.weaken));
        work.threadInfos[TaskType.weaken] = {
            task: TaskType.weaken,
            inProgress: 0,
            moreNeeded: weakenThreadsTotalNeeded,
            total: weakenThreadsTotalNeeded
        };

        work.threadInfos[TaskType.batchGrow] = {task: TaskType.batchGrow, inProgress: 0, moreNeeded: 0, total: 0};
        work.threadInfos[TaskType.batchWeaken] = {
            task: TaskType.batchWeaken,
            inProgress: 0,
            moreNeeded: 0,
            total: 0
        };
        work.threadInfos[TaskType.batchHack] = {task: TaskType.batchHack, inProgress: 0, moreNeeded: 0, total: 0};

        workInfo.push(work);

    }
    return workInfo;
}


export function updateThreadInfo(workItem: ITargetWorkInfo, task: TaskType, process: ProcessInfo) {
    let threadCount = process.threads;
    let threadInfo = workItem.threadInfos[task];
    threadInfo.inProgress += threadCount;
    threadInfo.moreNeeded = threadInfo.total - threadInfo.inProgress;
}


export function isReadyForBatch(workItem: ITargetWorkInfo): boolean {

    return workItem.threadInfos[TaskType.weaken].inProgress === 0 &&
        workItem.threadInfos[TaskType.weaken].total === 0 &&
        workItem.threadInfos[TaskType.grow].inProgress === 0 &&
        workItem.threadInfos[TaskType.grow].total === 0;
}