import { NS } from 'NetscriptDefinitions';
import { IBatchRequest, RunnerInfo } from 'types';
import { DebugLevel, SCRIPTS } from 'lib/consts';
import {
    debugLog,
    getAllRunners,
    getFirstRunnerWithFreeRam,
    getRandomId,
    getServerFreeRam,
    getSettings,
    round,
    runBatchGrow,
    runBatchHack,
    runBatchWeaken
} from 'lib/utils';

export async function main(ns: NS) {

    let target = ns.args[0] as string;

    if (!target) {
        ns.tprint('please provide a target hostname!');
        ns.exit();
    }

    //ns.disableLog('ALL');
    ns.disableLog('getServerUsedRam');
    ns.disableLog('getServerMaxRam');

    ns.clearLog();

    let flags = ns.flags([
        ['loop', false],
        ['dryrun', false]
    ]);
    let LOOP = flags.loop;
    let DRY_RUN = flags.dryrun;

    do {
        await doBatch(ns, target);
        await ns.sleep(20);
        ns.print('');
    } while (LOOP);

}

export function makeBatchRequest(ns: NS, target: string): IBatchRequest {
    let TIME_GAP = 30;

    let targetServer = ns.getServer(target);
    let targetHackPercent = getSettings(ns).hackPercent ?? 0;
    let hackAmount = targetServer.moneyAvailable * targetHackPercent;

    //make sure we have enough ram to run ALL the things before we start
    //let hackThreadCount = hackThreads;

    let hackThreadCount = Math.ceil(ns.hackAnalyzeThreads(target, hackAmount));
    let hackSecurityIncrease = ns.hackAnalyzeSecurity(hackThreadCount);
    let hackPartStolen = ns.hackAnalyze(target) * hackThreadCount;
    let hackRamNeeded = ns.getScriptRam(SCRIPTS.batchHack) * hackThreadCount;

    let weakenSingleSecurityDecrease = ns.weakenAnalyze(1);
    let weakenThreadsNeededFromHack = Math.ceil(hackSecurityIncrease / weakenSingleSecurityDecrease);
    let weakenRamNeededFromHack = ns.getScriptRam(SCRIPTS.batchWeaken) * weakenThreadsNeededFromHack;

    //if targetHackPercent is .45, and the server has $2500
    //hackAmount = $2500 * .45 = $1125. Would have $1375 remaining
    //need to grow back to $2500
    // 1375 * growToPercent = $2500 ==> growToPercent = 2500 / 1375 ==> growToPercent = max/(max-hackAmount)

    //let growToPercent = 1.0 / (targetHackPercent - 1.0);
    let growToPercent = targetServer.moneyMax / (targetServer.moneyMax - hackAmount);
    //ns.print({ targetHackPercent, growToPercent });

    if (growToPercent === Number.POSITIVE_INFINITY) {
        debugLog(ns, DebugLevel.error, `growToPercent was infinity!!`, {
            growToPercent,
            maxMoney: targetServer.moneyMax,
            otherThing: (targetServer.moneyMax - hackAmount)
        });
    }

    let growThreadsNeeded = Math.ceil(ns.growthAnalyze(target, growToPercent));

    let growSecurityIncrease = ns.growthAnalyzeSecurity(growThreadsNeeded);
    let growRamNeeded = ns.getScriptRam(SCRIPTS.batchGrow) * growThreadsNeeded;

    let weakenThreadsNeededFromGrow = Math.ceil(growSecurityIncrease / weakenSingleSecurityDecrease);
    let weakenRamNeededFromGrow = ns.getScriptRam(SCRIPTS.batchWeaken) * weakenThreadsNeededFromGrow;

    let totalRamNeeded = hackRamNeeded + weakenRamNeededFromHack + growRamNeeded + weakenRamNeededFromGrow;

    let hackTime = Math.ceil(ns.getHackTime(target));
    let weakenTime = Math.ceil(ns.getWeakenTime(target));
    let growTime = Math.ceil(ns.getGrowTime(target));

    let delayUntilWeakenHack = 0; //hack is going to be small, but just in case...
    let delayUntilHack = Math.max(weakenTime - TIME_GAP - hackTime, 0);
    let delayUntilGrow = Math.max((delayUntilWeakenHack + weakenTime + TIME_GAP) - growTime, 0);
    let delayUntilWeakenGrow = Math.max((delayUntilGrow + growTime + TIME_GAP) - weakenTime, 0);
    let request: IBatchRequest = {
        batchId: getRandomId(),
        target: target,
        delayUntilGrow: delayUntilGrow,
        delayUntilHack: delayUntilHack,
        delayUntilWeakenGrow: delayUntilWeakenGrow,
        delayUntilWeakenHack: delayUntilWeakenHack,
        growThreadsNeeded: growThreadsNeeded,
        growTime: growTime,
        hackThreadCount: hackThreadCount,
        hackTime: hackTime,
        totalRamNeeded: totalRamNeeded,
        weakenThreadsNeededFromGrow: weakenThreadsNeededFromGrow,
        weakenThreadsNeededFromHack: weakenThreadsNeededFromHack,
        weakenTime: weakenTime
    };

    //debugLog(ns, DebugLevel.info, `BATCH request`, request);

    return request;
}

