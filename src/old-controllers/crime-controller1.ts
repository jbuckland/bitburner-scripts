import {IGlobalSettings, OtherGangInfo} from '/types';
import {CrimeMode, DebugLevel, INDENT_STRING, MAX_GANG_MEMBERS, TOAST_DURATION, TOAST_VARIANT} from 'lib/consts';
import {GANG_EQUIP_TYPES, GANG_TASK, MEMBER_NAME} from 'lib/crime-consts';
import {
    debugLog,
    formatBigNumber,
    formatCurrency,
    formatPercent,
    getAvailablePlayerMoney,
    getSettings,
    getUnownedFactionAugmentations,
    round,
    timestamp
} from 'lib/utils';
import {getAllMembers, getGangDiscountMult, getOtherGangsInfo, getWantedPenaltyMult} from 'lib/utils-crime';
import {getAugmentFactionCostInfo} from 'lib/utils-player';
import {ITableData, Table} from 'lib/utils-table';
import {Gang, GangGenInfo, GangMemberAscension, GangMemberInfo, GangTaskStats, NS, Player} from 'NetscriptDefinitions';

type MyMemberInfo = GangMemberInfo & {
    targetTask: GANG_TASK,
    totalAvgAscIncrease: number,
    totalAvgAscMult: number,
    afterAscAvgMult: number,
    combatAvgAscMult: number,
    combatAvg: number,
    ascResults?: GangMemberAscension,
    wantedPenaltyGain: number

};

export async function main(ns: NS) {
    let svc = new CrimeController(ns);

    await svc.doRun();
}

const SLEEP_TIME = 2000;
const MAX_ASCENSION_THRESHOLD: number = 1.25; //this is a percentage. 1.5 = 150% of original
const MIN_ASCENSION_THRESHOLD: number = 1.1;

const WANTED_PENALTY_THRESHOLD: number = .01;

let territoryPercent = .1;
let minOnMainTask = 1;

const MAX_PERCENT_TO_TRAIN = 0.4; // this will be scaled by gangDiscountMult
const MAX_GANG_FACTION_REP_NEEDED: number = 2.5e6;
const PER_MEMBER_RESPECT_EXP: number = 2.5;
const PER_MEMBER_RESPECT_MULT: number = 1200;

//Territory Consts
const MIN_ON_TERRITORY = 1;
const WIN_CHANCE_TO_START_WAR: number = 0.6;
const WIN_CHANCE_TARGET = 0.9;

//const TASK_MONEY: GANG_TASK = GANG_TASK.trafficking;

export class CrimeController {
    private _player!: Player;
    private _gang: Gang;
    private equipmentList: { name: string, type: GANG_EQUIP_TYPES, cost: number }[] = [];
    //private taskList: GangTaskStats[];
    private taskMain: GANG_TASK = GANG_TASK.mug;
    private MAX_TERRITORY_TARGET: number = .90;
    private gangInfo!: GangGenInfo;
    private wantedPenalty: number = 0;
    private members: MyMemberInfo[] = [];
    private settings: IGlobalSettings = {};

    private tasksInfo: { [key: string]: GangTaskStats } = {};
    private adjustedAscensionThreshold: number = MAX_ASCENSION_THRESHOLD;
    private otherGangs: OtherGangInfo[] = [];
    private otherGangsWithTerritory: OtherGangInfo[] = [];
    private adjustedNumberToTrain: number = 0;
    private gangFactionRep: number = 0;



    public constructor(private ns: NS) {
        this._gang = ns.gang;

        this.tasksInfo[GANG_TASK.terrorism] = ns.gang.getTaskStats(GANG_TASK.terrorism);
        this.tasksInfo[GANG_TASK.mug] = ns.gang.getTaskStats(GANG_TASK.mug);

        this.updateData();
    }

