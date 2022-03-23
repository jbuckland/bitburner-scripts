import { NS } from './NetscriptDefinitions';
import { myFormatCurrency } from './utils';

export async function main(ns: NS) {

    let flags = ns.flags([['loop', false]]);

    do {
        let results = await ns.manualHack();

        ns.tprint(`hacked ${myFormatCurrency(results)}`);

    } while (flags.loop);

}
     