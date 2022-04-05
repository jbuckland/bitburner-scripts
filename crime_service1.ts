import {Gang, GangGenInfo, GangMemberInfo, GangTaskStats, NS, Player} from './NetscriptDefinitions';
import {GANG_EQUIP_TYPES, GANG_TASK, MEMBER_NAME} from './crime_consts';
import {debugLog, getRemainingFactionAugmentations, round, timestamp} from './utils';
import {DebugLevel, INDENT_STRING} from './consts';
import {getAllMembers, getAllTaskInfo, getOtherGangsInfo} from './crime_utils';
import {getAugmentFactionCostInfo} from './utils-player';

type MemberJobAssignment = GangMemberInfo & { targetTask: GANG_TASK | undefined };

export async function main(ns: NS) {

    let svc = new CrimeService1(ns);

    await svc.run();
}

const SLEEP_TIME = 2000;
const ASCENSION_THRESHOLD: number = 1.5; //this is a percentage. 1.5 = 150% of original
const WANTED_PENALTY_THRESHOLD: number = 1;

let territoryPercent = .75;
let minOnTerritory = 1;
let minOnMoney = 1;
let TARGET_CLASH_WIN_CHANCE = 0.8;
let CLASH_CHANCE_WINDOW_SIZE = .1;

let GAIN_MONEY_TASK: GANG_TASK = GANG_TASK.trafficking;

export class CrimeService1 {
    private _player!: Player;
    private _gang: Gang;
    private equipmentList: { name: string, type: GANG_EQUIP_TYPES, cost: number }[];
    private taskList: GangTaskStats[];

    public constructor(private _ns: NS) {
        this._gang = _ns.gang;
        this.updatePlayer();

        let equipNames = this._gang.getEquipmentNames();
        this.taskList = getAllTaskInfo(this._ns);
        this.equipmentList = equipNames.map(name => {
            return {
                name: name,
                cost: this._gang.getEquipmentCost(name),
                type: this._gang.getEquipmentType(name) as GANG_EQUIP_TYPES
            };
        });

    }

    public async run() {
        this._ns.tail();
        this._ns.disableLog('ALL');

        while (true) {

            this.updatePlayer();

            this.tryRecruitMember();

            await this.managerMemberJobs();

            this.displayStats();

            await this._ns.sleep(SLEEP_TIME);
        }

    }

    private updatePlayer() {
        this._player = this._ns.getPlayer();
    }

    private getNewGangMemberName() {
        let memberNames = this._gang.getMemberNames();
        return MEMBER_NAME + memberNames.length.toString();
    }

    private tryRecruitMember() {
        if (this._gang.canRecruitMember()) {
            let newName = this.getNewGangMemberName();
            debugLog(this._ns, DebugLevel.success, `Recruiting new gang member ${newName}!!`);

            this._gang.recruitMember(newName);
        }
    }

    private async managerMemberJobs() {

        let members = getAllMembers(this._ns) as MemberJobAssignment[];
        let info = this._gang.getGangInformation();

        //simple stuff
        for (const m of members) {
            this.ascendMember(m);
            this.buyEquip(m);
        }

        let numberOnTerritory = Math.floor(Math.max(minOnTerritory, members.length * territoryPercent));

        let numberOnMoney = Math.max(minOnMoney);

        if (minOnTerritory + minOnMoney > members.length) {
            debugLog(this._ns, DebugLevel.error, 'Not enough members for minimum allocations!', {
                minOnTerritory,
                minOnMoney
            });
        }

        //figure out what each member's next task should be
        for (let member of members) {
            //default task
            let nextTask: GANG_TASK = GAIN_MONEY_TASK; //this could be set based on current need. Money, rep, etc

            //if (numberOnTerritory > 0) {
            //    nextTask = GANG_TASK.territory;
            //    numberOnTerritory--;
            //} else

            if (numberOnMoney > 0) {
                nextTask = GAIN_MONEY_TASK;
                numberOnMoney--;
            }

            member.targetTask = nextTask;

        }

        this.trainLowestMember(members);

        await this.fixWantedLevel(members);

        this.defendTerritory(info, members);

        this.enforceMinimumMoney(members);

        //assign tasks
        for (let member of members) {
            this._gang.setMemberTask(member.name, member.targetTask ?? GANG_TASK.unassigned);
        }

    }

    private displayStats() {
        this._ns.clearLog();

        let info = this._gang.getGangInformation();

        this.displayAugmentInfo(info);

        this.displayJobStats();

        this._ns.print(timestamp());
    }

    private trainLowestMember(members: MemberJobAssignment[]) {
        if (members.length) {

            type MyGangMemberInfo = MemberJobAssignment & { avgCombatStats: number };

            let avgCombatStatsList: MyGangMemberInfo[] = members.map(m => {
                    return {...m, avgCombatStats: (m.dex + m.agi + m.str + m.def) / 4.0};
                }
            );

            avgCombatStatsList.sort((a, b) => a.avgCombatStats - b.avgCombatStats);

            //get lowest combat stat
            let lowestMember = avgCombatStatsList[0];
            lowestMember.targetTask = GANG_TASK.trainCombat;

        }

    }

