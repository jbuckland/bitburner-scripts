import { SCRIPTS } from './consts';
import { NS } from './NetscriptDefinitions';
import { debug, formatBigRam, getFirstRunnerWithFreeRam, getRandomId, runBatchGrow, runBatchHack, runBatchWeaken, timestamp } from './utils';

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

        doBatch(ns, target);
        await ns.sleep(20);
        ns.print('');
    } while (LOOP);

}

export function doBatch(ns: NS, target: string, DRY_RUN: boolean = false) {

    let success = false;
    let TIME_GAP = 50;

    let targetServer = ns.getServer(target);
    let targetHackPercent = 0.2;
    let hackAmount = targetServer.moneyAvailable * targetHackPercent;

    //make sure we have enough ram to run ALL the things before we start
    //let hackThreadCount = hackThreads;
    let hackThreadCount = Math.ceil(ns.hackAnalyzeThreads(target, hackAmount));
    let hackSecurityIncrease = ns.hackAnalyzeSecurity(hackThreadCount);
    let hackPartStolen = ns.hackAnalyze(target) * hackThreadCount;
    let hackRamNeeded = ns.getScriptRam(SCRIPTS.hack) * hackThreadCount;

    let weakenSingleSecurityDecrease = ns.weakenAnalyze(1);
    let weakenThreadsNeededFromHack = Math.ceil(hackSecurityIncrease / weakenSingleSecurityDecrease);
    let weakenRamNeededFromHack = ns.getScriptRam(SCRIPTS.weaken) * weakenThreadsNeededFromHack;

    //let growToPercent = 1 + hackPartStolen; // 1 would be no growth
    let growToPercent = 1.0 / (1.0 - targetHackPercent);

    let growThreadsNeeded = Math.ceil(ns.growthAnalyze(target, growToPercent));
    let growSecurityIncrease = ns.growthAnalyzeSecurity(growThreadsNeeded);
    let growRamNeeded = ns.getScriptRam(SCRIPTS.grow) * growThreadsNeeded;

    let weakenThreadsNeededFromGrow = Math.ceil(growSecurityIncrease / weakenSingleSecurityDecrease);
    let weakenRamNeededFromGrow = ns.getScriptRam(SCRIPTS.weaken) * weakenThreadsNeededFromGrow;

    let totalRamNeeded = hackRamNeeded + weakenRamNeededFromHack + growRamNeeded + weakenRamNeededFromGrow;

    debug(
        ns,
        `[${target}] BATCH - Needed Ram:${totalRamNeeded.toPrecision(4)}, Threads: H:${hackThreadCount} W:${weakenThreadsNeededFromHack} G:${growThreadsNeeded} W:${weakenThreadsNeededFromGrow}`
    );

    let hackTime = Math.ceil(ns.getHackTime(target));
    let weakenTime = Math.ceil(ns.getWeakenTime(target));
    let growTime = Math.ceil(ns.getGrowTime(target));

    let delayUntilWeakenHack = 0; //hack is going to be small, but just in case...
    let delayUntilHack = Math.max(weakenTime - TIME_GAP - hackTime, 0);
    let delayUntilGrow = Math.max((delayUntilWeakenHack + weakenTime + TIME_GAP) - growTime, 0);
    let delayUntilWeakenGrow = Math.max((delayUntilGrow + growTime + TIME_GAP) - weakenTime, 0);

    let batchRunner = getFirstRunnerWithFreeRam(ns, totalRamNeeded);
    if (!batchRunner) {
        debug(ns, `no runner that can do ${totalRamNeeded} ram`);
    }

    let validThreadCounts = Math.min(hackThreadCount, weakenThreadsNeededFromHack, growThreadsNeeded, weakenThreadsNeededFromGrow);
    if (!validThreadCounts) {
        debug(
            ns,
            `ERROR! bad thread counts!`,
            { batchRunner, target, hackThreadCount, weakenThreadsNeededFromHack, growThreadsNeeded, weakenThreadsNeededFromGrow }
        );
    } else {
        debug(ns, 'validThreadCounts');
    }

    if (batchRunner && validThreadCounts) {

        // HACK
        if (DRY_RUN) {
            ns.print(`hackTime:${hackTime / 1000.0}s, growTime:${growTime / 1000.0}s, weakenTime:${weakenTime / 1000.0}s`);
            ns.print(`runBatchHack(ns, ${batchRunner}, ${target}, ${hackThreadCount});`);
            ns.print(`runBatchWeaken(ns, ${batchRunner}, ${target}, ${weakenThreadsNeededFromHack}, ${delayUntilWeakenHack});`);
            ns.print(`runBatchGrow(ns, ${batchRunner}, ${target}, ${growThreadsNeeded}, ${delayUntilGrow});`);
            ns.print(`runBatchWeaken(ns, ${batchRunner}, ${target}, ${weakenThreadsNeededFromGrow}, ${delayUntilWeakenGrow});`);
        } else {
            debug(
                ns,
                `${timestamp()} BATCH [${target}] ${formatBigRam(totalRamNeeded)}, Threads: H${hackThreadCount}-W${weakenThreadsNeededFromHack}-G${growThreadsNeeded}-W${weakenThreadsNeededFromGrow}`
            );
            debug(ns, `${timestamp()} BATCH [${target}]  weakenTime:${weakenTime}, growTime:${growTime}, hackTime:${hackTime}`);
            debug(
                ns,
                `${timestamp()} BATCH [${target}] delayUntilWeakenHack:${delayUntilWeakenHack}, delayUntilWeakenGrow:${delayUntilWeakenGrow}, delayUntilGrow:${delayUntilGrow}, delayUntilHack:${delayUntilHack}`
            );
            let batchId = getRandomId();
            runBatchHack(ns, batchRunner, target, hackThreadCount, batchId, delayUntilHack);
            runBatchWeaken(ns, batchRunner, target, weakenThreadsNeededFromHack, batchId, delayUntilWeakenHack);
            runBatchGrow(ns, batchRunner, target, growThreadsNeeded, batchId, delayUntilGrow);
            runBatchWeaken(ns, batchRunner, target, weakenThreadsNeededFromGrow, batchId, delayUntilWeakenGrow);
            success = true;
        }

    } else {
        debug(ns, `No available runners to run batch on [${target}]!!`);
    }

    return success;
}
