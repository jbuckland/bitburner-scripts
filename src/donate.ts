import {NS} from 'NetscriptDefinitions';

export async function main(ns: NS) {

    let factionName = ns.args[0] as string;
    let amount = ns.args[1] as number;
    ns.singularity.donateToFaction(factionName, amount);

}
