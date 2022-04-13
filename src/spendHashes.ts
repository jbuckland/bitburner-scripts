import { AutocompleteData, NS } from 'NetscriptDefinitions';
import { FlagSchema } from 'types';
import { round, timestamp } from 'lib/utils';

export function autocomplete(data: AutocompleteData, args: any[]) {
    console.log(`autocomplete()`, args);
    data.flags(flagSchema);

    let flagOptions: string[] = [];
    if (args && args.length >= 0) {
        if (args[0] === '--incMaxMoney') {
            flagOptions = [...data.servers];
        } else if (args[0] === '--decMinSec') {
            flagOptions = [...data.servers];
        }
    }

    return [
        ...flagOptions
        //...data.servers,
        //...data.scripts,
        //...data.txts
    ]; //return what you want to have in autocomplete
}

const flagSchema: FlagSchema = [
    ['sell', ''],
    ['incMaxMoney', ''],
    ['decMinSec', -1]

];

export async function main(ns: NS) {

    ns.tail();
    // ns.disableLog('ALL');

    let flags = ns.flags([
        ['sell', false]
    ]);

    let target = 'ecorp';
    while (true) {

        /*
        let minSec = ns.hacknet.spendHashes('Reduce Minimum Security', target);
        if (minSec) {
            ns.print(`Reduced min sec on ${target} to ${round(ns.getServer(target).minDifficulty, 1)}!`);
        }
        */

        /*
                let maxMoney = ns.hacknet.spendHashes('Increase Maximum Money', target);
                if (maxMoney) {
                    ns.print(`Increased max money on ${target} to ${formatCurrency(ns.getServer(target).moneyMax)}!`);
                }
        */
        let maxMoney = ns.hacknet.spendHashes(HacknetSpendNames.money);

        ns.print(`${timestamp()}Hashes: ${round(ns.hacknet.numHashes())}`);

        await ns.sleep(1000);
    }

}

export enum HacknetSpendNames {
    money = 'Sell for Money',
    reduceMinSec = 'Reduce Minimum Security',
    incMaxMoney = 'Increase Maximum Money'
}
