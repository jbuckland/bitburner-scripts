import { doBatch } from './batch';
import { HOME, SCRIPTS } from './consts';
import { NS, ProcessInfo } from './NetscriptDefinitions';
import { ITargetWorkInfo, TaskType, ThreadInfo } from './types';
import {
    debug, getAllRunnerNames, getAllServerInfo, getFirstAvailableRunnerForScript, getPriorityServers, getRandomId, getThreadsAvailableForScript,
    getThreadsNeededToWeakenHost, round, runWeaken, timestamp, writeTargetStats
} from './utils';
import { getThreadsNeededForTask } from './utils-controller';

const SLEEP_TIME = 500;
const FRACTION_TO_USE_FOR_SHARE = 0.9;
const FRACTION_TO_USE_FOR_EXTRA_EXP = .1;

const OK_PERCENT = 0.3; //stats are allowed to be within 20% and be ok
export async function main(ns: NS) {

    let flags = ns.flags([
        ['mode', 'normal'],
        ['debug', false]
    ]);
    let DEBUG = flags.debug;

    ns.disableLog('ALL');
    ns.tail();

    runInitialScripts();

    let mainHackThreads = 4;

    while (true) {
        let targetWorkInfos = getWorkInfo();

        await updateWorkInfo(targetWorkInfos);

        await doBatches(targetWorkInfos);

        prepTargets(targetWorkInfos);

        doExtra();

        //let firstTarget = prepWork[0];
        //doWorkCheck(firstTarget);

        await ns.sleep(SLEEP_TIME);
    }

    async function updateWorkInfo(targetWork: ITargetWorkInfo[]) {

        //evaluate and record remaining work on all targets
        //taking into account current work on each target

        //targetWork = targetWork.filter(w => { return w.target.hostname === 'harakiri-sushi'; });

        targetWork.sort((a, b) => {

            return (b.readyForBatch ? 1 : 0) - (a.readyForBatch ? 1 : 0) ||
                b.target.targetValue - a.target.targetValue ||
                a.target.currSecurity - b.target.currSecurity;
        });

        await writeTargetStats(ns, targetWork);

        let sumTargetValue = 0;
        let doneCount = 0;
        for (let i = 0; i < targetWork.length; i++) {
            const w = targetWork[i];
            if (w.readyForBatch) {
                sumTargetValue += w.target.targetValue;
                doneCount++;
            }
        }

        let avgTargetValue = sumTargetValue / doneCount;
        ns.print(`${timestamp()} Avg. Target Value: ${round(avgTargetValue, 2)}`);
    }

    function prepTargets(targetWork: ITargetWorkInfo[]) {
        for (let i = 0; i < targetWork.length; i++) {
            const work = targetWork[i];

            useAvailableRunnersForWork(work.target.hostname, SCRIPTS.weaken, work.threadInfos[TaskType.weaken]);

            useAvailableRunnersForWork(work.target.hostname, SCRIPTS.grow, work.threadInfos[TaskType.grow]);

        }
    }

    async function doBatches(targetWork: ITargetWorkInfo[]) {
        for (let i = 0; i < targetWork.length; i++) {
            const work = targetWork[i];

            if (isReadyForBatch(work)) {
                let success = doBatch(ns, work.target.hostname);
            }

        }

    }

    function doExtra() {

        doExtraShare();
        doExtraGainExp();
    }

    function doExtraShare() {

        let player = ns.getPlayer();
        if (player.isWorking && player.currentWorkFactionName) {
            //get the first server and share half it's current ram
            let runner = getFirstAvailableRunnerForScript(ns, SCRIPTS.share);
            if (runner) {

                let availableThreads = getThreadsAvailableForScript(ns, runner, SCRIPTS.share);

                let threadsToRun = round(availableThreads * FRACTION_TO_USE_FOR_SHARE);
                debug(ns, `${timestamp()} EXTRA sharing! (t=${threadsToRun}, runner=${runner})`);
                ns.exec(SCRIPTS.share, runner, threadsToRun, getRandomId());
            }
        }

    }

    function doExtraGainExp() {
        let target = 'joesguns';

        let weakenThreads = getThreadsNeededToWeakenHost(ns, target);
        weakenThreads = Math.min(weakenThreads, getThreadsAvailableForScript(ns, HOME, SCRIPTS.weaken));
        if (weakenThreads > 0) {
            runWeaken(ns, HOME, target, weakenThreads);
        }

        let runner = getFirstAvailableRunnerForScript(ns, SCRIPTS.grow);
        if (runner) {

            let availableThreads = getThreadsAvailableForScript(ns, runner, SCRIPTS.grow);
            let threadsToRun = round(availableThreads * FRACTION_TO_USE_FOR_EXTRA_EXP);
            debug(ns, `${timestamp()} EXTRA Gaining exp! (t=${threadsToRun}, runner=${runner})`);
            ns.exec(SCRIPTS.grow, runner, threadsToRun, target, getRandomId());

        }

    }

    function doWorkCheck(firstTarget: ITargetWorkInfo) {
        //let's double check that this target is actually 'done'
        if (firstTarget && firstTarget.readyForBatch) {
            let growThreadsTotalNeeded = Math.ceil(getThreadsNeededForTask(ns, firstTarget.target, TaskType.grow));
            let weakenThreadsTotalNeeded = Math.ceil(getThreadsNeededForTask(ns, firstTarget.target, TaskType.weaken));

            let securityOverPercent = (firstTarget.target.currSecurity / firstTarget.target.minSecurity);
            let moneyUnderPercent = firstTarget.target.currMoney / firstTarget.target.maxMoney;

            let securityOk = securityOverPercent < (1 + OK_PERCENT);
            let moneyOk = moneyUnderPercent > (1 - OK_PERCENT);

            firstTarget.readyForBatch = securityOk && moneyOk;

            let growString = `G: ${firstTarget.threadInfos[TaskType.grow].inProgress}/${growThreadsTotalNeeded} ${(round(moneyUnderPercent * 100))}%`;
            let weakenString = `W: ${firstTarget.threadInfos[TaskType.weaken].inProgress}/${weakenThreadsTotalNeeded} ${(round(securityOverPercent * 100))}%`;

            ns.print(`${timestamp()} Checking [${firstTarget.target.hostname}], ${growString}, ${weakenString}`);
        }
    }

    function isReadyForBatch(workItem: ITargetWorkInfo): boolean {

        return workItem.threadInfos[TaskType.weaken].inProgress === 0 &&
            workItem.threadInfos[TaskType.weaken].total === 0 &&
            workItem.threadInfos[TaskType.grow].inProgress === 0 &&
            workItem.threadInfos[TaskType.grow].total === 0;
    }

    function useAvailableRunnersForWork(target: string, scriptName: string, threadsNeeded: ThreadInfo) {
        if (threadsNeeded.moreNeeded > 0) {

            let continueWork = true;
            while (continueWork) {
                let runnerName = getFirstAvailableRunnerForScript(ns, scriptName);
                if (runnerName) {
                    let threadsAvailable = getThreadsAvailableForScript(ns, runnerName, scriptName);

                    let threadsToRun = Math.min(threadsAvailable, threadsNeeded.moreNeeded);

                    if (threadsToRun > 0) {

                        if (DEBUG) ns.print(`running '${scriptName}'(t=${threadsToRun}) against [${target}] using [${runnerName}]`);
                        let procId = ns.exec(scriptName, runnerName, threadsToRun, target, getRandomId());
                        if (procId === 0) {
                            ns.print(`ERROR! tried to run ${scriptName} but process id was 0!`);
                        }

                        threadsNeeded.inProgress += threadsToRun;
                        threadsNeeded.moreNeeded -= threadsToRun;

                    } else {
                        continueWork = false;
                    }

                } else {
                    if (DEBUG) ns.print(`No runner available for ${scriptName} on ${target}`);
                    continueWork = false;
                }
            }

        }
    }

    function updateThreadInfo(workItem: ITargetWorkInfo, task: TaskType, process: ProcessInfo) {
        let threadCount = process.threads;
        let threadInfo = workItem.threadInfos[task];
        threadInfo.inProgress += threadCount;
        threadInfo.moreNeeded = threadInfo.total - threadInfo.inProgress;
    }

    function getWorkInfo(): ITargetWorkInfo[] {

        let workInfo: ITargetWorkInfo[] = [];

        //we start with the data from last pass
        let targetServers = getPriorityServers(ns, getAllServerInfo(ns));

        for (let i = 0; i < targetServers.length; i++) {
            const server = targetServers[i];

            let work: ITargetWorkInfo = { target: server, readyForBatch: false, threadInfos: {} };

            work.threadInfos[TaskType.hack] = { task: TaskType.hack, inProgress: 0, moreNeeded: 0, total: 0 };

            let growThreadsTotalNeeded = Math.ceil(getThreadsNeededForTask(ns, server, TaskType.grow));
            work.threadInfos[TaskType.grow] = { task: TaskType.grow, inProgress: 0, moreNeeded: growThreadsTotalNeeded, total: growThreadsTotalNeeded };

            let weakenThreadsTotalNeeded = Math.ceil(getThreadsNeededForTask(ns, server, TaskType.weaken));
            work.threadInfos[TaskType.weaken] = { task: TaskType.weaken, inProgress: 0, moreNeeded: weakenThreadsTotalNeeded, total: weakenThreadsTotalNeeded };

            work.threadInfos[TaskType.batchGrow] = { task: TaskType.batchGrow, inProgress: 0, moreNeeded: 0, total: 0 };
            work.threadInfos[TaskType.batchWeaken] = { task: TaskType.batchWeaken, inProgress: 0, moreNeeded: 0, total: 0 };
            work.threadInfos[TaskType.batchHack] = { task: TaskType.batchHack, inProgress: 0, moreNeeded: 0, total: 0 };

            workInfo.push(work);

        }
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
                        ns.print(`ERROR! didn't find a PrepWork item for ${targetName}!`);
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

        return workInfo;
    }

    function runInitialScripts() {
        ns.run('addScripts.js');
        ns.run('player-controller.js');
        ns.run('autoNuke.js');
        ns.run('getRunnerStats.js', 1, '--refresh');
        ns.run('getStats.js', 1, '--refresh');
    }
}