    public async doRun() {
        this.ns.tail();
        this.ns.disableLog('ALL');

        while (true) {

            this.updateData();

            if (this.members.length < MAX_GANG_MEMBERS) {
                this.tryRecruitMember();

            } else {
                //we've recruited everyone, so let's change some parameters
            }

            //simple stuff

            //buy for members who are the farthest from ascending, and losing the equipment
            this.members.sort((a, b) => a.totalAvgAscIncrease - b.totalAvgAscIncrease);
            this.members.forEach(m => {
                this.buyEquip(m);
            });

            let memberAscendedThisCycle = false;
            for (const m of this.members) {
                if (!memberAscendedThisCycle) {
                    memberAscendedThisCycle = this.ascendMember(m);
                }
            }

            if (this.settings.crimeMode === CrimeMode.territory) {

                if (this.otherGangsWithTerritory.length > 0) {
                    this.otherGangsWithTerritory.sort((a, b) => a.winChance - b.winChance);
                    let strongest = this.otherGangsWithTerritory[0];

                    if (strongest.winChance >= WIN_CHANCE_TO_START_WAR) {

                        if (!this.gangInfo.territoryWarfareEngaged) {
                            debugLog(this.ns, DebugLevel.info, 'Begun, the Territory Wars has!');
                            this.ns.gang.setTerritoryWarfare(true);
                        }

                    } else {
                        this.ns.gang.setTerritoryWarfare(false);
                    }
                }

                this.managerMemberJobsTerritory();

            } else if (this.settings.crimeMode === CrimeMode.respect) {
                this.managerMemberJobsRespect();

            } else {
                this.managerMemberJobsMoney();
            }

            this.displayStats(this.members);
            await this.ns.sleep(SLEEP_TIME);
        }

    }

    private adjustWantedLevel() {
        if (this.wantedLevelOk()) {
            this.decreaseVigilante();
        } else {
            this.increaseVigilante();
        }
    }

    private adjustWantedLevelRespect(members: MyMemberInfo[]) {

        let fixTask: GANG_TASK = GANG_TASK.vigilante;
        let fixTaskStats = this.ns.gang.getTaskStats(fixTask);
        let vigMembers = this.members.filter(m => m.targetTask === fixTask);

        //we need more vigilantes
        if (!this.wantedLevelOk()) {

            //we'll take the biggest wanted gainers first
            //NOTE: this doesn't account for reputation offsetting wanted level... somehow

            members.sort((a, b) => b.wantedPenaltyGain - a.wantedPenaltyGain);

            let memberToUse = members.find(m => m.targetTask === GANG_TASK.unassigned);

            if (!memberToUse) {
                memberToUse = members.find(m => m.targetTask !== fixTask);
            }

            if (memberToUse) {

                //check to see if vigilante with this member would actually do anything
                let wantedGain = this.ns.formulas.gang.wantedLevelGain(this.gangInfo, memberToUse, fixTaskStats);
                if (wantedGain < 0) {
                    debugLog(this.ns, DebugLevel.info, `Fix wanted penalty of ${this.wantedPenalty
                    }%. Switching ${memberToUse.name} from ${memberToUse.targetTask} to ${fixTask}`);
                    memberToUse.targetTask = fixTask;
                } else {
                    //let's set them to training
                    memberToUse.targetTask = GANG_TASK.trainCombat;
                }

            }

        } else {
            //we can assign some users to doing real work!
            //debugLog(this._ns, DebugLevel.info, `Wanted penalty is ok! ${wantedPenalty}%`);
            let memberToUse = members.find(m => m.targetTask === GANG_TASK.unassigned);

            if (!memberToUse) {
                memberToUse = members.find(m => m.targetTask == fixTask);
            }

            if (memberToUse) {

                let wantedOnTerritory = Math.floor(Math.max(MIN_ON_TERRITORY, members.length * territoryPercent));
                let currOnTerritory = members.filter(m => m.targetTask === GANG_TASK.territory).length;

                if (wantedOnTerritory > currOnTerritory) {
                    debugLog(
                        this.ns,
                        DebugLevel.info,
                        `Need more on Territory. Switching ${memberToUse.name} from ${memberToUse.targetTask} to ${GANG_TASK.territory}`
                    );
                    memberToUse.targetTask = GANG_TASK.territory;
                } else {
                    let mainTask = this.getMainTask(memberToUse);
                    debugLog(this.ns, DebugLevel.info, `Enough on Territory. Switching ${memberToUse.name} from ${memberToUse.targetTask} to ${mainTask}`);
                    memberToUse.targetTask = mainTask;

                }
            } else {
                debugLog(this.ns, DebugLevel.info, `No member to reassign to regular work`);
            }

        }
    }

