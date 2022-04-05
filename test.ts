import {NS} from './NetscriptDefinitions';
import {INetscriptExtra} from './types';

export async function main(ns: NS & INetscriptExtra) {
    ns.tail();

    ns.disableLog('ALL');
    ns.clearLog();
    let player = ns.getPlayer();

    /*

        let hackSkillRequired = ns.getServerRequiredHackingLevel(WORLD_DAEMON.hostname);
        let remainingHackSkill = hackSkillRequired - player.hacking;

        let expNeeded = ns.formulas.skills.calculateExp(hackSkillRequired, player.hacking_exp_mult);
        let currExp = player.hacking_exp;

        ns.print(`${INDENT_STRING}[${WORLD_DAEMON.hostname}] Hack Skill Req.: ${hackSkillRequired}, Current: ${player.hacking}, Remaining: ${remainingHackSkill}`);
        ns.print(`${INDENT_STRING}EXP Needed: ${formatBigNumber(expNeeded)}, Current EXP: ${formatBigNumber(currExp)}`);

        ns.print(JSON.stringify(player, null, 4));
    */

    player.

    let warehouse = ns.corporation.getWarehouse('Software', 'Sector-12');

    ns.print(warehouse);

}






