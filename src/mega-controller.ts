import {addScripts} from '/addScripts';
import {
    COMPANY_FACTIONS,
    DARK_DATA,
    DebugLevel,
    GANG_FACTIONS,
    HACK_FACTIONS,
    HOME,
    MAX_HOME_SERVER_RAM,
    NON_HACKING_AUGMENTS,
    OTHER_FACTIONS,
    SCRIPTS,
    THE_RED_PILL,
    TOAST_DURATION,
    TOAST_VARIANT
} from '/lib/consts';
import {useAvailableRunnersForWork, useRunnersForWork} from '/lib/hack-utils';
import {
    debugLog,
    filterFirstAvailableRunnerForScriptThreads,
    formatBigNumber,
    formatBigRam,
    formatCurrency,
    formatPercent,
    getAllRamUsage,
    getAllRunners,
    getAvailablePlayerMoney,
    getDonationNeededForReputation,
    getFirstAvailableRunnerForScript,
    getGangIncome,
    getHacknetIncome,
    getPlayerTools,
    getRandomId,
    getServerFreeRam,
    getSettings,
    getThreadsAvailableForScript,
    getUnownedFactionAugmentations,
    indent,
    myGetScriptIncome,
    round,
    runHack,
    setSettings
} from '/lib/utils';
import {getAllTargetWorkInfo, isReadyForBatch} from '/lib/utils-controller';
import {
    bigFactionList,
    calcNextFavorResetAmount,
    claimedEarnedFactionRep,
    displayFactionProgress,
    displayHeader,
    displayHomeUpgradeInfo,
    displayNextAugmentInfo,
    displayNFGInfo,
    displayServerStats,
    displayWorldDaemonProgress,
    doInstallReset,
    getAvailableCityFactions,
    getCompany,
    getHomeServers,
    getNextHomeServerSize,
    getReputationGainRate,
    HomeServer,
    installBackdoors,
    isCompanyFaction,
    ITargetAugmentation,
    joinFactions,
    leaveTheCave,
    makeMoneyCostTimeString,
    purchaseProgram,
    workOnReputation
} from '/lib/utils-player';
import {NS, Player} from '/NetscriptDefinitions';
import {getRunnerJobsForScript, makeBatchRequest} from '/old-controllers/batch';
import {IRamUsage} from '/old-controllers/home-controller';
import {doDonationReset} from '/old-controllers/player-controller';
import {IBatchRequest, IDarkwebTool, IFaction, IGlobalSettings, IRamUsageSettings, IRunnerJob, ITargetWorkInfo, RunnerInfo, TaskType} from '/types';

export async function main(ns: NS) {

    let controller = new MegaController(ns);
    await controller.doRun();

}

