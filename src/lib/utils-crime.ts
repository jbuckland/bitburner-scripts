import { GangMemberInfo, GangOtherInfoObject, GangTaskStats, NS } from 'NetscriptDefinitions';
import { OtherGangInfo } from 'types';
import { CYCLES_PER_SECOND } from 'lib/consts';
import { GANG_TASK } from 'lib/crime-consts';

export function getAllMembers(ns: NS): GangMemberInfo[] {
    let memberNames = ns.gang.getMemberNames();

    let memberInfo = memberNames.map(name => ns.gang.getMemberInformation(name));
    return memberInfo;

}

export function getAllTaskInfo(ns: NS): GangTaskStats[] {
    let taskNames = ns.gang.getTaskNames();
    return taskNames.map(task => ns.gang.getTaskStats(task));
}

export function canDoTask(ns: NS, task: GANG_TASK) {
    return ns.gang.getTaskNames().includes(task);
}

export function getMemberAvgCombatSkill(member: GangMemberInfo) {
    let avgCombatSkill = (
        (member.str * member.str_mult * member.str_asc_mult) +
        (member.def * member.def_mult * member.def_asc_mult) +
        (member.dex * member.dex_mult * member.dex_asc_mult) +
        (member.agi * member.agi_mult * member.agi_asc_mult)
    ) / 4.0;
    return avgCombatSkill;
}

export function getOtherGangsInfo(ns: NS): OtherGangInfo[] {

    //them/us gives lose chance
    // 1 - (them/us) gives win chance

    let us = ns.gang.getGangInformation();

    let others = ns.gang.getOtherGangInformation();
    let otherGangsInfo: OtherGangInfo[] = Object.entries(others).map(e => {

        let gang: GangOtherInfoObject = e[1];
        return {
            ...gang,
            name: e[0],
            winChance: (us.power / (gang.power + us.power)) ?? 0
        };
    });
    otherGangsInfo = otherGangsInfo.filter(g => g.name !== us.faction);

    return otherGangsInfo;
}

// Cost of upgrade gets cheaper as gang increases in respect + power
export function getGangDiscountMult(ns: NS): number {
    let info = ns.gang.getGangInformation();
    const power = info.power;
    const respect = info.respect;

    const respectLinearFac = 5e6;
    const powerLinearFac = 1e6;

    const discount = Math.pow(respect, 0.01) + respect / respectLinearFac + Math.pow(power, 0.01) + power / powerLinearFac - 1;
    return (1 / Math.max(1, discount));
}

export function getGangIncome(ns: NS) {
    if (ns.gang.inGang()) {
        return ns.gang.getGangInformation().moneyGainRate * CYCLES_PER_SECOND;
    } else {
        return 0;
    }

}

export function myGetScriptIncome(ns: NS) {
    let scriptMoney = ns.getScriptIncome();
    return scriptMoney[0];

}

export function getHacknetIncome(ns: NS) {
    let numHacknetNodes = ns.hacknet.numNodes();
    let totalHashGain = 0;
    for (let i = 0; i < numHacknetNodes; i++) {
        let nodeInfo = ns.hacknet.getNodeStats(i);
        totalHashGain += nodeInfo.production;
    }
    let hacknetMoneyIncome = (totalHashGain / 4) * 1e6;
    return hacknetMoneyIncome;

}

export function getTotalIncome(ns: NS): number {
    return getGangIncome(ns) + myGetScriptIncome(ns) + getHacknetIncome(ns);

}

export function getWantedPenaltyMult(respect: number, wanted: number): number {
    if (respect + wanted > 0) {
        return (respect / (respect + wanted));
    } else {
        return 1;
    }
}
