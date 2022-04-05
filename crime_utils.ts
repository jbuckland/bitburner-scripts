import {GANG_TASK, GYMS, PLAYER_STATS} from './crime_consts';
import {GangMemberInfo, GangOtherInfoObject, GangTaskStats, NS} from './NetscriptDefinitions';
import {OtherGangInfo} from './types';

export function trainStat(ns: NS, stat: PLAYER_STATS) {
    if (ns.isBusy()) {
        ns.gymWorkout(GYMS.powerhouse, PLAYER_STATS.dex);

    }
}

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
            winChance: 1 - (gang.power / us.power)
        };
    });
    otherGangsInfo = otherGangsInfo.filter(g => g.name !== us.faction);

    return otherGangsInfo;
}