const EXP_TARGET: string = 'joesguns';

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
    private readonly DEFAULT_RAM_USAGE_SETTINGS: IRamUsageSettings = {batchPct: .80, prepPct: .40, sharePct: .10, expPct: .99};
    private readonly HACK_PCT_MAX: number = .90;
    private readonly HACK_PCT_MIN: number = 0.005;
    private readonly HACK_PCT_SCALAR: number = 0.1;
    private readonly SLEEP_TIME: number = 1000;
    private adjustedBatchPct: number = this.DEFAULT_RAM_USAGE_SETTINGS.batchPct;
    private adjustedExpPct: number = this.DEFAULT_RAM_USAGE_SETTINGS.expPct;
    private adjustedPrepPct: number = this.DEFAULT_RAM_USAGE_SETTINGS.prepPct;
    private adjustedSharePct: number = this.DEFAULT_RAM_USAGE_SETTINGS.sharePct;
    private availableMoney: number = 0;
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
    private targetAug: ITargetAugmentation | undefined;
    private targetWorkInfos: ITargetWorkInfo[] = [];
    private totalMoneyGain: number = 0;
    private unownedAugmentationInfo: IAugmentationInfo[] = [];
    private workReadyForBatch: ITargetWorkInfo[] = [];
    private doSharing: boolean = false;
    private expRam: number = 0;
    private shareScriptRam: number = 0;
    private doEXPing: boolean = false;
    private batchSuccesses: number = 0;
    private runners: RunnerInfo[] = [];
    private favorToDonate: number = 0;


    constructor(private ns: NS) {
        ns.tail();
        ns.disableLog('ALL');
        this.updateData();
        this.neededFavorToDonate = this.ns.getFavorToDonate();
        this.singleWeakenRam = this.ns.getScriptRam(SCRIPTS.weaken);
        this.singleGrowRam = this.ns.getScriptRam(SCRIPTS.grow);
        this.expRam = this.ns.getScriptRam(SCRIPTS.expGain);
        this.shareScriptRam = this.ns.getScriptRam(SCRIPTS.myShare);
        this.favorToDonate = ns.getFavorToDonate();
    }

    public async doRun() {

        this.runInitialScripts();

        while (true) {

            this.updateData();
            this.displayInfo();

            ////////////////
            //do work
            this.upgradeHomeComputer();
            this.buyDarkwebTools();
            await installBackdoors(this.ns);
            claimedEarnedFactionRep(this.ns, true); //should be before purchaseAvailableAugmentations()
            this.purchaseAvailableAugmentations();

            await this.doReputationWork();



            joinFactions(this.ns);

            await this.tryPurchaseServer();


            await this.doRunnerWork();



            await leaveTheCave(this.ns);

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
        /*
                debugLog(this.ns, DebugLevel.info, 'tryPurchaseServer()', {
                    nextRamSize,
                    serverCost,
                    playerHasEnoughMoney,
                    homeServersFull,
                    smallestServer
                });
        */
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
            this.player.tor = this.ns.singularity.purchaseTor();
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
                /* I really have no use for these two
                if (!this.playerTools.scan1) {
                    this.playerTools.scan1 = purchaseProgram(this.ns, this.player, DARK_DATA.tools.scan1);
                }
                if (!this.playerTools.scan2) {
                    this.playerTools.scan2 = purchaseProgram(this.ns, this.player, DARK_DATA.tools.scan2);
                }
                 */
                if (!this.playerTools.prof) {
                    this.playerTools.prof = purchaseProgram(this.ns, this.player, DARK_DATA.tools.prof);
                }

            }

        }

    }

    private displayHackingInfo() {
        this.ns.print(`Hacking:`);
        this.ns.print(`${indent()}Prep RAM Percent: ${formatPercent(this.adjustedPrepPct)}`);
        this.ns.print(`${indent()}Batch RAM Percent: ${formatPercent(this.adjustedBatchPct)}`);
        this.ns.print(`${indent()}Num. Ready for Batch: ${this.workReadyForBatch.length}`);
        this.ns.print(`${indent()}Hack \$\$ Percent: ${formatPercent(this.settings.hackPercent ?? 0, 3)}`);
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

        displayWorldDaemonProgress(this.ns);

        this.displayNextDarkwebTool();
        displayNextAugmentInfo(this.ns, this.targetAug);
        displayFactionProgress(this.ns);
        displayNFGInfo(this.ns);


        displayHomeUpgradeInfo(this.ns);
        displayServerStats(this.ns, this.costMultiplierBeforeBuying);


        this.displayHackingInfo();
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

            let etaString = makeMoneyCostTimeString(this.ns, nextTool.cost);

            //let etaTime = new Date();
            //let estTimeLeft = (remainingCost / incomePerSec) * 1000;
            //etaTime.setTime(new Date().getTime() + estTimeLeft);
            //let etaString = etaTime.toLocaleString('en-US', {hour: 'numeric', minute: 'numeric', second: 'numeric'});

            this.ns.print(`Next Darkweb tool: '${nextTool.name}'`);
            this.ns.print(`${indent()}Cost: ${etaString}`);
            //this.ns.print(`${indent()}Time left: ${formatBigTime(estTimeLeft).padStart(6)}, ETA: ${etaString}`);

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

        this.ns.print(`${indent()}Batch: ${formatBigRam(this.ramUsage.batchRam).padStart(pad1)}, ${formatPercent(this.ramUsage.batchRam /
            this.ramUsage.totalMax, 1).padStart(pad2)}`);

        this.ns.print(`${indent()}Hack:  ${formatBigRam(this.ramUsage.batchRam).padStart(pad1)}, ${formatPercent(
            this.ramUsage.hackRam / this.ramUsage.totalMax,
            1
        ).padStart(pad2)}`);

        this.ns.print(`${indent()}Prep:  ${formatBigRam(this.ramUsage.prepRam).padStart(pad1)}, ${formatPercent(
            this.ramUsage.prepRam / this.ramUsage.totalMax,
            1
        ).padStart(pad2)}`);

        this.ns.print(`${indent()}Share: ${formatBigRam(this.ramUsage.shareRam).padStart(pad1)}, ${formatPercent(this.ramUsage.shareRam /
            this.ramUsage.totalMax, 1).padStart(pad2)}`);

        this.ns.print(`${indent()}EXP:   ${formatBigRam(this.ramUsage.expRam).padStart(pad1)}, ${formatPercent(
            this.ramUsage.expRam / this.ramUsage.totalMax,
            1
        ).padStart(pad2)}`);

        this.ns.print(`${indent()}Stanek:${formatBigRam(this.ramUsage.stanekRam).padStart(pad1)}, ${formatPercent(this.ramUsage.stanekRam /
            this.ramUsage.totalMax, 1).padStart(pad2)}`);

        this.ns.print(`${indent()}Other: ${formatBigRam(this.ramUsage.otherRam).padStart(pad1)}, ${formatPercent(this.ramUsage.otherRam /
            this.ramUsage.totalMax, 1).padStart(pad2)}`);
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
                let taskJobs = getRunnerJobsForScript(this.ns, this.runners, param.script, param.threads, request.target, param.delay, batchId);
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
            //debugLog(this.ns, DebugLevel.info, `Batch Job: '${j.scriptName}', t=${j.threads}, Runner:[${j.runner}] args:${j.args}`,)

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
                debugLog(
                    ns,
                    DebugLevel.error,
                    `[${j.runner}] had ${round(getServerFreeRam(ns, j.runner), 1)} free ram. Should have been able to run ${availableThreads} threads`
                );
            }

            if (success) {
                let runner = this.runners.find(r => r.hostname === j.runner);
                if (runner) {
                    runner.freeRam -= j.ramUsed;
                } else {
                    debugLog(this.ns, DebugLevel.error, `Could not find runner ${j.runner} for the job!`, {job: j});
                }
            }

        }
        return success;
    }

    private async doHacking() {



    }

    private async doMaxBatches(): Promise<number> {
        const MAX_PASSES = 5;

        let totalSuccessfulBatchCount = 0;
        let totalBatchRamUsed = 0;

        let successfulBatchesThisRun = 0;

        let batchPassCount = 0;

        let batchRunThisPass = false;

        let maxBatchRamToUse = this.adjustedBatchPct * this.ramUsage.totalMax;
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



    private findNextAugmentationToWorkToward(): ITargetAugmentation | undefined {

        //based on the Rep we have right now,
        // which faction has the augmentation that requires the least additional reputation?
        let allFactions: IFaction[] = [];


        //only include hacking factions that we've joined, else we might not be able to work for them yet.
        let joinedHackingFactions = Object.values(HACK_FACTIONS).filter(faction => this.player.factions.includes(faction.name));
        allFactions.push(...joinedHackingFactions);

        allFactions.push(...Object.values(COMPANY_FACTIONS));

        //only add gang factions we've already joined, since they're hard to join
        let joinedGangFactions = Object.values(GANG_FACTIONS).filter(gangFac => this.player.factions.includes(gangFac.name));
        allFactions.push(...joinedGangFactions);


        let availableCityFactions = getAvailableCityFactions(this.ns);
        allFactions.push(...availableCityFactions);

        if (this.player.factions.includes(OTHER_FACTIONS.netburner.name)) {
            allFactions.push(OTHER_FACTIONS.netburner);
        }

        //if we have a Gang, remove it's faction because we can't 'work' for them directly
        if (this.ns.gang.inGang()) {
            let gangFaction = this.ns.gang.getGangInformation().faction;
            allFactions = allFactions.filter(f => f.name !== gangFaction);
        }

        let lowestAdditionsRepCostAdjusted = Number.MAX_VALUE;
        let lowestAdditionalRepCost = Number.MAX_VALUE;

        //TODO
        //we want to find the FACTION that we want to target first
        //then find the next augment in that faction

        let targetAug: ITargetAugmentation | undefined;

        let repMult = this.player.faction_rep_mult;

        for (let i = 0; i < allFactions.length; i++) {
            let faction = allFactions[i];
            let factionFavorMult = 1 + (this.ns.singularity.getFactionFavor(faction.name) / 100.0);

            let totalRepMult = factionFavorMult * repMult;


            let neededAugments = getUnownedFactionAugmentations(this.ns, faction.name);

            //filter out non hacking augments
            neededAugments = neededAugments.filter(a => {
                return !NON_HACKING_AUGMENTS.find(nha => nha === a);
            });


            if (neededAugments.length > 0) {
                for (let i1 = 0; i1 < neededAugments.length; i1++) {
                    const a = neededAugments[i1];
                    let rawRepCost = this.ns.singularity.getAugmentationRepReq(a);
                    let currRep = this.ns.singularity.getFactionRep(faction.name);
                    let moneyCost = this.ns.singularity.getAugmentationPrice(a);

                    let additionalRepCost = rawRepCost - currRep;
                    let adjustedRepCost = additionalRepCost / totalRepMult;

                    if (isCompanyFaction(faction.name)) {
                        let company = getCompany(this.ns, faction.name);
                        if (company) {
                            //we need to take into consideration how long it would take to join the company
                            let compRep = this.ns.singularity.getCompanyRep(faction.name);
                            let additionalCompanyRep = company?.repNeededForInvite - compRep;

                            let companyFavorMult = 1 + (this.ns.singularity.getCompanyFavor(faction.name) / 100.0);
                            let repMult = this.player.company_rep_mult;

                            let totalCompanyMult = companyFavorMult * repMult;
                            additionalCompanyRep /= totalCompanyMult;

                            adjustedRepCost += additionalCompanyRep;
                        }

                    }

                    //if we already have the rep for a desired aug, we'll just buy it when we have the money
                    if (adjustedRepCost < lowestAdditionsRepCostAdjusted && adjustedRepCost > 0) {

                        lowestAdditionsRepCostAdjusted = adjustedRepCost;

                        targetAug = {
                            augName: a,
                            fromFaction: faction,
                            additionalRepNeeded: additionalRepCost,
                            totalRepCost: rawRepCost,
                            moneyCost: moneyCost
                        };
                        lowestAdditionalRepCost = additionalRepCost;
                    }
                }
            }
        }

        return targetAug;
    }

    private prepAllTargets(): { growThreadsStarted: number, weakenThreadsStarted: number, } {
        let weakenThreadsStarted = 0;
        let growThreadsStarted = 0;

        let prepRamUsed = this.ramUsage.prepRam;
        let prepPercent = prepRamUsed / this.ramUsage.totalMax;

        for (const work of this.targetWorkInfos) {
            if (prepPercent < this.adjustedPrepPct) {

                weakenThreadsStarted += useRunnersForWork(this.ns, this.runners, work.target.hostname, SCRIPTS.weaken, work.threadInfos[TaskType.weaken], 1);
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
            if (this.availableMoney >= augInfo.moneyCost) {

                let currRepWithFaction = 0;
                let currFavorWithFaction = 0;
                let factionInfo = this.playerFactionInfo.find(f => f.name === augInfo.faction);
                if (factionInfo) {
                    currRepWithFaction = factionInfo.reputation;
                    currFavorWithFaction = factionInfo.favor;
                } else {
                    //TODO move this to updateData()
                    currRepWithFaction = this.ns.singularity.getFactionRep(augInfo.faction);
                    currFavorWithFaction = this.ns.singularity.getFactionFavor(augInfo.faction);
                }

                if (augInfo.repRequirement <= currRepWithFaction) {
                    let success = this.ns.singularity.purchaseAugmentation(augInfo.faction, augInfo.name);
                    if (success) {
                        this.ns.toast(`'${augInfo.name}' purchased from ${augInfo.faction}!`, TOAST_VARIANT.success, TOAST_DURATION);

                        this.unownedAugmentationInfo = this.unownedAugmentationInfo.filter(aug => aug != augInfo);

                        //if we've purchased the last augmentation we need, and we're working for this faction, stop
                        let augsForThisFaction = this.unownedAugmentationInfo.filter(a => a.faction === augInfo.faction);
                        if (augsForThisFaction.length === 0 && this.player.isWorking && this.player.currentWorkFactionName === augInfo.faction) {
                            this.ns.toast(`Purchased the last augmentation from ${augInfo.faction}!`, TOAST_VARIANT.info, TOAST_DURATION);
                            this.ns.singularity.stopAction();
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
                            let success = this.ns.singularity.donateToFaction(augInfo.faction, donationAmountNeeded);
                            if (success) {
                                this.ns.toast(
                                    `Donated ${formatCurrency(donationAmountNeeded)} to ${augInfo.faction} for ${formatBigNumber(additionalRepNeeded)} reputation!`,
                                    TOAST_VARIANT.success,
                                    TOAST_DURATION
                                );
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
        this.availableMoney = getAvailablePlayerMoney(this.ns, this.player, this.settings);
        this.targetWorkInfos = getAllTargetWorkInfo(this.ns);


        this.workReadyForBatch = this.targetWorkInfos.filter(w => isReadyForBatch(w));

        this.targetAug = this.findNextAugmentationToWorkToward();
        /*
                //we we're targeting a hacking faction that we haven't joined yet,
                //we won't be 'doing' anything.
                //Find an augment we CAN work towards
                if (this.targetAug) {
                    let factionName = this.targetAug.fromFaction.name;
                    if (isHackingFaction(factionName) && !this.player.factions.includes(factionName)) {
                        this.targetAug = this.findNextAugmentationToWorkToward();
                    }
                }
        */

        if (this.targetAug) {



            if (this.targetAug.moneyCost <= this.availableMoney) {
                //we have enough money,
                //turn down batch %
                this.adjustedBatchPct = .1;
                this.adjustedSharePct = .5;
                this.adjustedExpPct = .5;
            } else {
                this.adjustedBatchPct = this.DEFAULT_RAM_USAGE_SETTINGS.batchPct;
                this.adjustedSharePct = this.DEFAULT_RAM_USAGE_SETTINGS.sharePct;
                this.adjustedExpPct = this.DEFAULT_RAM_USAGE_SETTINGS.expPct;
            }
        }

        if (this.player.isWorking && this.player.currentWorkFactionName) {
            this.doSharing = true;
        } else {
            //since we're not using it for sharing, might as well use it for exp
            this.adjustedExpPct += this.adjustedSharePct;
            this.adjustedSharePct = 0;
        }

        let expTarget = this.targetWorkInfos.find(t => t.target.hostname === EXP_TARGET);
        if (expTarget) {
            //only run exp work if the EXP Target doesn't need weakening
            if (expTarget.threadInfos[TaskType.weaken].moreNeeded === 0) {
                this.doEXPing = true;

            } else {
                debugLog(this.ns, DebugLevel.warn, `[${EXP_TARGET}] needed weakening!`);
            }
        } else {
            debugLog(this.ns, DebugLevel.warn, `Missing exp target! [${EXP_TARGET}]`);
        }



        if (this.workReadyForBatch.length === 0) {
            //if we have nothing ready for batch, let prep use all the ram
            this.adjustedPrepPct *= 1.1;
            let MAX_PREP_RAM = .8;
            this.adjustedPrepPct = Math.min(MAX_PREP_RAM, this.adjustedPrepPct);
        } else {
            this.adjustedPrepPct = this.DEFAULT_RAM_USAGE_SETTINGS.prepPct;
        }



        this.playerFactionInfo = [];
        this.unownedAugmentationInfo = [];
        this.player.factions.forEach(faction => {
            this.playerFactionInfo.push({
                name: faction,
                reputation: this.ns.singularity.getFactionRep(faction),
                favor: this.ns.singularity.getFactionFavor(faction)
            });

            let remainingAugs = getUnownedFactionAugmentations(this.ns, faction);
            remainingAugs.forEach(aug => {
                if (!NON_HACKING_AUGMENTS.includes(aug)) {
                    this.unownedAugmentationInfo.push({
                        name: aug,
                        moneyCost: this.ns.singularity.getAugmentationPrice(aug),
                        repRequirement: this.ns.singularity.getAugmentationRepReq(aug),
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

        if (this.batchSuccesses === 0) {
            //decrease the hack percent
            let newHackPercent = (this.settings.hackPercent ?? 0) * (1 - this.HACK_PCT_SCALAR);
            newHackPercent = Math.max(round(newHackPercent, 3), this.HACK_PCT_MIN);

            if (newHackPercent !== this.settings.hackPercent) {
                setSettings(this.ns, {hackPercent: newHackPercent});
            }
        } else if (this.batchSuccesses >= this.workReadyForBatch.length) {

            let newHackPercent = (this.settings.hackPercent ?? 0) * (1 + this.HACK_PCT_SCALAR);
            newHackPercent = Math.min(round(newHackPercent, 3), this.HACK_PCT_MAX);

            if (newHackPercent !== this.settings.hackPercent) {
                setSettings(this.ns, {hackPercent: newHackPercent});
            }

        }

        this.runners = getAllRunners(this.ns);

    }

    private updateRunTime() {
        this.scriptRunTime = new Date().getTime() - this.lastStartTime;
    }

    private upgradeHomeComputer() {

        if (this.availableMoney > this.ns.singularity.getUpgradeHomeRamCost()) {
            let success = this.ns.singularity.upgradeHomeRam();
            if (success) {
                let server = this.ns.getServer(HOME);
                this.ns.toast(`Home Computer RAM upgraded to ${formatBigRam(server.maxRam)}!!`, TOAST_VARIANT.info, TOAST_DURATION);
            }
        } else if (this.player.money > this.ns.singularity.getUpgradeHomeCoresCost()) {
            let success = this.ns.singularity.upgradeHomeCores();
            if (success) {
                let server = this.ns.getServer(HOME);
                this.ns.toast(`Home Computer Cores upgraded to ${server.cpuCores}!!`, TOAST_VARIANT.info, TOAST_DURATION);
            }
        }
    }

    private async doExtra() {



    }

    private async doExtraShare(): Promise<number> {
        let shareThreads = 0;


        if (this.player.isWorking && this.player.currentWorkFactionName) {

            let ramUsedToShare = this.ramUsage.shareRam;
            let maxRamToUse = this.ramUsage.totalMax * this.adjustedSharePct;
            let singleShareRam = this.ns.getScriptRam(SCRIPTS.myShare);


            for (const runner of this.runners) {
                let availableThreads = getThreadsAvailableForScript(this.ns, runner.hostname, SCRIPTS.myShare);
                availableThreads = Math.floor(availableThreads * .8);
                if (availableThreads > 0) {
                    let procId = this.ns.exec(SCRIPTS.myShare, runner.hostname, availableThreads, getRandomId());
                    if (procId > 0) {
                        //debugLog(this.ns, DebugLevel.success, `Starting ${availableThreads} share threads!`);
                        shareThreads += availableThreads;
                        let ramUsed = availableThreads * singleShareRam;
                        runner.freeRam -= ramUsed;
                        ramUsedToShare += ramUsed;
                    } else {
                        debugLog(this.ns, DebugLevel.error, `Unable to start ${availableThreads} share threads on ${runner.hostname}!`);
                    }
                }
                if (ramUsedToShare >= maxRamToUse) {
                    break;
                }

            }

        }
        return shareThreads;
    }

    private async doExtraGainExp(): Promise<number> {
        let extraThreads = 0;

        let usage = getAllRamUsage(this.ns);
        let singleExpRam = this.ns.getScriptRam(SCRIPTS.expGain);
        let expRamUsage = this.ramUsage.expRam;
        let expPercent = expRamUsage / this.ramUsage.totalMax;

        let maxPasses = 10;
        let currPass = 0;

        while (expPercent < this.adjustedExpPct && currPass < maxPasses) {
            currPass++;
            let runner = getFirstAvailableRunnerForScript(this.ns, SCRIPTS.expGain);
            if (runner) {
                let availableThreads = getThreadsAvailableForScript(this.ns, runner, SCRIPTS.expGain);
                let threadsToRun = Math.floor(availableThreads);
                if (threadsToRun > 0) {

                    let procId = this.ns.exec(SCRIPTS.expGain, runner, threadsToRun, EXP_TARGET, getRandomId());
                    if (procId > 0) {
                        extraThreads += threadsToRun;
                        expRamUsage += threadsToRun * singleExpRam;
                        //debugLog(this.ns, DebugLevel.success, `Running ${threadsToRun} EXP Gain threads`);
                    } else {
                        debugLog(this.ns, DebugLevel.error, `Unable to run EXP script on ${EXP_TARGET}`);
                    }
                }
            } else {
                //debugLog(this.ns, DebugLevel.warn, `No available runners to run EXP script on ${EXP_TARGET}`);
            }

            usage = getAllRamUsage(this.ns);
            expPercent = this.ramUsage.expRam / this.ramUsage.totalMax;

            await this.ns.sleep(10);
        }

        return extraThreads;

    }

    private async doRunnerWork() {


        if (this.workReadyForBatch.length > 0) {
            this.batchSuccesses = await this.doMaxBatches();

        } else {
            let minHackTarget = this.targetWorkInfos.find(w => !isReadyForBatch(w));
            if (minHackTarget) {
                let runner = filterFirstAvailableRunnerForScriptThreads(this.ns, this.runners, SCRIPTS.hack, 1);
                if (runner) {
                    let pid = runHack(this.ns, runner.hostname, minHackTarget.target.hostname, 1);
                    if (pid) {
                        runner.freeRam -= this.ns.getScriptRam(SCRIPTS.hack);
                    } else {

                    }
                } else {
                    //debugLog(ns, DebugLevel.warn, `No available runner for singleHack()`);

                }

                //singleHack(this.ns, minHackTarget.target.hostname);
            }
        }



        this.prepAllTargets();

        if (this.doSharing) {
            await this.doExtraShare();
        }

        if (this.doEXPing) {
            await this.doExtraGainExp();
        }
    }

    private async doReputationWork() {
        let targetFaction: IFaction;

        if (this.targetAug) {
            targetFaction = this.targetAug.fromFaction;



            let bigFactionProgress: any[] = [];
            bigFactionList.forEach(faction => {
                if (this.player.factions.includes(faction.name)) {
                    let currFavor = this.ns.singularity.getFactionFavor(faction.name);
                    let gainedFavor = this.ns.singularity.getFactionFavorGain(faction.name);

                    let nextResetAmount = calcNextFavorResetAmount(this.ns, currFavor);
                    let remainingFavorUntilReset = nextResetAmount - currFavor - gainedFavor;


                    bigFactionProgress.push({
                        faction: faction,
                        currFavor,
                        gainedFavor,
                        nextResetAmount,
                        remainingFavorUntilReset
                    });
                }
            });



            //if we're ready to reset this faction, we can target the next big faction
            bigFactionProgress = bigFactionProgress.filter(f => f.remainingFavorUntilReset > 0);
            bigFactionProgress = bigFactionProgress.filter(f => {
                let factionAugments = getUnownedFactionAugmentations(this.ns, f.faction.name);
                factionAugments = factionAugments.filter(aug => !NON_HACKING_AUGMENTS.includes(aug));
                return factionAugments.length > 0;
            });
            if (bigFactionProgress.length > 0) {
                bigFactionProgress.sort((a, b) => {
                    return a.nextResetAmount - b.nextResetAmount ||
                        a.remainingFavorUntilReset - b.remainingFavorUntilReset;
                });
                targetFaction = bigFactionProgress[0].faction;
            }



            debugLog(this.ns, DebugLevel.info, `Target Faction to work on: ${targetFaction.name}`, bigFactionProgress);
            workOnReputation(this.ns, targetFaction, this.targetAug.totalRepCost, this.settings.autoSwitchTasks);

            await doDonationReset(this.ns, bigFactionList);

        } else {
            debugLog(this.ns, DebugLevel.warn, `No target augmentation!`);
        }

    }
}
