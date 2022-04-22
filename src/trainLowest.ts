import {crimes, GYMS} from 'lib/crime-consts';
import {formatBigNumber, formatPercent, indent, round, timestamp} from 'lib/utils';
import {AutocompleteData, NS, Player} from 'NetscriptDefinitions';
import {FlagSchema, INetscriptExtra} from 'types';



export function autocomplete(data: AutocompleteData, args: any[]) {
    data.flags(flagSchema);
    return [
        //...data.servers,
        //...data.scripts,
        //...data.txts
    ]; //return what you want to have in autocomplete
}

const flagSchema: FlagSchema = [
    ['homicide', false]
];

interface IStatInfo {
    name: string,
    currLevel: number,
    value: number,
    weightedExpToNextLevel: number,
    expToNextLevel: number
}

export async function main(ns: NS & INetscriptExtra) {
    ns.tail();
    ns.disableLog('ALL');

    let flags = ns.flags(flagSchema);
    const TARGET_HOMICIDE = flags.homicide;

    let trainingWaitTime = 1000;
    let statToTrain = {name: '', value: 0};

    let targetCrime = crimes.homicide;

    function makeStatInfo(statName: keyof Player, statMultiplier: number, targetCrimeStatWeight: number): IStatInfo {
        let player = ns.getPlayer();
        let currStatLevel = player[statName];
        let nextLevel = currStatLevel + 1;

        let totalExpForCurrLevel = ns.formulas.skills.calculateExp(currStatLevel, statMultiplier);
        let totalExpNeededForNextLevel = ns.formulas.skills.calculateExp(nextLevel, statMultiplier);
        let expToNextLevel = totalExpNeededForNextLevel - totalExpForCurrLevel;
        let weightedExpToNextLevel = round(expToNextLevel / targetCrimeStatWeight, 1);
        return {name: statName, currLevel: currStatLevel, value: currStatLevel / targetCrime.agiWeight, weightedExpToNextLevel, expToNextLevel};
    }


    while (true) {
        let player = ns.getPlayer();

        let playerStats = [];
        playerStats.push(makeStatInfo('agility', player.agility_mult, targetCrime.agiWeight));
        playerStats.push(makeStatInfo('defense', player.defense_mult, targetCrime.defWeight));
        playerStats.push(makeStatInfo('strength', player.strength_mult, targetCrime.strWeight));
        playerStats.push(makeStatInfo('dexterity', player.dexterity_mult, targetCrime.dexWeight));

        let targetStat: keyof IStatInfo = 'expToNextLevel';
        let msg = `EXP to next level:`;
        if (TARGET_HOMICIDE) {
            targetStat = 'weightedExpToNextLevel';
            msg = `Weighted ` + msg;
        }



        playerStats.sort((a, b) => (a[targetStat] as number) - (b[targetStat] as number));



        let lowestStat = playerStats[0];
        if (lowestStat.name !== statToTrain.name) {
            statToTrain = lowestStat;

            ns.singularity.gymWorkout(GYMS.powerhouse, statToTrain.name, true);
        }

        ns.clearLog();
        ns.print(msg);

        playerStats.forEach(ps => {
            ns.print(`${indent()} ${ps.name.padEnd(9)}: ${formatBigNumber(ps[targetStat] as number).padStart(6)}`);
        });


        ns.print(`${timestamp()} Training '${statToTrain.name}'`);
        if (TARGET_HOMICIDE) {
            ns.print(`${timestamp()} ${targetCrime.name} Chance: ${formatPercent(ns.singularity.getCrimeChance(targetCrime.name))}`);
        }
        await ns.sleep(trainingWaitTime);

    }

}