export async function doBatch(ns: NS, target: string, DRY_RUN: boolean = false): Promise<boolean> {
    let request = makeBatchRequest(ns, target);
    //return doBatchFromRequest(ns, request);
    return await doBatchFromRequestMultiRunner(ns, request);

}

interface IRunnerJob {
    runner: string;
    scriptName: string;
    threads: number,
    args: any[]
}

/**
 * Finds a list of runners than can run the script for the number of threads.
 * Returns undefined if it can't fulfil ALL threads
 * @param ns
 * @param runnersList
 * @param script
 * @param threadsNeeded
 * @param args
 */
export function getRunnerJobsForScript(ns: NS, runnersList: RunnerInfo[], script: string, threadsNeeded: number, ...args: any[]): IRunnerJob[] | undefined {
    let jobs: IRunnerJob[] | undefined = [];

    let numThreadsNeeded = threadsNeeded;
    while (runnersList.length > 0 && numThreadsNeeded > 0) {
        //get the next runner on the list
        let runner = runnersList[0];
        if (runner) {
            //figure out how many threads we can run on it
            //do the math manually here so that it doesn't refetch the server's current ram usage
            let scriptRam = ns.getScriptRam(script, runner.hostname);
            let availableThreads = Math.floor(runner.freeRam / scriptRam);

            availableThreads = Math.max(availableThreads - 1, 0);//this is to compensate for what I assume is rounding error

            let threadsToRun = Math.min(numThreadsNeeded, availableThreads);

            if (threadsToRun > 0) {
                let job: IRunnerJob = {
                    runner: runner.hostname,
                    scriptName: script,
                    threads: threadsToRun,
                    args: [...args]
                };

                jobs.push(job);
            }

            numThreadsNeeded -= threadsToRun;
            runner.freeRam -= (threadsToRun * scriptRam);

            //if we used up all the available threads on this runner, remove it from the list
            if (availableThreads === threadsToRun) {
                runnersList.shift();
            }
        } else {
            debugLog(ns, DebugLevel.error, `getRunnerJobsForScript(): Null runner from list!`);
        }
    }

    //if we didn't get all the threads we needed, we 'fail'
    if (numThreadsNeeded > 0) {
        jobs = undefined;
    }

    return jobs;
}

