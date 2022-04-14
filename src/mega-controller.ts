import {DARK_DATA, DebugLevel, NON_HACKING_AUGMENTS, SCRIPTS, THE_RED_PILL, TOAST_DURATION, TOAST_VARIANT} from '/lib/consts';
import {singleHack, useAvailableRunnersForWork} from '/lib/hack-utils';
import {
    debugLog,
    formatBigNumber,
    formatBigRam,
    formatBigTime,
    formatCurrency,
    formatPercent,
    getAllRamUsage,
    getDonationNeededForReputation,
    getPlayerTools,
    getSettings,
    getUnownedFactionAugmentations,
    indent
} from '/lib/utils';
import {getAllTargetWorkInfo, isReadyForBatch} from '/lib/utils-controller';
import {getGangIncome, getHacknetIncome, myGetScriptIncome} from '/lib/utils-crime';
import {displayHeader, doInstallReset, getReputationGainRate, purchaseProgram} from '/lib/utils-player';
import {NS, Player} from '/NetscriptDefinitions';
import {IRamUsage} from '/old-controllers/home-controller';
import {IDarkwebTool, IGlobalSettings, IRamUsageSettings, ITargetWorkInfo, TaskType} from '/types';

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
    private readonly DEFAULT_RAM_USAGE_SETTINGS: IRamUsageSettings = {batchPct: .40, prepPct: .40, sharePct: .10, expPct: .10};
    private readonly SLEEP_TIME: number = 1000;
    private adjustedPrepPct: number = this.DEFAULT_RAM_USAGE_SETTINGS.prepPct;
    private lastStartTime: number = new Date().getTime();
    private neededFavorToDonate: number;
    private player!: Player;
    private playerFactionInfo: IFactionInfo[] = [];
    private playerTools!: IPlayerTools;
    private scriptRunTime: number = 0;
    private settings: IGlobalSettings = {};
    private targetWorkInfos: ITargetWorkInfo[] = [];
    private unownedAugmentationInfo: IAugmentationInfo[] = [];
    private workReadyForBatch: ITargetWorkInfo[] = [];
    private ramUsage!: IRamUsage;
    private expGain: number = 0;
    private repGain: number = 0;
    private scriptMoneyGain: number = 0;
    private hacknetMoneyGain: number = 0;
    private gangMoneyGain: number = 0;
    private totalMoneyGain: number = 0;
    private singleWeakenRam: number;
    private singleGrowRam: number;

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
            this.purchaseAvailableAugmentations();

            this.doHacking();

            this.updateRunTime();
            await this.ns.sleep(this.SLEEP_TIME);
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
        this.ns.print(`${indent()} Prep RAM Percent: ${formatPercent(this.adjustedPrepPct)}`);
        this.ns.print(`${indent()} Num. Ready for Batch: ${this.workReadyForBatch.length}`);
        this.ns.print('');
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

    private displayIncomeStats() {



        /*
        let incomeTable = new Table(ns);
        let tableData: ITableData[] = [
            { '$/s': moneyIncome, 'xp/s': expIncome, 'rep/s': repIncome }

        ];
        incomeTable.setData([
            { '$$/s': moneyIncome, 'Exp/s': expIncome, 'Rep/s': repIncome }
        ]);
        incomeTable.print();
        */



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

        this.displayRamUsage();

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

    private doHacking() {

        if (this.workReadyForBatch.length === 0) {
            let minHackTarget = this.targetWorkInfos.find(w => !isReadyForBatch(w));
            if (minHackTarget) {
                singleHack(this.ns, minHackTarget.target.hostname);
            }
        }


        this.prepAllTargets();

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
