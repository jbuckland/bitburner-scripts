import {doBatch, makeBatchRequest} from './batch';
import {DebugLevel, HOME, SCRIPTS} from './consts';
import {NS, ProcessInfo} from './NetscriptDefinitions';
import {ITargetWorkInfo, TaskType, ThreadInfo} from './types';
import {
    debugLog,
    formatBigRam,
    getAllRunnerNames,
    getAllServerInfo,
    getFirstAvailableRunnerForScript,
    getPlayerControllerScript,
    getPriorityServers,
    getRandomId,
    getServerFreeRam,
    getThreadsAvailableForScript,
    runHack,
    timestamp,
    writeTargetStats
} from './utils';
import {getThreadsNeededForTask} from './utils-controller';

const SLEEP_TIME = 2000;
const FRACTION_TO_USE_FOR_SHARE = 0.75;
const FRACTION_TO_USE_FOR_EXTRA_EXP = .5;

const OK_PERCENT = 0.3; //stats are allowed to be within 20% and be ok



export async function main(ns: NS) {

    ns.disableLog('ALL');
    ns.tail();

    runInitialScripts();


    while (true) {
        ns.print('');

        startBestPlayerController();

        let targetWorkInfos = getWorkInfo();

        writeTargetStats(ns, targetWorkInfos);

        if (targetWorkInfos.length > 0) {

            let readyForBatchCount = 0;

            readyForBatchCount = await doBatches(targetWorkInfos);
            if (readyForBatchCount === 0) {
                let minHackTarget = targetWorkInfos.find(w => !isReadyForBatch(w));
                if (minHackTarget) {
                    doMinimalHacking(minHackTarget);
                }

            }

            prepTargets(targetWorkInfos, readyForBatchCount);

        }
        killUnneededThreads(targetWorkInfos);


        await ns.sleep(SLEEP_TIME);
    }


    function killUnneededThreads(targetWorkInfos: ITargetWorkInfo[]) {
        let EXTRA_THREAD_LIMIT = 50;


        //if we need 0 grow, we can kill off any grow threads for this target

        for (let i = 0; i < targetWorkInfos.length; i++) {
            const work = targetWorkInfos[i];
            let targetName = work.target.hostname;


            if (targetName !== 'joesguns') {

                let growThreads = work.threadInfos[TaskType.grow];
                if (growThreads.total === 0 && growThreads.inProgress > EXTRA_THREAD_LIMIT) {

                    debugLog(ns, DebugLevel.warn, `We have ${growThreads.inProgress} too many grow threads on [${targetName}]. Let's kills them!!!!!`);
                    let runnerNames = getAllRunnerNames(ns);
                    for (let j = 0; j < runnerNames.length; j++) {
                        const runnerName = runnerNames[j];

                        let procs = ns.ps(runnerName);

                        for (let k = 0; k < procs.length; k++) {
                            const p = procs[k];

                            if (p.filename === SCRIPTS.grow) {
                                let target = p.args[0];
                                if (target === targetName) {
                                    ns.scriptKill(SCRIPTS.grow, runnerName);
                                }
                            }

                        }



                    }

                }

            }



        }



    }


    function doMinimalHacking(targetInfo: ITargetWorkInfo) {
        //hack something!
        let runner = getFirstAvailableRunnerForScript(ns, SCRIPTS.hack);
        if (runner) {
            debugLog(ns, DebugLevel.info, `No batches this pass, so let's hack [${targetInfo.target.hostname}]!`);

            let target = targetInfo.target.hostname;
            runHack(ns, runner, target, 1);
        } else {
            debugLog(ns, DebugLevel.warn, `No batches, but no runner for even a single hack!`);

        }
    }


    function prepTargets(targetWork: ITargetWorkInfo[], readyForBatchCount: number) {
        let weakenThreadsStarted = 0;
        let growThreadsStarted = 0;

        for (let i = 0; i < targetWork.length; i++) {
            const work = targetWork[i];

            weakenThreadsStarted += useAvailableRunnersForWork(work.target.hostname, SCRIPTS.weaken, work.threadInfos[TaskType.weaken], 1);

            growThreadsStarted += useAvailableRunnersForWork(work.target.hostname, SCRIPTS.grow, work.threadInfos[TaskType.grow], 1);

            if (weakenThreadsStarted + growThreadsStarted > 0) {
                if (readyForBatchCount > 2) {
                    break;
                }

            }

        }

        ns.print(`${timestamp()} Prep threads started: W:${weakenThreadsStarted}, G:${growThreadsStarted}`);

    }

    async function doBatches(targetWork: ITargetWorkInfo[]): Promise<number> {
        let readyForBatchCount = 0;

        let successfulBatchCount = 0;
        let batchRamUsed = 0;
        for (let i = 0; i < targetWork.length; i++) {
            const work = targetWork[i];

            if (isReadyForBatch(work)) {

                readyForBatchCount++;

                let batchRequest = makeBatchRequest(ns, work.target.hostname);
                let success = doBatch(ns, work.target.hostname);
                if (success) {
                    successfulBatchCount++;
                    batchRamUsed += batchRequest.totalRamNeeded;
                }
            }

        }

        ns.print(`${timestamp()} Batches started: ${successfulBatchCount}, ${formatBigRam(batchRamUsed)}`);

        return readyForBatchCount;
    }

    function isReadyForBatch(workItem: ITargetWorkInfo): boolean {

        return workItem.threadInfos[TaskType.weaken].inProgress === 0 &&
            workItem.threadInfos[TaskType.weaken].total === 0 &&
            workItem.threadInfos[TaskType.grow].inProgress === 0 &&
            workItem.threadInfos[TaskType.grow].total === 0;
    }

    function useAvailableRunnersForWork(target: string, scriptName: string, threadsNeeded: ThreadInfo, workFraction: number = 1): number {

        let threadsStarted = 0;


        if (threadsNeeded.moreNeeded > 0) {

            let continueWork = true;
            while (continueWork) {
                //testing just making a single pass
                continueWork = false;


                let runnerName = getFirstAvailableRunnerForScript(ns, scriptName);
                if (runnerName) {
                    let threadsAvailable = getThreadsAvailableForScript(ns, runnerName, scriptName);

                    let threadsToRun = Math.min(threadsAvailable * workFraction, threadsNeeded.moreNeeded);

                    if (threadsToRun > 0) {

                        //debug(ns, `running '${scriptName}'(t=${threadsToRun}) against [${target}] using [${runnerName}]`);
                        let procId = ns.exec(scriptName, runnerName, threadsToRun, target, getRandomId());
                        if (procId === 0) {
                            debugLog(ns, DebugLevel.error, `tried to run ${scriptName} but process id was 0!`);
                        }
                        threadsStarted += threadsToRun;

                        threadsNeeded.inProgress += threadsToRun;
                        threadsNeeded.moreNeeded -= threadsToRun;



                    } else {
                        continueWork = false;
                    }

                } else {
                    //debug(ns, `No runner available for ${scriptName} on ${target}`);
                    continueWork = false;
                }
            }

        }

        return threadsStarted;
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

        //targetServers = targetServers.filter(s => {
        //    return s.hostname !== 'sigma-cosmetics' && s.hostname !== 'harakiri-sushi';
        //});


        for (let i = 0; i < targetServers.length; i++) {
            const server = targetServers[i];

            let work: ITargetWorkInfo = {target: server, readyForBatch: false, threadInfos: {}};

            work.threadInfos[TaskType.hack] = {task: TaskType.hack, inProgress: 0, moreNeeded: 0, total: 0};

            let growThreadsTotalNeeded = Math.ceil(getThreadsNeededForTask(ns, server, TaskType.grow));
            work.threadInfos[TaskType.grow] = {task: TaskType.grow, inProgress: 0, moreNeeded: growThreadsTotalNeeded, total: growThreadsTotalNeeded};

            let weakenThreadsTotalNeeded = Math.ceil(getThreadsNeededForTask(ns, server, TaskType.weaken));
            work.threadInfos[TaskType.weaken] = {task: TaskType.weaken, inProgress: 0, moreNeeded: weakenThreadsTotalNeeded, total: weakenThreadsTotalNeeded};

            work.threadInfos[TaskType.batchGrow] = {task: TaskType.batchGrow, inProgress: 0, moreNeeded: 0, total: 0};
            work.threadInfos[TaskType.batchWeaken] = {task: TaskType.batchWeaken, inProgress: 0, moreNeeded: 0, total: 0};
            work.threadInfos[TaskType.batchHack] = {task: TaskType.batchHack, inProgress: 0, moreNeeded: 0, total: 0};

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

    function getAverageTargetValue(targetWorkInfos: ITargetWorkInfo[]) {
        let sumTargetValue = 0;
        let doneCount = 0;
        for (let i = 0; i < targetWorkInfos.length; i++) {
            const w = targetWorkInfos[i];
            if (w.readyForBatch) {
                sumTargetValue += w.target.targetValue;
                doneCount++;
            }
        }

        return (sumTargetValue / doneCount);

    }


    function runInitialScripts() {
        ns.run(SCRIPTS.addScripts);
        ns.run(SCRIPTS.autoNuke);
        //ns.run(SCRIPTS.getScriptStats);
        ns.run(SCRIPTS.targetStats);
        ns.run(SCRIPTS.debugWatcher);
        ns.run(SCRIPTS.playerController);
    }

    function startBestPlayerController() {

        //Order here is best to weakest
        let playerControllers: { name: string, ramReq: number, isRunning: boolean }[] = [
            {name: SCRIPTS.playerController, ramReq: 0, isRunning: false},
            {name: SCRIPTS.playerController0, ramReq: 0, isRunning: false},
            {name: SCRIPTS.playerController1, ramReq: 0, isRunning: false},
            {name: SCRIPTS.playerController2, ramReq: 0, isRunning: false}
        ];

        for (let i = 0; i < playerControllers.length; i++) {
            const controller = playerControllers[i];
            controller.ramReq = ns.getScriptRam(controller.name);
            controller.isRunning = ns.isRunning(controller.name, HOME);
        }

        playerControllers.sort((a, b) => {
            return b.ramReq - a.ramReq;
        });

        let runningControllers = playerControllers.filter(cont => cont.isRunning);

        if (runningControllers.length === 0) {

            //start the best one we can

            let controllerScript = getPlayerControllerScript(ns);
            if (controllerScript) {
                ns.run(controllerScript);
            }
            {
                debugLog(ns, DebugLevel.error, `No player controller script returned!`);
            }



        } else if (runningControllers.length > 0) {
            //kill all but the best
            for (let i = 1; i < runningControllers.length; i++) {
                const cont = runningControllers[i];
                ns.print(`Killing extra controller! ${cont.name}`);
                ns.scriptKill(cont.name, HOME);
            }

            //see if we can run a better one
            let currentController = runningControllers[0];


        } else {
            //length is <0?!?
        }

        for (let i = 0; i < playerControllers.length; i++) {
            const cont = playerControllers[i];

            if (ns.isRunning(cont.name, HOME)) {

                //If the best one is running, we don't need to keep checking
                if (i !== 0) {
                    //if this one is running, could we run one better (if we kill this one)?
                    let betterController = playerControllers[i - 1];
                    let freeRam = getServerFreeRam(ns, HOME);
                    if ((freeRam + cont.ramReq) >= betterController.ramReq) {

                        ns.scriptKill(cont.name, HOME);
                        ns.run(betterController.name);

                    }
                    //either way, we can stop checking
                    break;

                } else {
                    //we're done here
                    break;
                }

            }

        }

    }
}

