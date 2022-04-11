import { CrimeMode, DebugLevel, INDENT_STRING, MAX_GANG_MEMBERS } from './consts';
import { GANG_EQUIP_TYPES, GANG_TASK, MEMBER_NAME } from './crime_consts';
import { getAllMembers, getAllTaskInfo, getGangDiscountMult, getOtherGangsInfo } from './crime_utils';
import { Gang, GangGenInfo, GangMemberInfo, GangTaskStats, NS, Player } from './NetscriptDefinitions';
import { debugLog, formatCurrency, formatPercent, getRemainingFactionAugmentations, getSettings, round, timestamp } from './utils';
import { getAugmentFactionCostInfo } from './utils-player';
import { ITableData, Table } from './utils-table';

type MemberJobAssignment = GangMemberInfo & { targetTask: GANG_TASK | undefined };

export async function main(ns: NS) {
    let svc = new CrimeService1(ns);

    await svc.run();
}

const SLEEP_TIME = 2000;
let ASCENSION_THRESHOLD: number = 1.1; //this is a percentage. 1.5 = 150% of original
const WANTED_PENALTY_THRESHOLD: number = .005;

let territoryPercent = .1;
const MIN_ON_TERRITORY = 2;
let minOnMainTask = 1;
let TARGET_CLASH_WIN_CHANCE = 0.8;
let CLASH_CHANCE_WINDOW_SIZE = .2;

const TASK_MONEY: GANG_TASK = GANG_TASK.trafficking;

export class CrimeService1 {
    private _player!: Player;
    private _gang: Gang;
    private equipmentList: { name: string, type: GANG_EQUIP_TYPES, cost: number }[];
    private taskList: GangTaskStats[];
    private taskMain: GANG_TASK = GANG_TASK.trafficking;
    private MAX_TERRITORY: number = .90;

    public constructor(private ns: NS) {
        this._gang = ns.gang;
        this.updatePlayer();

        let equipNames = this._gang.getEquipmentNames();
        this.taskList = getAllTaskInfo(this.ns);
        this.equipmentList = equipNames.map(name => {
            return {
                name: name,
                cost: this._gang.getEquipmentCost(name),
                type: this._gang.getEquipmentType(name) as GANG_EQUIP_TYPES
            };
        });

    }

    public async run() {
        this.ns.tail();
        this.ns.disableLog('ALL');

        while (true) {

            this.updatePlayer();

            this.setMode();

            let members = getAllMembers(this.ns) as MemberJobAssignment[];

            if (members.length < MAX_GANG_MEMBERS) {
                this.tryRecruitMember();

            } else {
                //we've recruited everyone, so let's change some parameters
                ASCENSION_THRESHOLD = 1 + (.2 * getGangDiscountMult(this.ns));
            }

            //simple stuff
            for (const m of members) {
                this.ascendMember(m);
                this.buyEquip(m);
            }

            this.managerMemberJobs();

            this.displayStats(members);
            await this.ns.sleep(SLEEP_TIME);
        }

    }

    private adjustWantedLevel(members: MemberJobAssignment[]) {
        let gangInfo = this._gang.getGangInformation();
        let wantedPenalty = (1 - this.ns.formulas.gang.wantedPenalty(gangInfo));
        //debugLog(this._ns, DebugLevel.info, `Wanted Penalty: ${wantedPenalty}`);

        if (wantedPenalty > WANTED_PENALTY_THRESHOLD && gangInfo.wantedLevel > 1) {
            //we need more vigilantes

            let memberToUse = members.find(m => m.targetTask === GANG_TASK.unassigned);
            if (!memberToUse) {
                memberToUse = members.find(m => m.targetTask == this.taskMain);
            }
            if (!memberToUse) {
                memberToUse = members.find(m => m.targetTask !== GANG_TASK.vigilante);
            }

            if (memberToUse) {
                debugLog(this.ns, DebugLevel.info, `Fix wanted penalty of ${wantedPenalty}%. Switching ${memberToUse.name} from ${memberToUse.targetTask} to ${GANG_TASK.vigilante}`);
                memberToUse.targetTask = GANG_TASK.vigilante;
            }

        } else {
            //we can assign some users to doing real work!
            //debugLog(this._ns, DebugLevel.info, `Wanted penalty is ok! ${wantedPenalty}%`);
            let memberToUse = members.find(m => m.targetTask === GANG_TASK.unassigned);
            if (!memberToUse) {
                memberToUse = members.find(m => m.targetTask == GANG_TASK.vigilante);
            }

            if (memberToUse) {

                let wantedOnTerritory = Math.floor(Math.max(MIN_ON_TERRITORY, members.length * territoryPercent));
                let currOnTerritory = members.filter(m => m.targetTask === GANG_TASK.territory).length;

                if (wantedOnTerritory > currOnTerritory) {
                    debugLog(this.ns, DebugLevel.info, `Need more on Territory. Switching ${memberToUse.name} from ${memberToUse.targetTask} to ${GANG_TASK.territory}`);
                    memberToUse.targetTask = GANG_TASK.territory;
                } else {
                    debugLog(this.ns, DebugLevel.info, `Enough on Territory. Switching ${memberToUse.name} from ${memberToUse.targetTask} to ${this.taskMain}`);
                    memberToUse.targetTask = this.taskMain;
                    //debugLog(this._ns, DebugLevel.info, `Setting ${memberToUse.name} to ${memberToUse.targetTask}`);
                }
            } else {
                debugLog(this.ns, DebugLevel.info, `No member to reassign!`);
            }

        }

    }