    private ascendMember(member: MyMemberInfo): boolean {
        let ascended = false;

        if (this.wantedLevelOk()) {
            if (member.ascResults) {
                //debugLog(this._ns, DebugLevel.info, `${member.name} avg Asc increase: ${formatPercent(avgStatIncrease - 1, 2)}`);
                if (member.totalAvgAscIncrease >= (this.adjustedAscensionThreshold - 1)) {
                    debugLog(this.ns, DebugLevel.success, `Ascending ${member.name}!!`);
                    this._gang.ascendMember(member.name);
                    ascended = true;
                } else {
                    // debugLog(this.ns, DebugLevel.info, `NOT ascending ${member.name} because totalAvgAscIncrease too low: ${member.totalAvgAscIncrease}`);
                }

            } else {
                // debugLog(this.ns, DebugLevel.info, `NOT ascending ${member.name} because missing ascResults!`);
            }
        } else {

        }

        return ascended;

    }

    private buyEquip(member: GangMemberInfo) {
        let neededEquip = this.equipmentList.filter(e =>
            //!member.upgrades.includes(e.name) &&
            e.type == GANG_EQUIP_TYPES.augmentation && //testing only buying augmentations
            !member.augmentations.includes(e.name)
        );



        if (neededEquip.length > 0) {

            //buy the cheapest equipment that this member doesn't have
            neededEquip.sort((a, b) => a.cost - b.cost);
            let nextEquip = neededEquip[0];

            let availableMoney = getAvailablePlayerMoney(this.ns, this._player, this.settings);

            if (availableMoney >= nextEquip.cost) {
                let success = this._gang.purchaseEquipment(member.name, nextEquip.name);
                if (success) {
                    if (nextEquip.type === GANG_EQUIP_TYPES.augmentation) {
                        this.ns.toast(`Purchased '${nextEquip.name}' augmentation for ${member.name}`, TOAST_VARIANT.success, TOAST_DURATION);
                    }
                    this._player.money -= nextEquip.cost;
                } else {
                    debugLog(this.ns, DebugLevel.error, `Failed to purchase '${nextEquip.name}' for ${member.name}`);
                }
            }
        }


    }

    private decreaseVigilante() {
        //we can assign some users to doing real work!
        //debugLog(this._ns, DebugLevel.info, `Wanted penalty is ok! ${wantedPenalty}%`);

        let memberToUse = this.members.find(m => m.targetTask == GANG_TASK.vigilante);
        if (memberToUse) {
            let mainTask = this.getMainTask(memberToUse);
            debugLog(this.ns, DebugLevel.info, `Wanted Level OK!. Switching ${memberToUse.name} from ${memberToUse.targetTask} to ${mainTask}`);
            memberToUse.targetTask = mainTask;

        } else {
            //debugLog(this.ns, DebugLevel.info, `No member to reassign to regular work`);
        }
    }

    private displayAscensionInfo(members: MyMemberInfo[]) {
        let ascTable = new Table(this.ns);
        ascTable.headerRow = {'Task': {dataKey: 'Task', text: 'Task', width: GANG_TASK.vigilante.length, order: 1}};

        this.members.sort((a, b) => b.afterAscAvgMult - a.afterAscAvgMult);

        let ascTableData: ITableData[] = this.members.map(d => {
            return {
                Name: d.name,
                'Task': d.task,
                'AvgAsc Inc.': '+' + formatPercent(d.totalAvgAscIncrease, 2),
                'Respect': formatBigNumber(d.earnedRespect),
                'AfterAsc Mult': 'x' + round(d.afterAscAvgMult, 3).toFixed(3),
                'AvgAsc Mult': 'x' + round(d.totalAvgAscMult, 2).toFixed(2),
                //'CombatAsc Mult': 'x' + round(d.combatAvgAscMult, 2).toFixed(2),
                //'HackAsc Mult': 'x' + round(d.hack_asc_mult, 2).toFixed(2),
                'Avg Combat Stat': round(d.combatAvg).toString()
            };

        });

        this.ns.print(`Ascension Stats:`);

        //cost for all equipment

        let totalEquipCost = 0;
        this.equipmentList.forEach(e => {
            if (e.type !== GANG_EQUIP_TYPES.augmentation) {
                totalEquipCost += e.cost;
            }
        });
        let discount = getGangDiscountMult(this.ns);
        this.ns.print(`${INDENT_STRING} Equip Discount: ${formatPercent(1 - discount, 2)}`);
        this.ns.print(`${INDENT_STRING} Total Equip. Cost: ${formatCurrency(totalEquipCost)}`);
        this.ns.print(`${INDENT_STRING} Ascension Threshold: ${formatPercent(this.adjustedAscensionThreshold - 1, 2)}`);

        ascTable.setData(ascTableData);
        ascTable.print();

        this.ns.print('');
    }

