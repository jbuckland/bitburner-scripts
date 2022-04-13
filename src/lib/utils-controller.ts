import { NS, ProcessInfo, RunningScript } from 'NetscriptDefinitions';
import { IControllerConfig, ITargetWorkInfo, ServerInfo, Task, TaskType } from 'types';
import { DebugLevel, HOME, SCRIPTS } from 'lib/consts';
import {
    debugLog,
    getAllHosts,
    getAllRunnerNames,
    getAllServerInfo,
    getServerFreeRam,
    getThreadsNeededToGrowHost,
    getThreadsNeededToHackAllHost,
    getThreadsNeededToWeakenHost,
    makePriorityTargetList
} from 'lib/utils';

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

export function getTargetWorkInfoForTargets(ns: NS, targetServers: ServerInfo[]): ITargetWorkInfo[] {

    let workInfo: ITargetWorkInfo[] = makeBlankWorkInfoForTargets(ns, targetServers);

    //let workInfo: ITargetWorkInfo[] = makeNeededWorkInfoForTargets(ns, targetServers);

    //at this point, we should have a ITargetWorkInfo item for every target server

    updateInProgressWork(ns, workInfo);
    updateNeededWork(ns, workInfo);
    updateReadyForBatch(ns, workInfo);

    workInfo.sort((a, b) => {
        return (b.readyForBatch ? 1 : 0) - (a.readyForBatch ? 1 : 0) ||
            b.target.targetValue - a.target.targetValue ||
            a.target.currSecurity - b.target.currSecurity;
    });

    return workInfo;

}

export function getAllTargetWorkInfo(ns: NS): ITargetWorkInfo[] {
    return getTargetWorkInfoForTargets(ns, getAllServerInfo(ns));
}

export function makeBlankWorkInfoForTargets(ns: NS, targetServers: ServerInfo[]): ITargetWorkInfo[] {

    targetServers = makePriorityTargetList(ns, targetServers);
    let workInfo: ITargetWorkInfo[] = [];

    for (let i = 0; i < targetServers.length; i++) {
        const server = targetServers[i];

        let work: ITargetWorkInfo = { target: server, readyForBatch: false, threadInfos: {} };

        work.threadInfos[TaskType.hack] = { task: TaskType.hack, inProgress: 0, moreNeeded: 0, total: 0 };
        work.threadInfos[TaskType.grow] = { task: TaskType.grow, inProgress: 0, moreNeeded: 0, total: 0 };
        work.threadInfos[TaskType.weaken] = { task: TaskType.weaken, inProgress: 0, moreNeeded: 0, total: 0 };

        work.threadInfos[TaskType.batchGrow] = { task: TaskType.batchGrow, inProgress: 0, moreNeeded: 0, total: 0 };
        work.threadInfos[TaskType.batchWeaken] = { task: TaskType.batchWeaken, inProgress: 0, moreNeeded: 0, total: 0 };
        work.threadInfos[TaskType.batchHack] = { task: TaskType.batchHack, inProgress: 0, moreNeeded: 0, total: 0 };

        workInfo.push(work);

    }
    return workInfo;
}

export function updateInProgressWork(ns: NS, workInfo: ITargetWorkInfo[]) {
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
            } else if (scriptName === SCRIPTS.hack) {
                taskType = TaskType.hack;
            } else if (scriptName === SCRIPTS.weaken) {
                taskType = TaskType.weaken;
            } else if (scriptName === SCRIPTS.batchGrow) {
                taskType = TaskType.batchGrow;
            } else if (scriptName === SCRIPTS.batchHack) {
                taskType = TaskType.batchHack;
            } else if (scriptName === SCRIPTS.batchWeaken) {
                taskType = TaskType.batchWeaken;
            }

            if (taskType) {
                let targetName = process.args[0];
                let workItem = workInfo.find(w => w.target.hostname === targetName);
                if (workItem) {

                    let threadCount = process.threads;
                    let threadInfo = workItem.threadInfos[taskType];
                    threadInfo.inProgress += threadCount;

                } else {
                    //this could happen because we've filtered out this server,
                    //but some other process is running tasks on it
                    //debugLog(ns, DebugLevel.warn, `didn't find a PrepWork item for ${targetName}!`);
                }
            } else {
                //some other script we don't care about
            }

        }

    }
}