    private ascendMember(member: GangMemberInfo) {

        let results = this._gang.getAscensionResult(member.name);
        if (results) {
            let avgCombatIncrease = (results.def + results.agi + results.dex + results.str) / 4.0;
            if (avgCombatIncrease > ASCENSION_THRESHOLD) {
                debugLog(this._ns, DebugLevel.success, `Ascending ${member.name}!!`);
                this._gang.ascendMember(member.name);
            } else {
                //debugLog(this._ns, DebugLevel.info, `NOT ascending ${member.name}, avgCombatIncrease: ${avgCombatIncrease}`);
            }

        }

    }

    private async fixWantedLevel(members: MemberJobAssignment[]) {
        let gangInfo = this._gang.getGangInformation();
        let wantedPenalty = (1 - this._ns.formulas.gang.wantedPenalty(gangInfo)) * 100;
        wantedPenalty = round(wantedPenalty, 2);

        if (wantedPenalty > WANTED_PENALTY_THRESHOLD) {
            //if we have a penalty to fix, keep vigilante members doing their thing!
            members.forEach(m => {
                if (m.task === GANG_TASK.vigilante) {
                    m.targetTask = GANG_TASK.vigilante;
                }
            });

            let memberToUse = members.find(m => m.task !== GANG_TASK.vigilante);
            if (memberToUse) {
                debugLog(this._ns, DebugLevel.info, `Need to fix wanted penalty of ${wantedPenalty}%. Using ${memberToUse.name}`);
                memberToUse.targetTask = GANG_TASK.vigilante;
            }

        } else {
            //debugLog(this._ns, DebugLevel.info, `Wanted penalty is ok! ${wantedPenalty}%`);
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
                    debugLog(this._ns, DebugLevel.success, `Purchased '${nextEquip.name}' for ${member.name}`);
                } else {
                    debugLog(this._ns, DebugLevel.error, `Failed to purchase '${nextEquip.name}' for ${member.name}`);
                }

                this.updatePlayer();

            }

        }

        //buy the cheapest equipment that this member doesn't have

    }

    private defendTerritory(info: GangGenInfo, members: MemberJobAssignment[]) {
        //if our win chance is within this much of TARGET, reduce amount of members doing territory

        //if we have a chance of losing territory, set everyone to territory!

        if (info.territoryClashChance > 0) {
            //we want to have >=TARGET_CLASH_WIN_CHANCE with each faction

            let otherGangs = getOtherGangsInfo(this._ns);
            otherGangs.sort((a, b) => a.winChance - b.winChance);
            let strongestGang = otherGangs[0];

            //if (strongestGang.winChance < TARGET_CLASH_WIN_CHANCE) {

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

            let numMembersToUse = Math.ceil(members.length * percentMembersToUse);

            let currentDefenders = members.filter(m => m.task === GANG_TASK.territory);
            let nonDefenders = members.filter(m => m.task !== GANG_TASK.territory);

            debugLog(this._ns, DebugLevel.info, `Current defenders: ${currentDefenders.length}, desired number: ${numMembersToUse}`);

            let additionalNeeded = numMembersToUse - currentDefenders.length;

            if (additionalNeeded < 0) {
                //we have too many, reassign some to... money?
                debugLog(this._ns, DebugLevel.info, `too many defenders, switching one`);
                currentDefenders[0].targetTask = GAIN_MONEY_TASK;

                //debugLog(this._ns, DebugLevel.info, `too many defenders, switching ${Math.abs(additionalNeeded)}`);
                //let toChange = currentDefenders.slice(0, Math.abs(additionalNeeded) - 1);
                //toChange.forEach(m => m.targetTask = GAIN_MONEY_TASK);

            } else if (additionalNeeded > 0) {
                //we need more
                debugLog(this._ns, DebugLevel.info, `not enough defenders, switching one`);
                nonDefenders[0].targetTask = GANG_TASK.territory;

                //debugLog(this._ns, DebugLevel.info, `Not enough defenders, switching ${additionalNeeded}`);
                //let toChange = nonDefenders.slice(0, additionalNeeded - 1);
                //toChange.forEach(m => m.targetTask = GANG_TASK.territory);
            }

        }
    }

    private enforceMinimumMoney(members: MemberJobAssignment[]) {
        let moneyMakers = members.filter(m => m.targetTask === GAIN_MONEY_TASK);

        if (moneyMakers.length < minOnMoney) {
            let nonMoneyMaker = members.find(m => m.targetTask !== GAIN_MONEY_TASK);
            if (nonMoneyMaker) {
                nonMoneyMaker.targetTask = GAIN_MONEY_TASK;
            }
        }

    }

    private displayJobStats() {
        this._ns.print(`Member Jobs:`);
        let members = getAllMembers(this._ns);

        let jobCount: { jobName: string, count: number }[] = [];
        for (let member of members) {

            let count = jobCount.find(c => c.jobName === member.task);
            if (!count) {
                count = {jobName: member.task, count: 0};
                jobCount.push(count);
            }
            count.count++;

        }

        jobCount.sort((a, b) => a.jobName.localeCompare(b.jobName));
        for (let jobCountElement of jobCount) {
            this._ns.print(`${INDENT_STRING}${jobCountElement.jobName}: ${jobCountElement.count}, ${round(jobCountElement.count / members.length * 100)}%`);
        }

    }

    private displayAugmentInfo(info: GangGenInfo) {

        this._ns.print('Next augment:');

        let remainingAugNames = getRemainingFactionAugmentations(this._ns, info.faction);

        let augs = remainingAugNames.map(name => getAugmentFactionCostInfo(this._ns, name, info.faction));
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
    }
}