    private ascendMember(member: GangMemberInfo) {

        let results = this._gang.getAscensionResult(member.name);
        if (results) {
            let avgStatIncrease = (results.def + results.agi + results.dex + results.str + results.cha + results.hack) / 6.0;
            //debugLog(this._ns, DebugLevel.info, `${member.name} avg Asc increase: ${formatPercent(avgStatIncrease - 1, 2)}`);
            if (avgStatIncrease > ASCENSION_THRESHOLD) {
                debugLog(this.ns, DebugLevel.success, `Ascending ${member.name}!!`);
                this._gang.ascendMember(member.name);
            } else {
                //debugLog(this._ns, DebugLevel.info, `NOT ascending ${member.name}, avgCombatIncrease: ${avgCombatIncrease}`);
            }

        }

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
                    //debugLog(this.ns, DebugLevel.success, `Purchased '${nextEquip.name}' for ${member.name}`);
                } else {
                    debugLog(this.ns, DebugLevel.error, `Failed to purchase '${nextEquip.name}' for ${member.name}`);
                }

                this.updatePlayer();

            }

        }

        //buy the cheapest equipment that this member doesn't have

    }

    private displayAscesionInfo(members: MemberJobAssignment[]) {
        let ascTable = new Table(this.ns);

        let data = members.map(m => {
            let results = this._gang.getAscensionResult(m.name);

            let totalAvgIncrease = 0;
            let totalAvgMult = 0;
            let combatAvgMult = 0;
            if (results) {
                totalAvgIncrease = ((results.def + results.agi + results.dex + results.str + results.hack + results.cha) / 6) - 1;
                totalAvgMult = (m.agi_asc_mult + m.cha_asc_mult + m.def_asc_mult + m.dex_asc_mult + m.hack_asc_mult + m.str_asc_mult) / 6;
                combatAvgMult = (m.agi_asc_mult + m.def_asc_mult + m.dex_asc_mult + m.str_asc_mult) / 6;

            }

            return {
                name: m.name,
                totalAvgIncrease,
                totalAvgMult,
                combatAvgMult,
                hackMult: m.hack_asc_mult
            };
        });

        data.sort((a, b) => b.totalAvgIncrease - a.totalAvgIncrease);

        let ascTableData: ITableData[] = data.map(d => {
            return {
                Name: d.name,
                'Avg. Inc.': formatPercent(d.totalAvgIncrease, 2),
                'Avg. Mult': 'x' + round(d.totalAvgMult, 2).toString(),
                'Combat Mult': 'x' + round(d.combatAvgMult, 2).toString(),
                'Hack Mult': 'x' + round(d.hackMult, 2).toString()
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
        this.ns.print(`${INDENT_STRING} Total Equip. Cost: ${formatCurrency(totalEquipCost)}, ${formatCurrency(totalEquipCost * discount)} after discount`);
        this.ns.print(`${INDENT_STRING} Ascension Threshold: ${formatPercent(ASCENSION_THRESHOLD - 1, 2)}`);

        ascTable.setData(ascTableData);
        ascTable.print();

        this.ns.print('');
    }

    private displayAugmentInfo(info: GangGenInfo) {

        this.ns.print('Next augment:');

        let remainingAugNames = getRemainingFactionAugmentations(this.ns, info.faction);

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
        this.ns.print('');
    }

    private displayJobStats(members: MemberJobAssignment[]) {
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

    private displayStats(members: MemberJobAssignment[]) {
        this.ns.clearLog();

        let info = this._gang.getGangInformation();

        this.displayGangStats(info);

        this.displayTerritoryInfo(info);

        this.displayJobStats(members);

        this.displayAscesionInfo(members);

        this.displayAugmentInfo(info);

        this.ns.print(timestamp());
    }

    private displayTerritoryInfo(info: GangGenInfo) {
        this.ns.print(`Territory: ${formatPercent(info.territory, 2)}, Power: ${round(info.power)}`);

        let otherGangs = getOtherGangsInfo(this.ns);
        otherGangs.sort((a, b) => b.name.length - a.name.length);
        let longestName = otherGangs[0].name.length;
        otherGangs.sort((a, b) => {

            return (b.territory - a.territory) || (b.power - a.power);
        });
        otherGangs.forEach(g => {
            this.ns.print(`${INDENT_STRING} ${g.name.padEnd(longestName)}: ${formatPercent(g.territory, 2).padStart(6)}, Power: ${round(g.power).toString().padStart(4)}, Win: ${formatPercent(g.winChance, 1)}`);

        });
        this.ns.print('');

    }

    private doTerritoryWarfare(info: GangGenInfo, members: MemberJobAssignment[]) {
        //if our win chance is within this much of TARGET, reduce amount of members doing territory

        if (info.territoryClashChance > 0) {
            //we want to have >=TARGET_CLASH_WIN_CHANCE with each faction

            let otherGangs = getOtherGangsInfo(this.ns);
            otherGangs = otherGangs.filter(g => g.territory > 0);
            let numMembersToUse = 0;
            if (otherGangs.length > 0) {
                otherGangs.sort((a, b) => a.winChance - b.winChance);
                let strongestGang = otherGangs[0];

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
                debugLog(this.ns, DebugLevel.info, `${msgPrefix} Too many, switching ${this.taskMain} from ${targetMember.targetTask} to ${this.taskMain}`);
                targetMember.targetTask = this.taskMain;
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

    private enforceMinimumMainTask(members: MemberJobAssignment[]) {
        let moneyMakers = members.filter(m => m.targetTask === this.taskMain);

        if (moneyMakers.length < minOnMainTask) {
            let nonMoneyMaker = members.find(m => m.targetTask !== this.taskMain);
            if (nonMoneyMaker) {
                debugLog(this.ns, DebugLevel.info, `Not enough on main task. Switching ${nonMoneyMaker.name} from ${nonMoneyMaker.targetTask} to ${this.taskMain}`);
                nonMoneyMaker.targetTask = this.taskMain;
            }
        }

    }

    private getNewGangMemberName() {
        let memberNames = this._gang.getMemberNames();
        return MEMBER_NAME + memberNames.length.toString();
    }

    private managerMemberJobs() {
        //jobs that we are intentionally assigning
        let targetedJobs: GANG_TASK[] = [
            this.taskMain,
            GANG_TASK.vigilante,
            GANG_TASK.territory,
            GANG_TASK.trainCombat,
            GANG_TASK.trainHacking
        ];

        let info = this.ns.gang.getGangInformation();

        let members = getAllMembers(this.ns) as MemberJobAssignment[];
        //start with everyone allocated to their previous job
        members.forEach(m => {
            return m.targetTask = m.task as GANG_TASK;
        });

        if (MIN_ON_TERRITORY + minOnMainTask > members.length) {
            debugLog(this.ns, DebugLevel.error, 'Not enough members for minimum allocations!', {
                minOnTerritory: MIN_ON_TERRITORY,
                minOnMoney: minOnMainTask
            });
        }

        this.adjustWantedLevel(members);

        if (info.territoryWarfareEngaged) {
            this.doTerritoryWarfare(info, members);
        } else {
            let wantedOnTerritory = Math.floor(Math.max(MIN_ON_TERRITORY, members.length * territoryPercent));
            let currOnTerritory = members.filter(m => m.targetTask === GANG_TASK.territory);
            //too many on territory, take one off
            if (currOnTerritory.length > 0 && currOnTerritory.length > wantedOnTerritory) {
                let targetMember = currOnTerritory[0];
                debugLog(this.ns, DebugLevel.info, `Too many on Territory. Switching ${targetMember.name} from ${targetMember.targetTask} to ${GANG_TASK.unassigned}`);
                targetMember.targetTask = GANG_TASK.unassigned;
            }
        }

        this.trainLowestMember(members);
        //this.enforceMinimumMoney(members);

        //if anyone has an "unplanned" job, or is still unassigned
        //just have them make money
        members.forEach(m => {
            if ((m.targetTask && !targetedJobs.includes(m.targetTask)) || m.targetTask === GANG_TASK.unassigned) {
                debugLog(this.ns, DebugLevel.info, `Unplanned job! Switching ${m.name} from ${m.targetTask} to ${this.taskMain}`);
                m.targetTask = this.taskMain;
            }
        });

        //assign tasks
        for (let member of members) {
            this._gang.setMemberTask(member.name, member.targetTask ?? member.task);
        }

    }

    private setMode() {
        let settings = getSettings(this.ns);
        if (settings.crimeMode && settings.crimeMode == CrimeMode.money) {
            this.taskMain = GANG_TASK.trafficking;
        } else if (settings.crimeMode && settings.crimeMode == CrimeMode.territory) {
            //this.taskMain = GANG_TASK.territory;
        }
    }

    private trainLowestMember(members: MemberJobAssignment[]) {

        if (members.length > 0) {

            //reset anyone who was training
            let trainees = members.filter(m => m.targetTask === GANG_TASK.trainCombat || m.targetTask === GANG_TASK.trainHacking);
            trainees.forEach(m => m.targetTask = GANG_TASK.unassigned);

            type MyGangMemberInfo = { member: MemberJobAssignment, avgCombatStats: number, avgCombatMult: number, hackMult: number };
            let avgCombatStatsList: MyGangMemberInfo[] = members.map(m => {
                    let results = this.ns.gang.getAscensionResult(m.name);

                    let avgCombatStats = (m.dex + m.agi + m.str + m.def) / 4.0;
                    let avgCombatMult = ((m.agi_asc_mult + m.def_asc_mult + m.dex_asc_mult + m.str_asc_mult) / 4);
                    let hackMult = m.hack_asc_mult;
                    if (results) {
                        avgCombatMult = (
                            (m.agi_asc_mult * results.agi) +
                            (m.def_asc_mult * results.def) +
                            (m.dex_asc_mult * results.dex) +
                            (m.str_asc_mult * results.str)
                        ) / 4;
                        hackMult = m.hack_asc_mult + results.hack;
                    }

                    return { member: m, avgCombatStats, avgCombatMult, hackMult };
                }
            );

            avgCombatStatsList.sort((a, b) => a.avgCombatMult - b.avgCombatMult);
            let lowestCombatMember = avgCombatStatsList[0];

            avgCombatStatsList.sort((a, b) => a.hackMult - b.hackMult);
            let lowestHackMember = avgCombatStatsList[0];

            if (lowestCombatMember.avgCombatMult < lowestHackMember.hackMult) {
                debugLog(this.ns, DebugLevel.info, `Lowest member. Switching ${lowestCombatMember.member.name} from ${lowestCombatMember.member.targetTask} to ${GANG_TASK.trainCombat}`);
                lowestCombatMember.member.targetTask = GANG_TASK.trainCombat;
            } else {
                debugLog(this.ns, DebugLevel.info, `Lowest member. Switching ${lowestHackMember.member.name} from ${lowestHackMember.member.targetTask} to ${GANG_TASK.trainHacking}`);
                lowestHackMember.member.targetTask = GANG_TASK.trainHacking;
            }

        }

    }

    private tryRecruitMember() {
        if (this._gang.canRecruitMember()) {
            let newName = this.getNewGangMemberName();
            debugLog(this.ns, DebugLevel.success, `Recruiting new gang member ${newName}!!`);
            this._gang.recruitMember(newName);
        }
    }

    private updatePlayer() {
        this._player = this.ns.getPlayer();
    }
}