export async function doBatchFromRequestMultiRunner(ns: NS, request: IBatchRequest, DRY_RUN: boolean = false): Promise<boolean> {
    let success = true;

    //we know how many threads we need for each step,
    //split the threads across as many runners as needed

    let runners = getAllRunners(ns);

    let jobs: IRunnerJob[] = [];

    let batchPartParams = [
        { script: SCRIPTS.batchHack, threads: request.hackThreadCount, delay: request.delayUntilHack },
        {
            script: SCRIPTS.batchWeaken,
            threads: request.weakenThreadsNeededFromHack,
            delay: request.delayUntilWeakenHack
        },
        { script: SCRIPTS.batchGrow, threads: request.growThreadsNeeded, delay: request.delayUntilGrow },
        { script: SCRIPTS.batchWeaken, threads: request.weakenThreadsNeededFromGrow, delay: request.delayUntilWeakenGrow }
    ];
    let batchId = request.batchId;
    for (const param of batchPartParams) {
        if (success) {
            let taskJobs = getRunnerJobsForScript(ns, runners, param.script, param.threads, request.target, param.delay, batchId);
            if (taskJobs) {
                jobs.push(...taskJobs);
            } else {
                // if any of the batch parts fails, we abort the whole batch!
                success = false;
                jobs = [];
            }
        }

    }

    for (const j of jobs) {
        //debugLog(ns, DebugLevel.info, `Batch Job: '${j.scriptName}', t=${j.threads}, Runner:[${j.runner}] args:${j.args}`,)

        //do the job
        let procId = ns.exec(j.scriptName, j.runner, j.threads, ...j.args);

        //retry one time
        if (procId === 0) {
            debugLog(ns, DebugLevel.error, `Error trying to run '${j.scriptName}' on [${j.runner}] t=${j.threads}, retrying!`);
            procId = ns.exec(j.scriptName, j.runner, j.threads, ...j.args);
        }

        if (procId === 0) {
            success = false;
            debugLog(ns, DebugLevel.error, `Tried to run '${j.scriptName}' on [${j.runner}] t=${j.threads}, but failed!`);

            let scriptRam = ns.getScriptRam(j.scriptName, j.runner);
            let availableThreads = Math.floor(getServerFreeRam(ns, j.runner) / scriptRam);
            debugLog(ns, DebugLevel.error, `[${j.runner}] had ${round(getServerFreeRam(ns, j.runner), 1)} free ram. Should have been able to run ${availableThreads} threads`);
        }

    }
    await ns.sleep(1);
    return success;
}

export function doBatchFromRequest(ns: NS, request: IBatchRequest, DRY_RUN: boolean = false): boolean {

    let success = false;

    let batchRunner = getFirstRunnerWithFreeRam(ns, request.totalRamNeeded);
    if (batchRunner) {

        // HACK
        if (DRY_RUN) {
            ns.print(`hackTime:${request.hackTime / 1000.0}s, growTime:${request.growTime / 1000.0}s, weakenTime:${request.weakenTime / 1000.0}s`);
            ns.print(`runBatchHack(ns, ${batchRunner}, ${request.target}, ${request.hackThreadCount});`);
            ns.print(`runBatchWeaken(ns, ${batchRunner}, ${request.target}, ${request.weakenThreadsNeededFromHack}, ${request.delayUntilWeakenHack});`);
            ns.print(`runBatchGrow(ns, ${batchRunner}, ${request.target}, ${request.growThreadsNeeded}, ${request.delayUntilGrow});`);
            ns.print(`runBatchWeaken(ns, ${batchRunner}, ${request.target}, ${request.weakenThreadsNeededFromGrow}, ${request.delayUntilWeakenGrow});`);
        } else {
            //debug(ns, `${timestamp()} BATCH [${request.target}]`, request);
            let batchId = getRandomId();
            runBatchHack(ns, batchRunner, request.target, request.hackThreadCount, batchId, request.delayUntilHack);
            runBatchWeaken(ns, batchRunner, request.target, request.weakenThreadsNeededFromHack, batchId, request.delayUntilWeakenHack);
            runBatchGrow(ns, batchRunner, request.target, request.growThreadsNeeded, batchId, request.delayUntilGrow);
            runBatchWeaken(ns, batchRunner, request.target, request.weakenThreadsNeededFromGrow, batchId, request.delayUntilWeakenGrow);
            success = true;
        }

    } else {
        //debug(ns, `No available runners have ${request.totalRamNeeded} for batch on [${request.target}]!!`);
    }

    return success;
}
