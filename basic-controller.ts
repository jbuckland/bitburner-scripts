import {doBatch, makeBatchRequest} from './batch';
import {DebugLevel, HOME, INDENT_STRING, SCRIPTS} from './consts';
import {NS, ProcessInfo} from './NetscriptDefinitions';
import {ITargetWorkInfo, TaskCategory, TaskType, ThreadInfo} from './types';
import {
    debugLog,
    formatBigNumber,
    formatBigRam,
    getAllRunnerNames,
    getAllRunners,
    getFirstAvailableRunnerForScript,
    getPlayerControllerScript,
    getPlayerTools,
    getRandomId,
    getServerFreeRam,
    getSettings,
    getThreadsAvailableForScript,
    round,
    runHack,
    timestamp
} from './utils';
import {getThreadsNeededForTask, getWorkInfo, isReadyForBatch, updateThreadInfo} from './utils-controller';

const SLEEP_TIME = 2000;
const FRACTION_TO_USE_FOR_SHARE = 0.5;
const FRACTION_TO_USE_FOR_EXTRA_EXP = .5;

const OK_PERCENT = 0.3; //stats are allowed to be within 20% and be ok


export async function main(ns: NS) {

    ns.disableLog('ALL');
    ns.tail();

    runInitialScripts();

    while (true) {
        ns.print('');

        startBestPlayerController();

        let moneyForHomeServerNeeded = 0;
        let moneyForAugmentationNeeded = 0;
        let moneyForDWToolNeeded = 0;


        let targetWorkInfos = getWorkInfo(ns);

        let readyForBatchCount = 0;
        let batchSuccesses = 0
        if (targetWorkInfos.length > 0) {
            let workReadyForBatch = targetWorkInfos.filter(w => isReadyForBatch(w));

            if (workReadyForBatch.length > 0) {

                batchSuccesses = await doBatches(workReadyForBatch);
                //batchSuccesses = await doMaxBatches(workReadyForBatch);
            } else {
                let minHackTarget = targetWorkInfos.find(w => !isReadyForBatch(w));
                if (minHackTarget) {
                    doMinimalHacking(minHackTarget);
                }
            }

            //only prep targets when we have
            let numberToPrep = Math.floor(readyForBatchCount / 2.0)
            numberToPrep = 50;

            readyForBatchCount = workReadyForBatch.length;
            if (readyForBatchCount === 0) {
                numberToPrep = 99999
            }

            prepTargets(targetWorkInfos, Math.max(4, numberToPrep));

        }
        if (batchSuccesses > 0) {

            let tools = getPlayerTools(ns);
            let hasMainTools = tools.sql && tools.brute && tools.ftp && tools.http;
            if (hasMainTools) {
                await doExtra();
            }
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


    function prepTargets(targetWork: ITargetWorkInfo[], countToPrep: number) {
        let weakenThreadsStarted = 0;
        let growThreadsStarted = 0;

        let count = Math.min(targetWork.length, countToPrep);

        for (let i = 0; i < count; i++) {
            const work = targetWork[i];

            weakenThreadsStarted += useAvailableRunnersForWork(work.target.hostname, SCRIPTS.weaken, work.threadInfos[TaskType.weaken], 1);

            growThreadsStarted += useAvailableRunnersForWork(work.target.hostname, SCRIPTS.grow, work.threadInfos[TaskType.grow], 1);
        }

        ns.print(`${timestamp()} Prep threads started: W:${weakenThreadsStarted}, G:${growThreadsStarted}`);

    }

    async function doMaxBatches(targetWork: ITargetWorkInfo[]): Promise<number> {


        let totalSuccessfulBatchCount = 0;
        let totalBatchRamUsed = 0;

        let successfulBatchesThisRun = 0;

        let batchPassCount = 0;

        let batchRunThisPass = false;

        ns.print(`${timestamp()} Running batches!`);

        do {
            batchPassCount++;
            batchRunThisPass = false;
            successfulBatchesThisRun = 0;


            for (let i = 0; i < targetWork.length; i++) {
                const work = targetWork[i];

                if (isReadyForBatch(work)) {

                    let batchRequest = makeBatchRequest(ns, work.target.hostname);
                    let success = doBatch(ns, work.target.hostname);
                    if (success) {
                        totalSuccessfulBatchCount++;
                        successfulBatchesThisRun++;
                        totalBatchRamUsed += batchRequest.totalRamNeeded;
                        batchRunThisPass = true;
                    }
                }

            }
            if (successfulBatchesThisRun > 0) {
                ns.print(`${timestamp()}${INDENT_STRING} Pass Batch #${batchPassCount}: Started: ${successfulBatchesThisRun}`);
            }

            await ns.sleep(50);


        } while (batchRunThisPass)

        ns.print(`${timestamp()} Total Batches: Started: ${totalSuccessfulBatchCount}, ${formatBigRam(totalBatchRamUsed)}, Passes: ${batchPassCount}`);

        return totalSuccessfulBatchCount;
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

    async function doExtra() {
        let shareThreads = 0;
        let expGainThreads = 0;

        let settings = getSettings(ns);

        if (settings.share) {
            shareThreads = await doExtraShare();
        }

        if (settings.expGain) {
            expGainThreads = await doExtraGainExp();
        }


        let shareRam = shareThreads * ns.getScriptRam(SCRIPTS.share);
        ns.print(`${timestamp()} Share threads: ${formatBigNumber(shareThreads)}, ${formatBigRam(shareRam)}`);

        ns.print(`${timestamp()} Exp threads: ${formatBigNumber(expGainThreads)}`);

    }

    async function doExtraShare(): Promise<number> {
        let shareThreads = 0;

        let player = ns.getPlayer();
        if (player.isWorking && player.currentWorkFactionName) {

            let runners = getAllRunners(ns);
            for (let i = 0; i < runners.length; i++) {
                const runner = runners[i];
                let availableThreads = getThreadsAvailableForScript(ns, runner.hostname, SCRIPTS.share);

                let threadsToRun = Math.floor(availableThreads * FRACTION_TO_USE_FOR_SHARE);
                if (threadsToRun > 0) {
                    debugLog(ns, DebugLevel.info, `starting ${threadsToRun} share threads!`)
                    ns.exec(SCRIPTS.share, runner.hostname, threadsToRun, getRandomId());
                }
                shareThreads += threadsToRun;
            }

        }
        return shareThreads;
    }

    async function doExtraGainExp(): Promise<number> {
        let extraThreads = 0;

        let player = ns.getPlayer();
        let target = 'joesguns';
        let runners = getAllRunners(ns);
        for (let i = 0; i < runners.length; i++) {
            const runner = runners[i];
            let availableThreads = getThreadsAvailableForScript(ns, runner.hostname, SCRIPTS.grow);

            let threadsToRun = Math.floor(availableThreads * FRACTION_TO_USE_FOR_EXTRA_EXP);
            if (threadsToRun > 0) {
                ns.exec(SCRIPTS.grow, runner.hostname, threadsToRun, target, getRandomId());
            }
            extraThreads += threadsToRun;
        }


        return extraThreads;

        /*
                let expThreads = 0;
                let currHacking = ns.getPlayer().hacking;
                let maxHackNeeded = getMaxHackingNeededForBitNode(ns);

                if (currHacking < maxHackNeeded) {
                    debug(ns, `Still need more exp! ${currHacking}/${maxHackNeeded}`);
                    //let target = 'joesguns';

                    if (ns.hasRootAccess(target)) {
                        let weakenThreads = getThreadsNeededToWeakenHost(ns, target);
                        weakenThreads = Math.min(weakenThreads, getThreadsAvailableForScript(ns, HOME, SCRIPTS.weaken));
                        if (weakenThreads > 0) {
                            runWeaken(ns, HOME, target, weakenThreads);
                        }

                        let keepGoing = true;
                        let count = 0;
                        while (keepGoing) {
                            let runner = getFirstAvailableRunnerForScript(ns, SCRIPTS.grow);
                            if (runner) {

                                let availableThreads = getThreadsAvailableForScript(ns, runner, SCRIPTS.grow);
                                let threadsToRun = round(availableThreads * FRACTION_TO_USE_FOR_EXTRA_EXP);
                                //debugLog(ns, DebugLevel.info, `EXTRA Gaining exp! (t=${threadsToRun}, runner=${runner})`);
                                ns.exec(SCRIPTS.grow, runner, threadsToRun, target, getRandomId());
                                expThreads += threadsToRun;

                            } else {
                                keepGoing = false;
                            }
                            count++;
                            if (count > 10) {
                                keepGoing = false;
                            }

                            await ns.sleep(5);

                        }
                    }
                }
                return expThreads;*/
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


    function analyzeRunningThreads(workInfo: ITargetWorkInfo[]) {
        //find existing threads that are currently running on each Runner
        let runnerNames = getAllRunnerNames(ns);
        for (let i = 0; i < runnerNames.length; i++) {
            const runnerName = runnerNames[i];

            let processes: ProcessInfo[] = ns.ps(runnerName);
            for (let j = 0; j < processes.length; j++) {
                const process = processes[j];
                let scriptName = process.filename;

                let taskType: TaskType | undefined;
                let taskCategory: TaskCategory | undefined;

                //prep work (and exp)
                if (scriptName === SCRIPTS.grow) {
                    taskType = TaskType.grow;
                    taskCategory = TaskCategory.prep;
                } else if (scriptName === SCRIPTS.weaken) {
                    taskType = TaskType.weaken;
                    taskCategory = TaskCategory.prep;
                } else if (scriptName === SCRIPTS.hack) {
                    taskType = TaskType.hack;
                    taskCategory = TaskCategory.prep;
                }
                ///batch work
                else if (scriptName === SCRIPTS.batchGrow) {
                    taskType = TaskType.batchGrow;
                    taskCategory = TaskCategory.batch;
                } else if (scriptName === SCRIPTS.batchWeaken) {
                    taskType = TaskType.batchWeaken;
                    taskCategory = TaskCategory.batch;
                } else if (scriptName === SCRIPTS.batchHack) {
                    taskType = TaskType.batchHack;
                    taskCategory = TaskCategory.batch;
                }
                //////
                else if (scriptName === SCRIPTS.share) {
                    taskCategory = TaskCategory.share;
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