    private displayAugmentInfo() {

        this.ns.print('Next augment:');

        let remainingAugNames = getUnownedFactionAugmentations(this.ns, this.gangInfo.faction);

        let augs = remainingAugNames.map(name => getAugmentFactionCostInfo(this.ns, name, this.gangInfo.faction));
        augs.sort((a, b) => a.baseAdditionalRepCost - b.baseAdditionalRepCost);

        /*
                if (targetAug) {

                    //if we can donate to this faction
                    //show how much money we'd need
                    let favorToDonate = ns.getFavorToDonate();
                    let currFavor = ns.singularity.getFactionFavor(targetAug?.fromFaction.name);
                    let donateString = '';

                    let additionalRepNeeded = Math.max(0, targetAug.additionalRepNeeded);

                    let moneyCostTimeString = makeMoneyCostTimeString(ns, targetAug.moneyCost);
                    let repCostTimeString = makeRepCostTimeString(ns, targetAug.totalRepCost, additionalRepNeeded);

                    ns.print(header);
                    ns.print(`${INDENT_STRING}'${targetAug.augName}' from [${targetAug.fromFaction.name}]`);
                    ns.print(`${INDENT_STRING}Money Needed: ${moneyCostTimeString}`);
                    ns.print(`${INDENT_STRING}Rep. Needed: ${repCostTimeString}`);

                    if (currFavor >= favorToDonate) {
                        let donationNeeded = getDonationNeededForReputation(ns, targetAug.additionalRepNeeded);
                        //donateString = `, or \$${formatBigNumber(donationNeeded)} donation`;
                        let donationTimeString = makeMoneyCostTimeString(ns, donationNeeded);
                        ns.print(` ${INDENT_STRING}Or donation: ${donationTimeString}`);
                    }

                } else {
                    ns.print(`${header} ${body}`);
                }

                ns.print('');
        */
        this.ns.print('');

    }

    private displayGangStats() {
        this.ns.print(`Gang Stats:`);
        this.ns.print(`${INDENT_STRING} Crime Mode: ${this.settings.crimeMode}`);
        this.ns.print(`${INDENT_STRING} Wanted Penalty: ${formatPercent(1 - this.gangInfo.wantedPenalty, 2)}`);
        this.ns.print(`${INDENT_STRING} Respect: ${formatBigNumber(this.gangInfo.respect, 2)}, ${formatBigNumber(this.gangInfo.respectGainRate * 5, 2)} resp/sec`);
        this.ns.print(`${INDENT_STRING} Faction Rep: ${formatBigNumber(this.gangFactionRep)}`);



        this.ns.print('');
    }

    private displayJobStats(members: MyMemberInfo[]) {
        this.ns.print(`Member Jobs:`);

        let jobCount: { jobName: string, count: number }[] = [];
        for (let member of members) {

            let count = jobCount.find(c => c.jobName === member.targetTask);
            if (!count) {
                count = {jobName: member.targetTask ?? GANG_TASK.unassigned, count: 0};
                jobCount.push(count);
            }
            count.count++;

        }

        jobCount.sort((a, b) => a.jobName.localeCompare(b.jobName));
        for (let jobCountElement of jobCount) {
            this.ns.print(`${INDENT_STRING} ${jobCountElement.jobName}: ${jobCountElement.count}, ${round(jobCountElement.count / members.length * 100)}%`);
        }

        this.ns.print('');

    }

    private displayStats(members: MyMemberInfo[]) {
        this.ns.clearLog();


        this.displayGangStats();

        this.displayTerritoryInfo();

        this.displayJobStats(members);

        this.displayAscensionInfo(members);

        this.displayAugmentInfo();

        this.ns.print(timestamp());
    }

