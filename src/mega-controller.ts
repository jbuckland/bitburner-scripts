import {addScripts} from '/addScripts';
import {DARK_DATA, DebugLevel, HOME, MAX_HOME_SERVER_RAM, NON_HACKING_AUGMENTS, SCRIPTS, THE_RED_PILL, TOAST_DURATION, TOAST_VARIANT} from '/lib/consts';
import {singleHack, useAvailableRunnersForWork} from '/lib/hack-utils';
import {
    debugLog,
    formatBigNumber,
    formatBigRam,
    formatBigTime,
    formatCurrency,
    formatPercent,
    getAllRamUsage,
    getAllRunners,
    getDonationNeededForReputation,
    getPlayerTools,
    getServerFreeRam,
    getSettings,
    getUnownedFactionAugmentations,
    indent,
    round,
    setSettings,
    timestamp
} from '/lib/utils';
import {getAllTargetWorkInfo, isReadyForBatch} from '/lib/utils-controller';
import {getGangIncome, getHacknetIncome, myGetScriptIncome} from '/lib/utils-crime';
import {
    displayHeader,
    displayServerStats,
    doInstallReset,
    getHomeServers,
    getNextHomeServerSize,
    getReputationGainRate,
    HomeServer,
    installBackdoors,
    purchaseProgram,
    upgradeHomeComputer
} from '/lib/utils-player';
import {NS, Player} from '/NetscriptDefinitions';
import {getRunnerJobsForScript, makeBatchRequest} from '/old-controllers/batch';
import {IRamUsage} from '/old-controllers/home-controller';
import {IBatchRequest, IDarkwebTool, IGlobalSettings, IRamUsageSettings, IRunnerJob, ITargetWorkInfo, TaskType} from '/types';

export async function main(ns: NS) {

    let controller = new MegaController(ns);
    await controller.doRun();

}

interface IFactionInfo {
    favor: number;
    name: string;
    reputation: number;
}

interface IAugmentationInfo {
    faction: string;
    moneyCost: number;
    name: string;
    repRequirement: number;
}

interface IPlayerTools {
    alink: boolean;
    brute: boolean;
    ftp: boolean;
    http: boolean;
    prof: boolean;
    scan1: boolean;
    scan2: boolean;
    smtp: boolean;
    sql: boolean;
}



class MegaController {
    private readonly DEFAULT_RAM_USAGE_SETTINGS: IRamUsageSettings = {batchPct: .80, prepPct: .40, sharePct: .10, expPct: .10};
    private readonly HACK_PCT_MAX: number = .90;
    private readonly HACK_PCT_MIN: number = 0.005;
    private readonly HACK_PCT_SCALAR: number = 0.1;
    private readonly SLEEP_TIME: number = 1000;
    private adjustedPrepPct: number = this.DEFAULT_RAM_USAGE_SETTINGS.prepPct;
    private costMultiplierBeforeBuying: number = 2;
    private expGain: number = 0;
    private gangMoneyGain: number = 0;
    private hacknetMoneyGain: number = 0;
    private lastStartTime: number = new Date().getTime();
    private neededFavorToDonate: number;
    private player!: Player;
    private playerFactionInfo: IFactionInfo[] = [];
    private playerTools!: IPlayerTools;
    private ramUsage!: IRamUsage;
    private repGain: number = 0;
    private scriptMoneyGain: number = 0;
    private scriptRunTime: number = 0;
    private settings: IGlobalSettings = {};
    private singleGrowRam: number;
    private singleWeakenRam: number;
    private targetWorkInfos: ITargetWorkInfo[] = [];
    private totalMoneyGain: number = 0;
    private unownedAugmentationInfo: IAugmentationInfo[] = [];
    private workReadyForBatch: ITargetWorkInfo[] = [];

    constructor(private ns: NS) {
        ns.tail();
        ns.disableLog('ALL');
        this.updateData();
        this.neededFavorToDonate = this.ns.getFavorToDonate();
        this.singleWeakenRam = this.ns.getScriptRam(SCRIPTS.weaken);
        this.singleGrowRam = this.ns.getScriptRam(SCRIPTS.grow);
    }

