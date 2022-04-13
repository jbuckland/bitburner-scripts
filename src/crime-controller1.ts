import { IGlobalSettings, OtherGangInfo } from '/types';
import { Gang, GangGenInfo, GangMemberAscension, GangMemberInfo, GangTaskStats, NS, Player } from 'NetscriptDefinitions';
import { CrimeMode, DebugLevel, INDENT_STRING, MAX_GANG_MEMBERS, TOAST_DURATION, TOAST_VARIANT } from 'utils/consts';
import { GANG_EQUIP_TYPES, GANG_TASK, MEMBER_NAME } from 'utils/crime-consts';
import { debugLog, formatBigNumber, formatCurrency, formatPercent, getSettings, getUnownedFactionAugmentations, round, timestamp } from 'utils/utils';
import { getAllMembers, getGangDiscountMult, getOtherGangsInfo, getWantedPenaltyMult } from 'utils/utils-crime';
import { getAugmentFactionCostInfo } from 'utils/utils-player';
import { ITableData, Table } from 'utils/utils-table';

type MyMemberInfo = GangMemberInfo & {
    targetTask: GANG_TASK | undefined,
    totalAvgAscIncrease: number,
    totalAvgMult: number,
    combatAvgAscMult: number,
    combatAvg: number,
    ascResults?: GangMemberAscension,
    wantedPenaltyGain: number

};

export async function main(ns: NS) {
    let svc = new CrimeController(ns);

    await svc.doRun();
}

const SLEEP_TIME = 1000;
const MAX_ASCENSION_THRESHOLD: number = 1.3; //this is a percentage. 1.5 = 150% of original
const WANTED_PENALTY_THRESHOLD: number = .005;

let territoryPercent = .1;
const MIN_ON_TERRITORY = 0;
let minOnMainTask = 1;
let TARGET_CLASH_WIN_CHANCE = 0.8;
let CLASH_CHANCE_WINDOW_SIZE = .2;
let numberToTrain = 1;

//const TASK_MONEY: GANG_TASK = GANG_TASK.trafficking;

export class CrimeController {
    private _player!: Player;
    private _gang: Gang;
    private equipmentList: { name: string, type: GANG_EQUIP_TYPES, cost: number }[] = [];
    //private taskList: GangTaskStats[];
    private taskMain: GANG_TASK = GANG_TASK.mug;
    private MAX_TERRITORY: number = .90;
    private gangInfo!: GangGenInfo;
    private wantedPenalty: number = 0;
    private members: MyMemberInfo[] = [];
    private settings: IGlobalSettings = {};

    private tasksInfo: { [key: string]: GangTaskStats } = {};
    private TARGET_MIN_GANG_RESPECT: number = 30e6;
    private currAscensionThreshold: number = MAX_ASCENSION_THRESHOLD;
    private otherGangs: OtherGangInfo[] = [];

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

            //this.setMode();

            if (this.members.length < MAX_GANG_MEMBERS) {
                this.tryRecruitMember();

            } else {
                //we've recruited everyone, so let's change some parameters
                this.currAscensionThreshold = 1 + ((MAX_ASCENSION_THRESHOLD - 1) * getGangDiscountMult(this.ns));
            }

            //simple stuff
            if (true || this.settings.crimeMode !== CrimeMode.respect) {
                let memberAscendedThisCycle = false;
                for (const m of this.members) {

                    if (!memberAscendedThisCycle) {
                        memberAscendedThisCycle = this.ascendMember(m);
                    }

                    this.buyEquip(m);
                }
            }

            if (this.settings.crimeMode === CrimeMode.territory) {

                let otherGangsWithTerritory = this.otherGangs.filter(g => g.territory > 0);

                if (otherGangsWithTerritory.length > 0) {
                    otherGangsWithTerritory.sort((a, b) => a.winChance - b.winChance);
                    let strongest = otherGangsWithTerritory[0];

                    if (strongest.winChance > .5) {

                        if (!this.gangInfo.territoryWarfareEngaged) {
                            debugLog(this.ns, DebugLevel.info, 'Begun, the Territory Wars has!');
                            this.ns.gang.setTerritoryWarfare(true);
                        }

                    } else {
                        this.ns.gang.setTerritoryWarfare(false);
                    }
                }

                this.managerMemberJobsTerritory();
            } else {
                this.managerMemberJobs();

            }