    private displayTerritoryInfo() {

        let otherGangsWithTerritory = this.otherGangs.filter(g => g.territory > 0);
        otherGangsWithTerritory.sort((a, b) => b.name.length - a.name.length);
        if (otherGangsWithTerritory.length > 0) {
            let warString = '';
            if (this.gangInfo.territoryWarfareEngaged) {
                warString = ', Warfare ENGAGED!';

            }
            this.ns.print(`Territory: ${formatPercent(this.gangInfo.territory, 2)}, Power: ${round(this.gangInfo.power)}${warString}`);
            let longestName = otherGangsWithTerritory[0].name.length;
            otherGangsWithTerritory.sort((a, b) => {
                return (b.territory - a.territory) || (b.power - a.power);
            });
            otherGangsWithTerritory.forEach(g => {
                this.ns.print(`${INDENT_STRING} ${g.name.padEnd(longestName)}: ${formatPercent(
                    g.territory,
                    2
                ).padStart(6)}, Power: ${round(g.power).toString().padStart(4)}, Win: ${formatPercent(g.winChance, 1)}`);

            });
            this.ns.print('');
        }

    }

    private doTerritoryWarfare(info: GangGenInfo, members: MyMemberInfo[]) {


        if (info.territoryClashChance > 0) {
            //we want to have >=TARGET_CLASH_WIN_CHANCE with each faction

            let otherGangsWithTerritory = this.otherGangs.filter(g => g.territory > 0);
            let numMembersToUse = 0;
            if (otherGangsWithTerritory.length > 0) {
                otherGangsWithTerritory.sort((a, b) => a.winChance - b.winChance);
                let strongestGang = otherGangsWithTerritory[0];

                //we need to grow our power.
                //if we're lower than the window, allocate everyone
                //else, reduce the amount of members base on where we are in the window

                //basically, I want to remap the numbers to a percentage from 0-100
                //100: winChance <= (TARGET-window), ==> 0: winChance >=TARGET

                // winChance graph
                //                                            [(Target - window)]V       V[Target]
                // 0-----------------------------------------------------------------------------100
                //                                             [winChance]^

                let windowSize = WIN_CHANCE_TARGET - WIN_CHANCE_TO_START_WAR;

                //if our win chance is within "CLASH_CHANCE_WINDOW_SIZE" much of "TARGET_CLASH_WIN_CHANCE", reduce amount of members doing territory
                let percentMembersToUse = (strongestGang.winChance - WIN_CHANCE_TO_START_WAR) / windowSize;
                percentMembersToUse = Math.min(1, percentMembersToUse); //clamp range to 0-1
                percentMembersToUse = Math.max(0, percentMembersToUse); //clamp range to 0-1
                percentMembersToUse = 1 - percentMembersToUse;

                numMembersToUse = Math.ceil(members.length * percentMembersToUse);

                /*
                if (info.territory < this.MAX_TERRITORY_TARGET) {
                    numMembersToUse = Math.min(MIN_ON_TERRITORY, numMembersToUse);
                }

                 */
            }

            let currentDefenders = members.filter(m => m.targetTask === GANG_TASK.territory);
            let nonDefenders = members.filter(m => m.targetTask !== GANG_TASK.territory);

            nonDefenders.sort((a, b) => b.totalAvgAscMult - a.totalAvgAscMult);

            let additionalNeeded = numMembersToUse - currentDefenders.length;

            let msgPrefix = `Current defenders: ${currentDefenders.length} of ${numMembersToUse}.`;
            if (additionalNeeded < 0) {
                //we have too many, re-assess members job
                let targetMember = currentDefenders[0];
                let mainTask = this.getMainTask(targetMember);
                targetMember.targetTask = mainTask;
                debugLog(this.ns, DebugLevel.info, `${msgPrefix} Too many, switching ${targetMember.name} from ${targetMember.targetTask} to ${mainTask}`);

            } else if (additionalNeeded > 0) {
                //we need more
                let targetMember = nonDefenders[0];
                targetMember.targetTask = GANG_TASK.territory;
                debugLog(
                    this.ns,
                    DebugLevel.info,
                    `${msgPrefix} Not enough, switching ${targetMember.name} from ${targetMember.targetTask} to ${GANG_TASK.territory}`
                );

            } else {
                //debugLog(this.ns, DebugLevel.info, `${msgPrefix} Not switching anyone`);
            }

        }
    }