    public async doRun() {

        this.runInitialScripts();

        while (true) {

            this.updateData();
            this.displayInfo();

            ////////////////
            //do work
            this.buyDarkwebTools();
            await installBackdoors(this.ns);
            upgradeHomeComputer(this.ns);
            this.purchaseAvailableAugmentations();
            await this.tryPurchaseServer();

            await this.doHacking();

            this.updateRunTime();
            await this.ns.sleep(this.SLEEP_TIME);
        }

    }

    public async tryPurchaseServer() {

        let myServers = this.ns.getPurchasedServers();

        //finally
        let nextRamSize = getNextHomeServerSize(this.ns);
        let serverCost = this.ns.getPurchasedServerCost(nextRamSize);
        let playerHasEnoughMoney = this.ns.getPlayer().money >= (serverCost * this.costMultiplierBeforeBuying);

        let serverLimit = this.ns.getPurchasedServerLimit();
        let serverCount = myServers.length;
        let homeServersFull = serverCount >= serverLimit;

        let homeServers = getHomeServers(this.ns);
        let aServerNeedsUpgraded = false;
        let smallestServer: HomeServer | undefined;
        if (homeServers.length > 0) {

            homeServers.sort((a, b) => a.maxRam - b.maxRam);
            smallestServer = homeServers[0];
            aServerNeedsUpgraded = smallestServer && smallestServer.maxRam < MAX_HOME_SERVER_RAM;
        }

        debugLog(this.ns, DebugLevel.info, 'tryPurchaseServer()', {
            nextRamSize,
            serverCost,
            playerHasEnoughMoney,
            homeServersFull,
            smallestServer
        });

        if (playerHasEnoughMoney) {
            if (homeServersFull && smallestServer && aServerNeedsUpgraded) {
                //delete
                this.ns.toast(`Removed home server ${smallestServer.hostname} (${formatBigRam(smallestServer.maxRam)})`, TOAST_VARIANT.info, TOAST_DURATION);
                this.ns.killall(smallestServer.hostname);
                this.ns.deleteServer(smallestServer.hostname);
            }

            if (!homeServersFull || (smallestServer && aServerNeedsUpgraded)) {
                //buy
                let newHostName = this.ns.purchaseServer(HOME, nextRamSize);
                await addScripts(this.ns, newHostName, true);

                await this.ns.sleep(10);
                this.ns.toast(`Purchased home server ${newHostName} (${formatBigRam(nextRamSize)})`, TOAST_VARIANT.info, TOAST_DURATION);
            }
        }

    }

    private buyDarkwebTools() {


        if (!this.player.tor && this.player.money > DARK_DATA.torCost) {
            this.player.tor = this.ns.purchaseTor();
            this.ns.toast(`TOR router purchased!`, TOAST_VARIANT.success, TOAST_DURATION);
        }

        if (this.player.tor) {

            if (!this.playerTools.brute) {
                this.playerTools.brute = purchaseProgram(this.ns, this.player, DARK_DATA.tools.brute);
            }
            if (!this.playerTools.ftp) {
                this.playerTools.ftp = purchaseProgram(this.ns, this.player, DARK_DATA.tools.ftp);
            }
            if (!this.playerTools.smtp) {
                this.playerTools.smtp = purchaseProgram(this.ns, this.player, DARK_DATA.tools.smtp);
            }
            if (!this.playerTools.http) {
                this.playerTools.http = purchaseProgram(this.ns, this.player, DARK_DATA.tools.http);
            }
            if (!this.playerTools.sql) {
                this.playerTools.sql = purchaseProgram(this.ns, this.player, DARK_DATA.tools.sql);
            }

            //only buy these if we already have sql
            if (this.playerTools.sql) {
                if (!this.playerTools.alink) {
                    this.playerTools.alink = purchaseProgram(this.ns, this.player, DARK_DATA.tools.alink);
                }
                if (!this.playerTools.scan1) {
                    this.playerTools.scan1 = purchaseProgram(this.ns, this.player, DARK_DATA.tools.scan1);
                }
                if (!this.playerTools.scan2) {
                    this.playerTools.scan2 = purchaseProgram(this.ns, this.player, DARK_DATA.tools.scan2);
                }
                if (!this.playerTools.prof) {
                    this.playerTools.prof = purchaseProgram(this.ns, this.player, DARK_DATA.tools.prof);
                }

            }

        }

    }

