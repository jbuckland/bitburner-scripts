import {DebugLevel, playerControllers, SCRIPTS} from './consts';
import {NS} from './NetscriptDefinitions';
import {IRamUsageSettings, ITargetWorkInfo, TaskType} from './types';
import {
    debugLog,
    formatBigNumber,
    formatBigRam,
    getAllRamUsage,
    getAllRunnerNames,
    getFirstAvailableRunnerForScript,
    getPlayerTools,
    getRandomId,
    getThreadsAvailableForScript,
    setSettings,
    timerEnd,
    timerStart,
    timestamp
} from './utils';
import {getAllTargetWorkInfo, isReadyForBatch, startBestController} from './utils-controller';
import {crimeControllers} from './crime_consts';
import {prepAllTargets, singleHack} from './hack-utils';

const SLEEP_TIME = 1000;
const FRACTION_TO_USE_FOR_SHARE = 0.99;
const FRACTION_TO_USE_FOR_EXTRA_EXP = .99;
const EXP_TARGET = 'neo-net';
//'silver-helix';
/*
'silver-helix';
'omega-net';
'crush-fitness';
*/

const ramPercentSettings: IRamUsageSettings = {batchPct: 0, prepPct: 0, sharePct: 0, expPct: 0};

export async function main(ns: NS) {

    ns.disableLog('ALL');
    ns.tail();
    runInitialScripts();
    await ns.sleep(1000);

    setSettings(ns, {hackPercent: 0.5, ramBuffer: 64});

    while (true) {
        timerStart(ns, 'hack-controller main');
        ns.print('');

        timerStart(ns, 'hack-controller start');
        startBestController(ns, playerControllers);
        if (ns.gang.inGang()) {
            startBestController(ns, crimeControllers);
        }

        let targetWorkInfos = getAllTargetWorkInfo(ns);
        setDefaultRamPercents();
        adjustRamPercents();
        timerEnd(ns, 'hack-controller start');

        if (targetWorkInfos.length > 0) {
            let workReadyForBatch = targetWorkInfos.filter(w => isReadyForBatch(w));

            let prepPercent = ramPercentSettings.prepPct;

            if (workReadyForBatch.length === 0) {
                //if we have nothing ready for batch, let prep use all the ram
                prepPercent = 1;

                let minHackTarget = targetWorkInfos.find(w => !isReadyForBatch(w));
                if (minHackTarget) {
                    singleHack(ns, minHackTarget.target.hostname);
                }
            }

            prepAllTargets(ns, targetWorkInfos, prepPercent);

        }

        await doExtra(targetWorkInfos);

        killUnneededThreads(targetWorkInfos);

        timerEnd(ns, 'hack-controller main');
        await ns.sleep(SLEEP_TIME);
    }

    function setDefaultRamPercents() {
        ramPercentSettings.batchPct = .70;
        ramPercentSettings.prepPct = .15;
        ramPercentSettings.sharePct = .40;
        ramPercentSettings.expPct = .10;

    }

    function adjustRamPercents() {
        setDefaultRamPercents();

        let tools = getPlayerTools(ns);
        let hasMainTools = tools.sql && tools.brute && tools.ftp && tools.http;
        if (!hasMainTools) {
            ramPercentSettings.expPct = 0;
            ramPercentSettings.sharePct = 0;
        }
    }

    function killUnneededThreads(targetWorkInfos: ITargetWorkInfo[]) {
        let EXTRA_THREAD_LIMIT = 50;

        //if we need 0 grow, we can kill off any grow threads for this target

        for (let i = 0; i < targetWorkInfos.length; i++) {
            const work = targetWorkInfos[i];
            let targetName = work.target.hostname;

            if (targetName !== EXP_TARGET) {

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

    async function doExtra(targetWorkInfos: ITargetWorkInfo[]) {

        let shareLimit = ramPercentSettings.sharePct;
        let expLimit = ramPercentSettings.expPct;

        let player = ns.getPlayer();
        let shareThreads = 0;
        if (player.isWorking && player.currentWorkFactionName) {
            shareThreads = await doExtraShare(ramPercentSettings.sharePct);
        } else {
            //since we're not using it for sharing, might as well use it for exp
            expLimit += shareLimit;
        }

        let shareRam = shareThreads * ns.getScriptRam(SCRIPTS.myShare);
        ns.print(`${timestamp()} Share threads: ${formatBigNumber(shareThreads)}, ${formatBigRam(shareRam)}`);

        let expTarget = targetWorkInfos.find(t => t.target.hostname === EXP_TARGET);
        if (expTarget) {
            //only run exp work if the EXP Target doesn't need weakening
            if (expTarget.threadInfos[TaskType.weaken].moreNeeded === 0) {
                let expGainThreads = await doExtraGainExp(ramPercentSettings.expPct);
                let expRam = expGainThreads * ns.getScriptRam(SCRIPTS.grow);
                ns.print(`${timestamp()} Exp threads: ${formatBigNumber(expGainThreads)}, ${formatBigRam(expRam)}`);
            } else {
                debugLog(ns, DebugLevel.warn, `[${EXP_TARGET}] needed weakening!`);
            }

        }
    }

    async function doExtraShare(ramPercentLimit: number): Promise<number> {
        let shareThreads = 0;

        let player = ns.getPlayer();
        if (player.isWorking && player.currentWorkFactionName) {

            let usage = getAllRamUsage(ns);

            let ramUsedToShare = usage.shareRam;
            let maxRamToUse = usage.totalMax * ramPercentLimit;
            let singleShareRam = ns.getScriptRam(SCRIPTS.myShare);

            let runnerNames = getAllRunnerNames(ns);
            for (let runnerName of runnerNames) {
                let availableThreads = getThreadsAvailableForScript(ns, runnerName, SCRIPTS.myShare);
                let threadsToRun = Math.floor(availableThreads);
                if (threadsToRun > 0) {
                    let procId = ns.exec(SCRIPTS.myShare, runnerName, threadsToRun, getRandomId());
                    if (procId > 0) {
                        debugLog(ns, DebugLevel.success, `Starting ${threadsToRun} share threads!`);
                        shareThreads += threadsToRun;
                        ramUsedToShare += threadsToRun * singleShareRam;
                    } else {
                        debugLog(ns, DebugLevel.error, `Unable to start ${threadsToRun} share threads on ${runnerName}!`);
                    }
                }
                if (ramUsedToShare >= maxRamToUse) {
                    break;
                }

            }

            /* while (ramUsedToShare < maxRamToUse) {
                 //debugLog(ns, DebugLevel.info, `Current share: ${formatPercent(sharePercent)}, limit: ${formatPercent(ramPercentLimit)}. SHARE!`);
                 let runner = getFirstAvailableRunnerForScript(ns, SCRIPTS.share);
                 if (runner) {
                     let availableThreads = getThreadsAvailableForScript(ns, runner, SCRIPTS.share);
                     let threadsToRun = Math.floor(availableThreads);
                     if (threadsToRun > 0) {
                         let procId = ns.exec(SCRIPTS.share, runner, threadsToRun, getRandomId());
                         if (procId > 0) {
                             debugLog(ns, DebugLevel.success, `Starting ${threadsToRun} share threads!`);
                             shareThreads += threadsToRun;
                             ramUsedToShare += threadsToRun * singleShareRam;
                         } else {
                             debugLog(ns, DebugLevel.error, `Unable to start ${threadsToRun} share threads on ${runner}!`);
                         }
                     }
                 }

             }*/

        }
        return shareThreads;
    }

    async function doExtraGainExp(ramPercentLimit: number): Promise<number> {
        let extraThreads = 0;

        let usage = getAllRamUsage(ns);
        let singleExpRam = ns.getScriptRam(SCRIPTS.expGain);
        let expRamUsage = usage.expRam;
        let expPercent = expRamUsage / usage.totalMax;

        let maxPasses = 10;
        let currPass = 0;

        while (expPercent < ramPercentLimit && currPass < maxPasses) {
            currPass++;
            let runner = getFirstAvailableRunnerForScript(ns, SCRIPTS.expGain);
            if (runner) {
                let availableThreads = getThreadsAvailableForScript(ns, runner, SCRIPTS.expGain);
                let threadsToRun = Math.floor(availableThreads);
                if (threadsToRun > 0) {

                    let procId = ns.exec(SCRIPTS.expGain, runner, threadsToRun, EXP_TARGET, getRandomId());
                    if (procId > 0) {
                        extraThreads += threadsToRun;
                        expRamUsage += threadsToRun * singleExpRam;
                        debugLog(ns, DebugLevel.success, `Running ${threadsToRun} EXP Gain threads`);
                    } else {
                        debugLog(ns, DebugLevel.error, `Unable to run EXP script on ${EXP_TARGET}`);
                    }
                }
            } else {
                debugLog(ns, DebugLevel.warn, `No available runners to run EXP script on ${EXP_TARGET}`);
            }

            usage = getAllRamUsage(ns);
            expPercent = usage.expRam / usage.totalMax;

            await ns.sleep(10);
        }

        return extraThreads;

    }

    function runInitialScripts() {
        ns.run(SCRIPTS.addScripts);
        ns.run(SCRIPTS.autoNuke);
        ns.run(SCRIPTS.targetStats);
        ns.run(SCRIPTS.homeController);
        ns.run(SCRIPTS.batchController);
        ns.run(SCRIPTS.arrangeWindows);
    }

}

export class HackController {

}