    private enforceMinimumMainTask(members: MyMemberInfo[]) {
        let moneyMakers = members.filter(m => m.targetTask === this.taskMain);

        if (moneyMakers.length < minOnMainTask) {
            let nonMoneyMaker = members.find(m => m.targetTask !== this.taskMain);
            if (nonMoneyMaker) {
                debugLog(
                    this.ns,
                    DebugLevel.info,
                    `Not enough on main task. Switching ${nonMoneyMaker.name} from ${nonMoneyMaker.targetTask} to ${this.taskMain}`
                );
                nonMoneyMaker.targetTask = this.taskMain;
            }
        }

    }

    private calcLinearMemberRespectNeeded(member: MyMemberInfo) {
        return member.totalAvgAscMult * PER_MEMBER_RESPECT_MULT;
    }

    private calcExponentialMemberRespectNeeded(member: MyMemberInfo) {
        return Math.pow(member.totalAvgAscMult, PER_MEMBER_RESPECT_EXP) * PER_MEMBER_RESPECT_MULT;
    }

    private calcDynamicMemberRespectNeeded(member: MyMemberInfo) {
        if (this.gangFactionRep >= MAX_GANG_FACTION_REP_NEEDED) {
            return this.calcLinearMemberRespectNeeded(member);
        } else {
            return this.calcExponentialMemberRespectNeeded(member);
        }
    }


    private getMainTask(member: MyMemberInfo): GANG_TASK {

        let mainTask = GANG_TASK.unassigned;
        if (this.settings.crimeMode) {

            if (this.settings.crimeMode == CrimeMode.money) {

                if (member.earnedRespect < this.calcDynamicMemberRespectNeeded(member)) {
                    //they need earn respect first
                    let respectTask = this.getBestRespectTask(member, [GANG_TASK.terrorism, GANG_TASK.mug]);
                    if (respectTask) {
                        mainTask = respectTask;

                    } else {
                        mainTask = GANG_TASK.trainCombat;
                    }

                } else {
                    mainTask = GANG_TASK.trafficking;

                }

            } else if (this.settings.crimeMode == CrimeMode.territory) {

                if (member.earnedRespect < this.calcLinearMemberRespectNeeded(member)) {

                    //they need earn respect first

                    mainTask = GANG_TASK.trainCombat;

                    let taskRespGain = this.ns.formulas.gang.respectGain(this.gangInfo, member, this.tasksInfo[GANG_TASK.terrorism]);
                    let taskWantedGain = this.ns.formulas.gang.wantedLevelGain(this.gangInfo, member, this.tasksInfo[GANG_TASK.terrorism]);
                    let taskWantedPenaltyGain = 1 - getWantedPenaltyMult(taskRespGain, taskWantedGain);

                    if (taskWantedPenaltyGain < WANTED_PENALTY_THRESHOLD && taskRespGain > 0) {
                        mainTask = GANG_TASK.terrorism;

                    }


                } else {
                    mainTask = GANG_TASK.territory;

                }

            } else if (this.settings.crimeMode == CrimeMode.respect) {

                let respectTask = this.getBestRespectTask(member, [GANG_TASK.terrorism, GANG_TASK.mug]);
                if (respectTask) {
                    mainTask = respectTask;

                } else {
                    mainTask = GANG_TASK.trainCombat;
                }

            }
        }
        return mainTask;

    }

    private getNewGangMemberName() {
        let memberNames = this._gang.getMemberNames();
        return MEMBER_NAME + memberNames.length.toString();
    }

    private getTaskWantedPenaltyGain(member: MyMemberInfo, task: GANG_TASK) {
        let taskRespGain = this.ns.formulas.gang.respectGain(this.gangInfo, member, this.tasksInfo[task]);
        let taskWantedGain = this.ns.formulas.gang.wantedLevelGain(this.gangInfo, member, this.tasksInfo[task]);

        let taskWantedPenaltyGain = 1 - getWantedPenaltyMult(taskRespGain, taskWantedGain);
        return taskWantedPenaltyGain;
    }

    private increaseVigilante() {
        //we'll take the biggest wanted penalty gainers first
        this.members.sort((a, b) => b.wantedPenaltyGain - a.wantedPenaltyGain);

        let memberToUse = this.members.find(m => m.targetTask === GANG_TASK.unassigned);

        if (!memberToUse) {
            memberToUse = this.members.find(m => m.targetTask !== GANG_TASK.vigilante);
        }

        if (memberToUse) {

            debugLog(this.ns, DebugLevel.info, `Fix wanted penalty of ${this.wantedPenalty
            }%. Switching ${memberToUse.name} from ${memberToUse.targetTask} to ${GANG_TASK.vigilante}`);
            memberToUse.targetTask = GANG_TASK.vigilante;
        }
    }

