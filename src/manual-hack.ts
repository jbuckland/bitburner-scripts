import {myFormatCurrency} from 'lib/utils';
import {NS} from 'NetscriptDefinitions';

export async function main(ns: NS) {

    let flags = ns.flags([['loop', false]]);

    do {
        let results = await ns.singularity.manualHack();

        ns.tprint(`hacked ${myFormatCurrency(results)}`);

    } while (flags.loop);

}
