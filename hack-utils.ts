import { doBatchFromRequest, makeBatchRequest } from './batch';
import { DebugLevel, SCRIPTS } from './consts';
import { NS } from './NetscriptDefinitions';
import { ITargetWorkInfo, TaskType, ThreadInfo } from './types';
import {
    debugLog, getAllRamUsage, getFirstAvailableRunnerForScript, getRandomId, getThreadsAvailableForScript, runHack, timerEnd, timerStart, timestamp
} from './utils';
import { isReadyForBatch } from './utils-controller';

export async function doBatches(ns: NS, targetWork: ITargetWorkInfo[]): Promise<number> {
    let readyForBatchCount = 0;

    let successfulBatchCount = 0;
    let batchRamUsed = 0;
    for (let i = 0; i < targetWork.length; i++) {
        const work = targetWork[i];

        if (isReadyForBatch(work)) {

            readyForBatchCount++;

            let batchRequest = makeBatchRequest(ns, work.target.hostname);
            let success = doBatchFromRequest(ns, batchRequest);
            if (success) {
                successfulBatchCount++;
                batchRamUsed += batchRequest.totalRamNeeded;
            }
        }

    }

    //ns.print(`${timestamp()} Batches started: ${successfulBatchCount}, ${formatBigRam(batchRamUsed)}`);

    return successfulBatchCount;
}

export function singleHack(ns: NS, target: string) {
    let runner = getFirstAvailableRunnerForScript(ns, SCRIPTS.hack);
    if (runner) {
        ns.print(`${timestamp()}Hacking [${target}]!`);
        runHack(ns, runner, target, 1);
    } else {
        debugLog(ns, DebugLevel.warn, `Undefined runner!`);

    }

}

export function prepAllTargets(ns: NS, targetWork: ITargetWorkInfo[], ramPercentToUse: number) {
    timerStart(ns, 'prepTargets()');
    //console.profile('prepTargets()');
    let weakenThreadsStarted = 0;
    let growThreadsStarted = 0;

    //make a pass through all the work
    let ramUsage = getAllRamUsage(ns);
    let singleWeakenRam = ns.getScriptRam(SCRIPTS.weaken);
    let singleGrowRam = ns.getScriptRam(SCRIPTS.weaken);

    let prepRamUsed = ramUsage.prepRam;
    let prepPercent = prepRamUsed / ramUsage.totalMax;

    for (const work of targetWork) {

        if (prepPercent < ramPercentToUse) {

            weakenThreadsStarted += useAvailableRunnersForWork(ns, work.target.hostname, SCRIPTS.weaken, work.threadInfos[TaskType.weaken], 1);
            growThreadsStarted += useAvailableRunnersForWork(ns, work.target.hostname, SCRIPTS.grow, work.threadInfos[TaskType.grow], 1);

            prepRamUsed += weakenThreadsStarted * singleWeakenRam;
            prepRamUsed += growThreadsStarted * singleGrowRam;

            prepPercent = prepRamUsed / ramUsage.totalMax;

        } else {
            break;
        }

    }

    ns.print(`${timestamp()}Prep threads started: W:${weakenThreadsStarted}, G:${growThreadsStarted}`);
    //console.profileEnd('prepTargets()');
    timerEnd(ns, 'prepTargets()');
}

export function useAvailableRunnersForWorkEfficient(ns: NS, target: string, scriptName: string, threadsNeeded: ThreadInfo, workFraction: number = 1): number {
    let threadsStarted = 0;

    return threadsStarted;
}

export function useAvailableRunnersForWork(ns: NS, target: string, scriptName: string, threadsNeeded: ThreadInfo, workFraction: number = 1): number {

    let threadsStarted = 0;

    if (threadsNeeded.moreNeeded > 0) {

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

            }

        }

    }

    return threadsStarted;
}