    private managerMemberJobsMoney() {
        let priorityTasks = [GANG_TASK.vigilante, GANG_TASK.trainCombat];

        if (this.gangInfo.territoryWarfareEngaged) {
            priorityTasks.push(GANG_TASK.territory);
        }

        this.reassessMemberJobs(priorityTasks);


        this.adjustWantedLevel();

        if (this.gangInfo.territoryWarfareEngaged) {
            this.doTerritoryWarfare(this.gangInfo, this.members);
        }

        this.trainLowestMembers(priorityTasks);

        this.assignTargetTasks();

    }

    private managerMemberJobsRespect() {
        let priorityTasks = [GANG_TASK.vigilante, GANG_TASK.trainCombat];

        if (this.gangInfo.territoryWarfareEngaged) {
            this.doTerritoryWarfare(this.gangInfo, this.members);
        }

        this.reassessMemberJobs(priorityTasks);

        this.trainLowestMembers(priorityTasks);

        this.adjustWantedLevel();

        this.assignTargetTasks();
    }

    private managerMemberJobsTerritory() {
        let priorityTasks = [GANG_TASK.vigilante];

        this.reassessMemberJobs(priorityTasks);

        this.adjustedNumberToTrain = 1;
        this.adjustWantedLevel();

        this.assignTargetTasks();
    }

    private trainLowestMembers(priorityTasks: GANG_TASK[]) {

        if (this.members.length > 0) {

            //reset anyone who was training
            let oldTrainees = this.members.filter(m => m.targetTask === GANG_TASK.trainCombat || m.targetTask === GANG_TASK.trainHacking);
            //trainees.forEach(m => m.targetTask = GANG_TASK.unassigned);


            this.members.sort((a, b) => a.afterAscAvgMult - b.afterAscAvgMult);



            let currentTrainees: string[] = [];
            for (const member of this.members) {

                if (!priorityTasks.includes(member.targetTask) || member.targetTask === GANG_TASK.trainCombat) {

                    if (member.targetTask !== GANG_TASK.trainCombat) {
                        debugLog(this.ns, DebugLevel.info, `New Trainee! Switching ${member.name} from ${member.targetTask} to ${GANG_TASK.trainCombat}`);
                        member.targetTask = GANG_TASK.trainCombat;
                    } else {
                        //they were already training
                    }


                    currentTrainees.push(member.name);
                    if (currentTrainees.length >= this.adjustedNumberToTrain) {
                        break;
                    }

                }

            }
            //if they didn't get assigned to training this go, get them their next task
            oldTrainees.forEach(m => {
                if (!currentTrainees.includes(m.name)) {
                    let mainTask = this.getMainTask(m);
                    debugLog(this.ns, DebugLevel.info, `No longer training! Switching ${m.name} from ${m.targetTask} to ${mainTask}`);
                    m.targetTask = mainTask;
                }
            });


        }

    }

    private tryRecruitMember() {
        if (this._gang.canRecruitMember()) {
            let newName = this.getNewGangMemberName();
            debugLog(this.ns, DebugLevel.success, `Recruiting new gang member ${newName}!!`);
            this._gang.recruitMember(newName);
        }
    }