    private displayHackingInfo() {
        this.ns.print(`Hacking:`);
        this.ns.print(`${indent()}Prep RAM Percent: ${formatPercent(this.adjustedPrepPct)}`);
        this.ns.print(`${indent()}Batch RAM Percent: ${formatPercent(this.DEFAULT_RAM_USAGE_SETTINGS.batchPct)}`);
        this.ns.print(`${indent()}Num. Ready for Batch: ${this.workReadyForBatch.length}`);
        this.ns.print(`${indent()}Hack RAM Percent: ${formatPercent(this.settings.hackPercent ?? 0, 3)}`);
        this.ns.print('');
    }

    private displayIncomeStats() {

        let padding = 8;

        let totalMoneyString = formatCurrency(this.totalMoneyGain);
        let expString = formatBigNumber(this.expGain, 2);
        let repString = formatBigNumber(this.repGain, 2);
        this.ns.print(`Income: ${totalMoneyString}/s, ${expString} xp/s, ${repString} rep/s`);

        let hackMoneyString = `\$${formatBigNumber(this.scriptMoneyGain, 2)}`;
        this.ns.print(`${indent()}Hacking: ${hackMoneyString.padStart(padding)}/s`);

        if (this.ns.gang.inGang()) {
            let gangMoneyString = `\$${formatBigNumber(this.gangMoneyGain, 2)}`;
            this.ns.print(`${indent()}Gang:    ${gangMoneyString.padStart(padding)}/s`);
        }

        if (this.ns.hacknet.numNodes() > 0) {
            let hnMoneyString = `\$${formatBigNumber(this.hacknetMoneyGain, 2)}`;
            this.ns.print(`${indent()}Hacknet: ${hnMoneyString.padStart(padding)}/s`);
        }
        this.ns.print('');

    }

    private displayInfo() {
        this.ns.clearLog();
        displayHeader(this.ns, this.scriptRunTime);

        this.displayIncomeStats();

        this.displayNextDarkwebTool();

        this.displayHackingInfo();


        displayServerStats(this.ns, this.costMultiplierBeforeBuying);
        this.displayRamUsage();

    }

    private displayNextDarkwebTool() {
        let nextTool: IDarkwebTool | undefined;

        if (!this.playerTools.brute) {
            nextTool = DARK_DATA.tools.brute;
        } else if (!this.playerTools.ftp) {
            nextTool = DARK_DATA.tools.ftp;
        } else if (!this.playerTools.smtp) {
            nextTool = DARK_DATA.tools.smtp;

        } else if (!this.playerTools.http) {
            nextTool = DARK_DATA.tools.http;

        } else if (!this.playerTools.sql) {
            nextTool = DARK_DATA.tools.sql;
        }

        if (nextTool) {
            if (this.player.money >= nextTool.cost) {
                this.ns.print(`INFO You have enough to buy ${nextTool.name}!`);
            }


            let incomePerSec = this.totalMoneyGain;
            let remainingCost = nextTool.cost - this.player.money;

            let etaTime = new Date();
            let estTimeLeft = (remainingCost / incomePerSec) * 1000;
            etaTime.setTime(new Date().getTime() + estTimeLeft);
            let etaString = etaTime.toLocaleString('en-US', {hour: 'numeric', minute: 'numeric', second: 'numeric'});

            this.ns.print(`Next Darkweb tool: '${nextTool.name}'`);
            this.ns.print(`${indent()}Cost: \$${formatBigNumber(nextTool.cost)}, +\$${formatBigNumber(remainingCost)}`);
            this.ns.print(`${indent()}Time left: ${formatBigTime(estTimeLeft).padStart(6)}, ETA: ${etaString}`);

            if (!this.player.tor && this.player.money >= DARK_DATA.torCost) {
                this.ns.print(`INFO You have enough to buy the TOR router!`);
            }

            if (!this.playerTools.sql && this.player.money >= DARK_DATA.tools.sql.cost) {
                this.ns.print(`INFO You have enough to buy ${DARK_DATA.tools.sql.name}!`);
            }
            this.ns.print('');
        }

    }