            this.displayStats(this.members);
            await this.ns.sleep(SLEEP_TIME);
        }

    }

    private adjustWantedLevel(members: MyMemberInfo[]) {

        let wantedFixTask: GANG_TASK = GANG_TASK.vigilante;
        let secondaryWantedFixTask: GANG_TASK = GANG_TASK.mug;
        let vigMembers = this.members.filter(m => m.targetTask === wantedFixTask);
        let secondaryMembers = this.members.filter(m => m.targetTask === secondaryWantedFixTask);

        let taskToUse: GANG_TASK = wantedFixTask;

        if (vigMembers.length > secondaryMembers.length) {
            taskToUse = secondaryWantedFixTask;
        }

        //we need more vigilantes
        if (!this.wantedLevelOk()) {

            //we'll take the biggest wanted gainers first
            //NOTE: this doesn't account for reputation offsetting wanted level... somehow

            members.sort((a, b) => b.wantedPenaltyGain - a.wantedPenaltyGain);

            let memberToUse = members.find(m => m.targetTask === GANG_TASK.unassigned);

            if (!memberToUse) {
                memberToUse = members.find(m => m.targetTask !== wantedFixTask && m.targetTask !== secondaryWantedFixTask);
            }

            if (!memberToUse) {
                memberToUse = members.find(m => m.targetTask !== taskToUse);
            }

            if (memberToUse) {

                debugLog(this.ns, DebugLevel.info, `Fix wanted penalty of ${this.wantedPenalty
                }%. Switching ${memberToUse.name} from ${memberToUse.targetTask} to ${taskToUse}`);
                memberToUse.targetTask = taskToUse;
            }

        } else {
            //we can assign some users to doing real work!
            //debugLog(this._ns, DebugLevel.info, `Wanted penalty is ok! ${wantedPenalty}%`);
            let memberToUse = members.find(m => m.targetTask === GANG_TASK.unassigned);

            if (!memberToUse) {
                memberToUse = members.find(m => m.targetTask == wantedFixTask);
            }
            if (!memberToUse) {
                memberToUse = members.find(m => m.targetTask == wantedFixTask || m.targetTask == secondaryWantedFixTask);
            }

            if (memberToUse) {

                let wantedOnTerritory = Math.floor(Math.max(MIN_ON_TERRITORY, members.length * territoryPercent));
                let currOnTerritory = members.filter(m => m.targetTask === GANG_TASK.territory).length;

                if (wantedOnTerritory > currOnTerritory) {
                    debugLog(this.ns, DebugLevel.info, `Need more on Territory. Switching ${memberToUse.name} from ${memberToUse.targetTask} to ${GANG_TASK.territory}`);
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
                if (member.totalAvgAscIncrease >= (this.currAscensionThreshold - 1)) {
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
            //equipTypesToBuy.includes(e.type) &&
            !member.upgrades.includes(e.name) &&
            !member.augmentations.includes(e.name)
        );

        if (neededEquip.length > 0) {
            neededEquip.sort((a, b) => a.cost - b.cost);
            let nextEquip = neededEquip[0];

            if (this._player.money >= nextEquip.cost) {
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

        //buy the cheapest equipment that this member doesn't have

    }

    private decreaseVigilante() {
        //we can assign some users to doing real work!
        //debugLog(this._ns, DebugLevel.info, `Wanted penalty is ok! ${wantedPenalty}%`);
        let memberToUse = this.members.find(m => m.targetTask === GANG_TASK.unassigned);

        if (!memberToUse) {
            memberToUse = this.members.find(m => m.targetTask == GANG_TASK.vigilante);
        }

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
        ascTable.headerRow = { 'Task': { dataKey: 'Task', text: 'Task', width: GANG_TASK.vigilante.length, order: 5 } };

        this.members.sort((a, b) => b.totalAvgAscIncrease - a.totalAvgAscIncrease);

        let ascTableData: ITableData[] = this.members.map(d => {
            return {
                Name: d.name,
                'Avg. Inc.': formatPercent(d.totalAvgAscIncrease, 2),
                'Avg. Mult': 'x' + round(d.totalAvgMult, 2).toString(),
                'Combat Mult': 'x' + round(d.combatAvgAscMult, 2).toString(),
                'Hack Mult': 'x' + round(d.hack_mult, 2).toString(),
                'Task': d.task
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
        this.ns.print(`${INDENT_STRING} Ascension Threshold: ${formatPercent(this.currAscensionThreshold - 1, 2)}`);

        ascTable.setData(ascTableData);
        ascTable.print();

        this.ns.print('');
    }

    private displayAugmentInfo(info: GangGenInfo) {

        this.ns.print('Next augment:');

        let remainingAugNames = getUnownedFactionAugmentations(this.ns, info.faction);

        let augs = remainingAugNames.map(name => getAugmentFactionCostInfo(this.ns, name, info.faction));
        augs.sort((a, b) => a.baseAdditionalRepCost - b.baseAdditionalRepCost);

        /*
                if (targetAug) {

                    //if we can donate to this faction
                    //show how much money we'd need
                    let favorToDonate = ns.getFavorToDonate();
                    let currFavor = ns.getFactionFavor(targetAug?.fromFaction.name);
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

    private displayGangStats(info: GangGenInfo) {
        this.ns.print(`Gang Stats:`);
        this.ns.print(`${INDENT_STRING} Wanted Penalty: ${formatPercent(1 - info.wantedPenalty, 2)}`);
        this.ns.print(`${INDENT_STRING} Respect: ${formatBigNumber(info.respect, 2)}`);
        this.ns.print('');
    }

    private displayJobStats(members: MyMemberInfo[]) {
        this.ns.print(`Member Jobs:`);

        let jobCount: { jobName: string, count: number }[] = [];
        for (let member of members) {

            let count = jobCount.find(c => c.jobName === member.task);
            if (!count) {
                count = { jobName: member.task, count: 0 };
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

        let info = this._gang.getGangInformation();

        this.displayGangStats(info);

        this.displayTerritoryInfo(info);

        this.displayJobStats(members);

        this.displayAscensionInfo(members);

        this.displayAugmentInfo(info);

        this.ns.print(timestamp());
    }

    private displayTerritoryInfo(info: GangGenInfo) {

        let otherGangsWithTerritory = this.otherGangs.filter(g => g.territory > 0);
        otherGangsWithTerritory.sort((a, b) => b.name.length - a.name.length);
        if (otherGangsWithTerritory.length > 0) {
            this.ns.print(`Territory: ${formatPercent(info.territory, 2)}, Power: ${round(info.power)}`);
            let longestName = otherGangsWithTerritory[0].name.length;
            otherGangsWithTerritory.sort((a, b) => {
                return (b.territory - a.territory) || (b.power - a.power);
            });
            otherGangsWithTerritory.forEach(g => {
                this.ns.print(`${INDENT_STRING} ${g.name.padEnd(longestName)}: ${formatPercent(g.territory, 2).padStart(6)}, Power: ${round(g.power).toString().padStart(4)}, Win: ${formatPercent(g.winChance, 1)}`);

            });
            this.ns.print('');
        }

    }

    private doTerritoryWarfare(info: GangGenInfo, members: MyMemberInfo[]) {
        //if our win chance is within this much of TARGET, reduce amount of members doing territory

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

                let windowStart = TARGET_CLASH_WIN_CHANCE - CLASH_CHANCE_WINDOW_SIZE;

                let percentMembersToUse = (strongestGang.winChance - windowStart) / CLASH_CHANCE_WINDOW_SIZE;
                percentMembersToUse = Math.min(1, percentMembersToUse); //clamp range to 0-1
                percentMembersToUse = Math.max(0, percentMembersToUse); //clamp range to 0-1
                percentMembersToUse = 1 - percentMembersToUse;

                numMembersToUse = Math.ceil(members.length * percentMembersToUse);

                if (info.territory < this.MAX_TERRITORY) {
                    numMembersToUse = Math.max(MIN_ON_TERRITORY, numMembersToUse);
                }
            }

            let currentDefenders = members.filter(m => m.task === GANG_TASK.territory);
            let nonDefenders = members.filter(m => m.task !== GANG_TASK.territory);

            let additionalNeeded = numMembersToUse - currentDefenders.length;

            let msgPrefix = `Current defenders: ${currentDefenders.length} of ${numMembersToUse}.`;
            if (additionalNeeded < 0) {
                //we have too many, reassign some to... money?
                let targetMember = currentDefenders[0];
                let mainTask = this.getMainTask(targetMember);
                debugLog(this.ns, DebugLevel.info, `${msgPrefix} Too many, switching ${mainTask} from ${targetMember.targetTask} to ${mainTask}`);
                targetMember.targetTask = mainTask;
            } else if (additionalNeeded > 0) {
                //we need more
                let targetMember = nonDefenders[0];
                debugLog(this.ns, DebugLevel.info, `${msgPrefix} Not enough, switching ${targetMember.name} from ${targetMember.targetTask} to ${GANG_TASK.territory}`);
                targetMember.targetTask = GANG_TASK.territory;
            } else {
                debugLog(this.ns, DebugLevel.info, `${msgPrefix} Not switching anyone`);
            }

        }
    }

    private enforceMinimumMainTask(members: MyMemberInfo[]) {
        let moneyMakers = members.filter(m => m.targetTask === this.taskMain);

        if (moneyMakers.length < minOnMainTask) {
            let nonMoneyMaker = members.find(m => m.targetTask !== this.taskMain);
            if (nonMoneyMaker) {
                debugLog(this.ns, DebugLevel.info, `Not enough on main task. Switching ${nonMoneyMaker.name} from ${nonMoneyMaker.targetTask} to ${this.taskMain}`);
                nonMoneyMaker.targetTask = this.taskMain;
            }
        }

    }

    private getMainTask(member: MyMemberInfo): GANG_TASK {
        let lowCombatAvgThreshold = 20;

        let mainTask = GANG_TASK.unassigned;
        if (this.settings.crimeMode) {

            if (this.settings.crimeMode == CrimeMode.money) {

                if (member.earnedRespect < (this.TARGET_MIN_GANG_RESPECT / this.members.length)) {
                    let terrWantedPenaltyGain = this.getTaskWantedPenaltyGain(member, GANG_TASK.terrorism);
                    if (terrWantedPenaltyGain <= WANTED_PENALTY_THRESHOLD) {
                        //debugLog(this.ns, DebugLevel.info, `Earning respect for ${member.name}, terrWantedPenaltyGain:${terrWantedPenaltyGain}`);

                        let terrWantedPenaltyGain = this.getTaskWantedPenaltyGain(member, GANG_TASK.terrorism);

                        if (terrWantedPenaltyGain < WANTED_PENALTY_THRESHOLD) {
                            mainTask = GANG_TASK.terrorism;
                        } else {
                            mainTask = GANG_TASK.trainCombat;
                        }

                    } else {
                        //debugLog(this.ns, DebugLevel.info, `Training combat for ${member.name}, terrWantedPenaltyGain:${terrWantedPenaltyGain}`);
                        mainTask = GANG_TASK.trainCombat;
                    }
                } else {
                    mainTask = GANG_TASK.trafficking;

                }

            } else if (this.settings.crimeMode == CrimeMode.territory) {

                if (member.earnedRespect < (this.TARGET_MIN_GANG_RESPECT / this.members.length)) {
                    let terrWantedPenaltyGain = this.getTaskWantedPenaltyGain(member, GANG_TASK.terrorism);
                    if (terrWantedPenaltyGain <= WANTED_PENALTY_THRESHOLD) {
                        //debugLog(this.ns, DebugLevel.info, `Earning respect for ${member.name}, terrWantedPenaltyGain:${terrWantedPenaltyGain}`);
                        mainTask = GANG_TASK.terrorism;
                    } else {
                        //debugLog(this.ns, DebugLevel.info, `Training combat for ${member.name}, terrWantedPenaltyGain:${terrWantedPenaltyGain}`);
                        mainTask = GANG_TASK.trainCombat;
                    }
                } else {
                    mainTask = GANG_TASK.territory;

                }

            } else if (this.settings.crimeMode == CrimeMode.respect) {

                let terrWantedPenaltyGain = this.getTaskWantedPenaltyGain(member, GANG_TASK.terrorism);

                if (terrWantedPenaltyGain < WANTED_PENALTY_THRESHOLD) {
                    mainTask = GANG_TASK.terrorism;
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

    private managerMemberJobs() {

        this.members.forEach(m => {
            //m.targetTask = GANG_TASK.unassigned; //everyone is unassigned
            m.targetTask = m.task as GANG_TASK; //keep doing what you were doing
            //m.targetTask = this.getMainTask(m);//start with everyone allocated to their 'best' job
        });

        if (MIN_ON_TERRITORY + minOnMainTask > this.members.length) {
            debugLog(this.ns, DebugLevel.error, 'Not enough members for minimum allocations!', {
                minOnTerritory: MIN_ON_TERRITORY,
                minOnMoney: minOnMainTask
            });
        }

        this.trainLowestMember(this.members);

        if (this.settings.crimeMode === CrimeMode.territory || this.gangInfo.territoryWarfareEngaged) {
            this.doTerritoryWarfare(this.gangInfo, this.members);
        } else {
            let wantedOnTerritory = Math.floor(Math.max(MIN_ON_TERRITORY, this.members.length * territoryPercent));
            let currOnTerritory = this.members.filter(m => m.targetTask === GANG_TASK.territory);
            //too many on territory, take one off
            if (currOnTerritory.length > 0 && currOnTerritory.length > wantedOnTerritory) {
                let targetMember = currOnTerritory[0];
                debugLog(this.ns, DebugLevel.info, `Too many on Territory. Switching ${targetMember.name} from ${targetMember.targetTask} to ${GANG_TASK.unassigned}`);
                targetMember.targetTask = GANG_TASK.unassigned;
            }
        }

        this.adjustWantedLevel(this.members);

        for (let member of this.members) {
            if (member.task === GANG_TASK.vigilante) {
                member.targetTask = member.task as GANG_TASK;
            } else {
                //if we're on one of these tasks, reassess
                member.targetTask = this.getMainTask(member);
            }
        }

        if (this.wantedLevelOk()) {
            this.decreaseVigilante();
        } else {
            this.increaseVigilante();
        }

        //assign tasks
        for (let member of this.members) {
            this._gang.setMemberTask(member.name, member.targetTask ?? member.task);
        }

    }

    private managerMemberJobsTerritory() {
        for (let member of this.members) {
            if (member.task === GANG_TASK.vigilante) {

                member.targetTask = member.task as GANG_TASK;

            } else {
                //if we're on one of these tasks, reassess
                member.targetTask = this.getMainTask(member);
            }
        }

        if (this.wantedLevelOk()) {
            this.decreaseVigilante();
        } else {
            this.increaseVigilante();
        }

        //assign tasks
        for (let member of this.members) {
            this._gang.setMemberTask(member.name, member.targetTask ?? member.task);
        }
    }

    private trainLowestMember(members: MyMemberInfo[]) {

        if (members.length > 0) {

            //reset anyone who was training
            let trainees = members.filter(m => m.targetTask === GANG_TASK.trainCombat || m.targetTask === GANG_TASK.trainHacking);
            trainees.forEach(m => m.targetTask = GANG_TASK.unassigned);

            this.members.sort((a, b) => a.combatAvgAscMult - b.combatAvgAscMult);

            //this.members.sort((a, b) => a.hack_mult - b.hack_mult);

            let newTrainees = [];
            for (let i = 0; i < this.members.length; i++) {

                if (members[i].targetTask !== GANG_TASK.vigilante) {

                    this.members[i].targetTask = GANG_TASK.trainCombat;

                    newTrainees.push(this.members[i].name);
                    if (newTrainees.length >= numberToTrain) {
                        break;
                    }

                }

            }
            debugLog(this.ns, DebugLevel.info, `Training lowest ${numberToTrain} members! ${newTrainees.join(', ')}`);
            /*
            if (false && lowestHackMember.hackMult < lowestCombatMember.avgCombatMult) {
                debugLog(this.ns, DebugLevel.info, `Lowest member. Switching ${lowestHackMember.member.name} from ${lowestHackMember.member.targetTask} to ${GANG_TASK.trainHacking}`);
                lowestHackMember.member.targetTask = GANG_TASK.trainHacking;
            } else {
                debugLog(this.ns, DebugLevel.info, `Lowest member. Switching ${lowestCombatMember.member.name} from ${lowestCombatMember.member.targetTask} to ${GANG_TASK.trainCombat}`);

                for (let i = 0; i < numberToTrain && avgCombatStatsList.length; i++) {
                    avgCombatStatsList[1].member.targetTask = GANG_TASK.trainCombat;
                }

            }
*/
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
        this.wantedPenalty = (1 - this.ns.formulas.gang.wantedPenalty(this.gangInfo));
        this._player = this.ns.getPlayer();

        this.members = getAllMembers(this.ns) as MyMemberInfo[];
        this.settings = getSettings(this.ns);

        this.members.forEach(m => {
            let results = this._gang.getAscensionResult(m.name);
            m.ascResults = results;

            let totalAvgIncrease = 0;
            let totalAvgMult = 0;
            let combatAvgMult = 0;
            if (results) {
                totalAvgIncrease = ((results.def + results.agi + results.dex + results.str + results.hack + results.cha) / 6) - 1;
                totalAvgMult = (m.agi_asc_mult + m.cha_asc_mult + m.def_asc_mult + m.dex_asc_mult + m.hack_asc_mult + m.str_asc_mult) / 6;
                combatAvgMult = (m.agi_asc_mult + m.def_asc_mult + m.dex_asc_mult + m.str_asc_mult) / 4;

            }

            m.totalAvgAscIncrease = totalAvgIncrease;

            m.totalAvgMult = totalAvgMult;

            m.combatAvg = (m.agi + m.def + m.dex + m.str) / 4;
            m.combatAvgAscMult = combatAvgMult;

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

    }

    private wantedLevelOk() {
        return this.wantedPenalty <= WANTED_PENALTY_THRESHOLD || this.gangInfo.wantedLevel < 1;
    }
}