    private updateData() {
        this.gangInfo = this._gang.getGangInformation();
        this.gangFactionRep = this.ns.singularity.getFactionRep(this.gangInfo.faction);
        this.wantedPenalty = (1 - this.ns.formulas.gang.wantedPenalty(this.gangInfo));
        this._player = this.ns.getPlayer();

        this.otherGangsWithTerritory = this.otherGangs.filter(g => g.territory > 0);

        this.members = getAllMembers(this.ns) as MyMemberInfo[];
        this.settings = getSettings(this.ns);

        this.members.forEach(m => {
            let results = this._gang.getAscensionResult(m.name);
            m.ascResults = results;
            m.targetTask = m.task as GANG_TASK;

            let totalAvgAscMult = ((m.agi_asc_mult + m.def_asc_mult + m.dex_asc_mult + m.str_asc_mult + m.hack_asc_mult + m.cha_asc_mult) / 6.0);
            let combatAvgAscMult = (m.agi_asc_mult + m.def_asc_mult + m.dex_asc_mult + m.str_asc_mult) / 4.0;
            m.afterAscAvgMult = totalAvgAscMult;
            let totalAvgIncrease = 0;
            if (results) {
                totalAvgIncrease = ((results.def + results.agi + results.dex + results.str + results.hack + results.cha) / 6.0) - 1;

                m.afterAscAvgMult = (
                    (m.agi_asc_mult * results.agi) +
                    (m.def_asc_mult * results.def) +
                    (m.dex_asc_mult * results.dex) +
                    (m.str_asc_mult * results.str) +
                    (m.hack_asc_mult * results.hack) +
                    (m.cha_asc_mult * results.cha)
                ) / 6.0;
            }

            m.totalAvgAscIncrease = totalAvgIncrease;
            m.totalAvgAscMult = totalAvgAscMult;

            m.combatAvg = (m.agi + m.def + m.dex + m.str) / 4;
            m.combatAvgAscMult = combatAvgAscMult;
            if (combatAvgAscMult < 1.3) {
                debugLog(this.ns, DebugLevel.error, `Something's up with ${m.name}. combatAvgAscMult: ${combatAvgAscMult} `, {
                    sum: m.agi_asc_mult + m.def_asc_mult + m.dex_asc_mult + m.str_asc_mult,
                    agi_asc_mult: m.agi_asc_mult,
                    def_asc_mult: m.def_asc_mult,
                    dex_asc_mult: m.dex_asc_mult,
                    str_asc_mult: m.str_asc_mult
                });

            }

            m.wantedPenaltyGain = 1 - getWantedPenaltyMult(m.respectGain, m.wantedLevelGain);

        });

        this.otherGangs = getOtherGangsInfo(this.ns);

        let equipNames = this._gang.getEquipmentNames();
        this.equipmentList = equipNames.map(name => {
            return {
                name: name,
                cost: this._gang.getEquipmentCost(name),
                type: this._gang.getEquipmentType(name) as GANG_EQUIP_TYPES
            };
        });

        this.adjustedAscensionThreshold = 1 + (((MAX_ASCENSION_THRESHOLD - 1) * getGangDiscountMult(this.ns)));
        this.adjustedAscensionThreshold = Math.max(this.adjustedAscensionThreshold, MIN_ASCENSION_THRESHOLD);
        this.adjustedNumberToTrain = Math.ceil(this.members.length * MAX_PERCENT_TO_TRAIN * getGangDiscountMult(this.ns));

    }

    private wantedLevelOk() {
        return this.wantedPenalty <= WANTED_PENALTY_THRESHOLD || this.gangInfo.wantedLevel === 1;
    }

    private getBestRespectTask(member: MyMemberInfo, tasksToTry: GANG_TASK[]): GANG_TASK | undefined {
        let respectTask: GANG_TASK | undefined;
        for (const task of tasksToTry) {

            let taskRespGain = this.ns.formulas.gang.respectGain(this.gangInfo, member, this.tasksInfo[task]);
            let taskWantedGain = this.ns.formulas.gang.wantedLevelGain(this.gangInfo, member, this.tasksInfo[task]);
            let taskWantedPenaltyGain = 1 - getWantedPenaltyMult(taskRespGain, taskWantedGain);

            if (taskWantedPenaltyGain < WANTED_PENALTY_THRESHOLD && taskRespGain > 0) {
                respectTask = task;
                break;
            }
        }

        return respectTask;

    }

    private reassessMemberJobs(priorityTasks: GANG_TASK[]) {
        for (let member of this.members) {
            if (!priorityTasks.includes(member.targetTask)) {
                //if we're not fixing wanted penalty, reassess
                let mainTask = this.getMainTask(member);
                if (mainTask !== member.targetTask) {
                    debugLog(this.ns, DebugLevel.info, `Reassessing ${member.name}. Switching from ${member.targetTask} to ${mainTask}`);
                    member.targetTask = mainTask;
                }
            }
        }
    }

    private assignTargetTasks() {
        for (let member of this.members) {
            if (member.targetTask === GANG_TASK.unassigned) {
                member.targetTask = this.getMainTask(member);
            }

            this._gang.setMemberTask(member.name, member.targetTask);
        }
    }
}