    private displayRamUsage() {

        let pad1: number = 7;
        let pad2: number = 5;
        this.ns.print(`Total RAM Usage:  (${formatBigRam(this.ramUsage.totalMax)})`);
        this.ns.print(`${indent()}Batch: ${formatBigRam(this.ramUsage.batchRam).padStart(pad1)}, ${formatPercent(this.ramUsage.batchRam / this.ramUsage.totalMax, 1).padStart(pad2)}`);
        this.ns.print(`${indent()}Hack:  ${formatBigRam(this.ramUsage.batchRam).padStart(pad1)}, ${formatPercent(this.ramUsage.hackRam / this.ramUsage.totalMax, 1).padStart(pad2)}`);
        this.ns.print(`${indent()}Prep:  ${formatBigRam(this.ramUsage.prepRam).padStart(pad1)}, ${formatPercent(this.ramUsage.prepRam / this.ramUsage.totalMax, 1).padStart(pad2)}`);
        this.ns.print(`${indent()}Share: ${formatBigRam(this.ramUsage.shareRam).padStart(pad1)}, ${formatPercent(this.ramUsage.shareRam / this.ramUsage.totalMax, 1).padStart(pad2)}`);
        this.ns.print(`${indent()}EXP:   ${formatBigRam(this.ramUsage.expRam).padStart(pad1)}, ${formatPercent(this.ramUsage.expRam / this.ramUsage.totalMax, 1).padStart(pad2)}`);
        this.ns.print(`${indent()}Other: ${formatBigRam(this.ramUsage.otherRam).padStart(pad1)}, ${formatPercent(this.ramUsage.otherRam / this.ramUsage.totalMax, 1).padStart(pad2)}`);
        this.ns.print(`${indent()}Total: ${formatBigRam(this.ramUsage.totalUsed).padStart(pad1)}, ${formatPercent(
            this.ramUsage.totalUsed / this.ramUsage.totalMax,
            1
        ).padStart(pad2)}`);

        this.ns.print('');

    }

