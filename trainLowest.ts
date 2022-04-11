import { crimes, GYMS } from './crime_consts';
import { NS, Player } from './NetscriptDefinitions';
import { INetscriptExtra } from './types';
import { formatBigNumber, formatPercent, indent, round, timestamp } from './utils';

export async function main(ns: NS & INetscriptExtra) {
    ns.tail();

    let trainingWaitTime = 5000;
    let statToTrain = { name: '', value: 0 };

    let targetCrime = crimes.homicide;

    function makeStatInfo(statName: keyof Player, statMultiplier: number, targetCrimeStatWeight: number) {
        let player = ns.getPlayer();
        let currStatLevel = player[statName];
        let nextLevel = currStatLevel + 1;

        let expNeededForNextLevel = ns.formulas.skills.calculateExp(nextLevel, statMultiplier);
        let weightedExpToNextLevel = round(expNeededForNextLevel / targetCrimeStatWeight, 1);
        return { name: statName, currLevel: currStatLevel, value: currStatLevel / targetCrime.agiWeight, weightedExpToNextLevel };
    }

    while (true) {
        let player = ns.getPlayer();

        let playerStats = [];
        playerStats.push(makeStatInfo('agility', player.agility_mult, targetCrime.agiWeight));
        playerStats.push(makeStatInfo('defense', player.defense_mult, targetCrime.defWeight));
        playerStats.push(makeStatInfo('strength', player.strength_mult, targetCrime.strWeight));
        playerStats.push(makeStatInfo('dexterity', player.dexterity_mult, targetCrime.dexWeight));

        playerStats.sort((a, b) => a.weightedExpToNextLevel - b.weightedExpToNextLevel);

        let lowestStat = playerStats[0];
        if (lowestStat.name !== statToTrain.name) {
            statToTrain = lowestStat;

            ns.gymWorkout(GYMS.powerhouse, statToTrain.name, true);
        }

        ns.print(`Weighted EXP to next level:`);
        playerStats.forEach(ps => {
            ns.print(`${indent()} ${ps.name.padEnd(9)}: ${formatBigNumber(ps.weightedExpToNextLevel).padStart(6)}`);
        });

        ns.print(`${timestamp()} Training '${statToTrain.name}'`);
        ns.print(`${timestamp()} ${targetCrime.name} Chance: ${formatPercent(ns.getCrimeChance(targetCrime.name))}`);
        await ns.sleep(trainingWaitTime);

    }

}