export function updateNeededWork(ns: NS, targetWork: ITargetWorkInfo[]) {

    targetWork.forEach(work => {

        //if there are incomplete batches, let's allow it to finish before calculating  needed work
        let batchWorkCount = work.threadInfos[TaskType.batchGrow].inProgress +
            work.threadInfos[TaskType.batchHack].inProgress +
            work.threadInfos[TaskType.batchWeaken].inProgress;

        if (batchWorkCount === 0) {
            let growThreadsTotalNeeded = Math.ceil(getThreadsNeededForTask(ns, work.target, TaskType.grow));
            let threadInfo = work.threadInfos[TaskType.grow];
            threadInfo.total = growThreadsTotalNeeded;
            threadInfo.moreNeeded = threadInfo.total - threadInfo.inProgress;

            let weakenThreadsTotalNeeded = Math.ceil(getThreadsNeededForTask(ns, work.target, TaskType.weaken));
            threadInfo = work.threadInfos[TaskType.weaken];
            threadInfo.total = weakenThreadsTotalNeeded;
            threadInfo.moreNeeded = threadInfo.total - threadInfo.inProgress;
        }

    });

}

export function updateReadyForBatch(ns: NS, workInfo: ITargetWorkInfo[]) {
    workInfo.forEach(w => {
        if (!w.readyForBatch) {
            w.readyForBatch = isReadyForBatch(w);
        }
    });
}

export function makeNeededWorkInfoForTargets(ns: NS, targetServers: ServerInfo[]): ITargetWorkInfo[] {

    targetServers = makePriorityTargetList(ns, targetServers);
    let workInfo: ITargetWorkInfo[] = [];

    for (let i = 0; i < targetServers.length; i++) {
        const server = targetServers[i];

        let work: ITargetWorkInfo = { target: server, readyForBatch: false, threadInfos: {} };

        work.threadInfos[TaskType.hack] = { task: TaskType.hack, inProgress: 0, moreNeeded: 0, total: 0 };

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

        work.threadInfos[TaskType.batchGrow] = { task: TaskType.batchGrow, inProgress: 0, moreNeeded: 0, total: 0 };
        work.threadInfos[TaskType.batchWeaken] = {
            task: TaskType.batchWeaken,
            inProgress: 0,
            moreNeeded: 0,
            total: 0
        };
        work.threadInfos[TaskType.batchHack] = { task: TaskType.batchHack, inProgress: 0, moreNeeded: 0, total: 0 };

        workInfo.push(work);

    }
    return workInfo;
}

export function isReadyForBatch(workItem: ITargetWorkInfo): boolean {
    let target = workItem.target;
    return target.currSecurity === target.minSecurity && target.currMoney === target.maxMoney;

    /*workItem.threadInfos[TaskType.weaken].inProgress === 0 &&
        workItem.threadInfos[TaskType.weaken].total === 0 &&
        workItem.threadInfos[TaskType.grow].inProgress === 0 &&
        workItem.threadInfos[TaskType.grow].total === 0;*/
}

export function startBestController(ns: NS, contConfigs: IControllerConfig[]) {

    //there should only ever be ONE controller of each type running at a time.
    let bestRunning: IControllerConfig | undefined;
    contConfigs.sort((a, b) => b.sequenceNumber - a.sequenceNumber);
    contConfigs.forEach(config => {
        if (ns.scriptRunning(config.scriptName, HOME)) {
            if (bestRunning == undefined) {
                bestRunning = config;
            } else {
                debugLog(ns, DebugLevel.warn, `Found a second running controller of the same type. Killing ${config.scriptName}`);
                ns.scriptKill(config.scriptName, HOME);
            }
        }
    });

    //we're now guaranteed to have at most ONE controller running.

    contConfigs.forEach(cont => {
        cont.ramReq = ns.getScriptRam(cont.scriptName) + cont.ramBuffer;
    });

    //find the first one that's runnable based on home computer ram
    //let homeMaxRam = ns.getServerMaxRam(HOME);
    let currentControllerRamUsage = 0;
    if (bestRunning) {
        currentControllerRamUsage = bestRunning.ramReq;
    }

    let homeFreeRam = getServerFreeRam(ns, HOME);

    //debugLog(ns, DebugLevel.info, `getBestController(): `, {controllers: controllerInfo, homeRam: homeMaxRam});
    let bestControllerConfig = contConfigs.find(c => c.ramReq < homeFreeRam + currentControllerRamUsage);

    if (bestControllerConfig) {
        //debugLog(ns, DebugLevel.info, `Best controller is '${bestControllerConfig.scriptName}'`);
        if (!ns.isRunning(bestControllerConfig.scriptName, HOME)) {

            let procId = ns.exec(bestControllerConfig.scriptName, HOME);
            if (procId > 0) {
                debugLog(ns, DebugLevel.info, `Starting '${bestControllerConfig.scriptName}'`);

            } else {
                debugLog(ns, DebugLevel.error, `Unable to start '${bestControllerConfig.scriptName}'`);
            }

        } else {
            //debugLog(ns, DebugLevel.info, `'${bestController}' already running!`)
        }
    } else {
        //debugLog(ns, DebugLevel.error, `Could not determine best controller!`);
    }
}