    private doBatchFromRequestMultiRunner(ns: NS, request: IBatchRequest, DRY_RUN: boolean = false): boolean {
        let success = true;

        //we know how many threads we need for each step,
        //split the threads across as many runners as needed

        let runners = getAllRunners(ns);

        let jobs: IRunnerJob[] = [];

        let batchPartParams = [
            {script: SCRIPTS.batchHack, threads: request.hackThreadCount, delay: request.delayUntilHack},
            {
                script: SCRIPTS.batchWeaken,
                threads: request.weakenThreadsNeededFromHack,
                delay: request.delayUntilWeakenHack
            },
            {script: SCRIPTS.batchGrow, threads: request.growThreadsNeeded, delay: request.delayUntilGrow},
            {script: SCRIPTS.batchWeaken, threads: request.weakenThreadsNeededFromGrow, delay: request.delayUntilWeakenGrow}
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
        return success;
    }

    private async doHacking() {

        if (this.workReadyForBatch.length > 0) {
            let batchSuccesses = await this.doMaxBatches();


            if (batchSuccesses === 0) {
                //decrease the hack percent
                let newHackPercent = (this.settings.hackPercent ?? 0) * (1 - this.HACK_PCT_SCALAR);
                newHackPercent = Math.max(round(newHackPercent, 3), this.HACK_PCT_MIN);

                if (newHackPercent !== this.settings.hackPercent) {
                    setSettings(this.ns, {hackPercent: newHackPercent});
                }
            } else if (batchSuccesses >= this.workReadyForBatch.length) {

                let newHackPercent = (this.settings.hackPercent ?? 0) * (1 + this.HACK_PCT_SCALAR);
                newHackPercent = Math.min(round(newHackPercent, 3), this.HACK_PCT_MAX);

                if (newHackPercent !== this.settings.hackPercent) {
                    setSettings(this.ns, {hackPercent: newHackPercent});
                }

            }



        } else {
            let minHackTarget = this.targetWorkInfos.find(w => !isReadyForBatch(w));
            if (minHackTarget) {
                singleHack(this.ns, minHackTarget.target.hostname);
            }
        }


        this.prepAllTargets();

    }

    private async doMaxBatches(): Promise<number> {

        console.log(`${timestamp()} Running batches!`);
        const MAX_PASSES = 5;

        let totalSuccessfulBatchCount = 0;
        let totalBatchRamUsed = 0;

        let successfulBatchesThisRun = 0;

        let batchPassCount = 0;

        let batchRunThisPass = false;

        let maxBatchRamToUse = this.DEFAULT_RAM_USAGE_SETTINGS.batchPct * this.ramUsage.totalMax;
        let batchRamUsed = this.ramUsage.batchRam;
        //let batchUsagePercent = batchRamUsed / this.ramUsage.totalMax;

        while (batchRamUsed < maxBatchRamToUse && batchPassCount < MAX_PASSES) {
            batchPassCount++;
            batchRunThisPass = false;
            successfulBatchesThisRun = 0;

            for (let i = 0; i < this.targetWorkInfos.length; i++) {
                const work = this.targetWorkInfos[i];

                if (isReadyForBatch(work)) {

                    //this call takes about 20ms. Significant!
                    let batchRequest = makeBatchRequest(this.ns, work.target.hostname);
                    //debugLog(this.ns, DebugLevel.info, `Batch Request created!`, batchRequest);

                    performance.now();
                    let success = this.doBatchFromRequestMultiRunner(this.ns, batchRequest);
                    if (success) {
                        totalSuccessfulBatchCount++;
                        successfulBatchesThisRun++;
                        totalBatchRamUsed += batchRequest.totalRamNeeded;
                        batchRamUsed += batchRequest.totalRamNeeded;
                        batchRunThisPass = true;
                    } else {
                        //this.ns.print(`${timestamp()}Failed to run batch on ${batchRequest.target}, needed ${formatBigRam(batchRequest.totalRamNeeded)}`);
                    }


                }

            }
            if (successfulBatchesThisRun > 0) {
                //this.ns.print(`${timestamp()}${INDENT_STRING}Batch Pass #${batchPassCount}: Started: ${successfulBatchesThisRun}`);
            }



        }

        return totalSuccessfulBatchCount;
    }

    private prepAllTargets(): { growThreadsStarted: number, weakenThreadsStarted: number, } {
        let weakenThreadsStarted = 0;
        let growThreadsStarted = 0;



        let prepRamUsed = this.ramUsage.prepRam;
        let prepPercent = prepRamUsed / this.ramUsage.totalMax;

        for (const work of this.targetWorkInfos) {
            if (prepPercent < this.adjustedPrepPct) {

                weakenThreadsStarted += useAvailableRunnersForWork(this.ns, work.target.hostname, SCRIPTS.weaken, work.threadInfos[TaskType.weaken], 1);
                growThreadsStarted += useAvailableRunnersForWork(this.ns, work.target.hostname, SCRIPTS.grow, work.threadInfos[TaskType.grow], 1);

                prepRamUsed += weakenThreadsStarted * this.singleWeakenRam;
                prepRamUsed += growThreadsStarted * this.singleGrowRam;

                prepPercent = prepRamUsed / this.ramUsage.totalMax;

            } else {
                break;
            }

        }
        return {weakenThreadsStarted, growThreadsStarted};
    }

    private purchaseAvailableAugmentations() {

        this.unownedAugmentationInfo.sort((a, b) => b.moneyCost - a.moneyCost);
        this.unownedAugmentationInfo.forEach(augInfo => {
            //we have the money to buy it
            if (this.player.money >= augInfo.moneyCost) {

                let currRepWithFaction = 0;
                let currFavorWithFaction = 0;
                let factionInfo = this.playerFactionInfo.find(f => f.name === augInfo.faction);
                if (factionInfo) {
                    currRepWithFaction = factionInfo.reputation;
                    currFavorWithFaction = factionInfo.favor;
                } else {
                    //TODO move this to updateData()
                    currRepWithFaction = this.ns.getFactionRep(augInfo.faction);
                    currFavorWithFaction = this.ns.getFactionFavor(augInfo.faction);
                }

                if (augInfo.repRequirement <= currRepWithFaction) {
                    let success = this.ns.purchaseAugmentation(augInfo.faction, augInfo.name);
                    if (success) {
                        this.ns.toast(`'${augInfo.name}' purchased from ${augInfo.faction}!`, TOAST_VARIANT.success, TOAST_DURATION);

                        this.unownedAugmentationInfo = this.unownedAugmentationInfo.filter(aug => aug != augInfo);

                        //if we've purchased the last augmentation we need, and we're working for this faction, stop
                        let augsForThisFaction = this.unownedAugmentationInfo.filter(a => a.faction === augInfo.faction);
                        if (augsForThisFaction.length === 0 && this.player.isWorking && this.player.currentWorkFactionName === augInfo.faction) {
                            this.ns.toast(`Purchased the last augmentation from ${augInfo.faction}!`, TOAST_VARIANT.info, TOAST_DURATION);
                            this.ns.stopAction();
                        }

                    } else {
                        debugLog(this.ns, DebugLevel.error, `Could not purchase '${augInfo.name}' from ${augInfo.faction}`);
                    }

                    if (augInfo.name === THE_RED_PILL) {
                        doInstallReset(this.ns);
                    }

                } else {
                    // it requires too much reputation
                    //donations
                    if (currFavorWithFaction >= this.neededFavorToDonate) {

                        let additionalRepNeeded = augInfo.repRequirement - currRepWithFaction;

                        let donationAmountNeeded = getDonationNeededForReputation(this.ns, additionalRepNeeded);

                        if (this.player.money >= augInfo.moneyCost + donationAmountNeeded) {
                            let success = this.ns.donateToFaction(augInfo.faction, donationAmountNeeded);
                            if (success) {
                                this.ns.toast(`Donated ${formatCurrency(donationAmountNeeded)} to ${augInfo.faction} for ${additionalRepNeeded} reputation!`, TOAST_VARIANT.success, TOAST_DURATION);
                                this.player.money -= donationAmountNeeded;
                            } else {
                                debugLog(this.ns, DebugLevel.error, `Unable to donate ${formatCurrency(donationAmountNeeded)} to ${augInfo.faction}`);
                            }

                        }
                    }

                }
            }
        });


    }

    private runInitialScripts() {
        this.ns.run(SCRIPTS.addScripts);
        this.ns.run(SCRIPTS.autoNuke);
    }

    private updateData() {
        this.lastStartTime = new Date().getTime();
        this.settings = getSettings(this.ns);

        this.player = this.ns.getPlayer();
        this.targetWorkInfos = getAllTargetWorkInfo(this.ns);
        this.workReadyForBatch = this.targetWorkInfos.filter(w => isReadyForBatch(w));
        console.log(`this.workReadyForBatch count: ${this.workReadyForBatch.length}`);

        if (this.workReadyForBatch.length === 0) {
            //if we have nothing ready for batch, let prep use all the ram
            this.adjustedPrepPct *= 1.1;
            this.adjustedPrepPct = Math.min(1.00, this.adjustedPrepPct);
        } else {
            this.adjustedPrepPct = this.DEFAULT_RAM_USAGE_SETTINGS.prepPct;
        }

        this.playerFactionInfo = [];
        this.unownedAugmentationInfo = [];
        this.player.factions.forEach(faction => {
            this.playerFactionInfo.push({
                name: faction,
                reputation: this.ns.getFactionRep(faction),
                favor: this.ns.getFactionFavor(faction)
            });

            let remainingAugs = getUnownedFactionAugmentations(this.ns, faction);
            remainingAugs.forEach(aug => {
                if (!NON_HACKING_AUGMENTS.includes(aug)) {
                    this.unownedAugmentationInfo.push({
                        name: aug,
                        moneyCost: this.ns.getAugmentationPrice(aug),
                        repRequirement: this.ns.getAugmentationRepReq(aug),
                        faction: faction
                    });
                }

            });
        });

        this.playerTools = getPlayerTools(this.ns);
        this.ramUsage = getAllRamUsage(this.ns);

        this.expGain = this.ns.getScriptExpGain();
        this.repGain = getReputationGainRate(this.ns);

        this.scriptMoneyGain = myGetScriptIncome(this.ns);
        this.hacknetMoneyGain = getHacknetIncome(this.ns);
        this.gangMoneyGain = getGangIncome(this.ns);

        this.totalMoneyGain = this.scriptMoneyGain + this.gangMoneyGain + this.hacknetMoneyGain;


    }

    private updateRunTime() {
        this.scriptRunTime = new Date().getTime() - this.lastStartTime;
    }

}
