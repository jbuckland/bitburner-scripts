import {purchaseAvailableAugmentations} from 'lib/utils-player';
import {NS} from 'NetscriptDefinitions';

export async function main(ns: NS) {

    let flags = ns.flags([['force', false]]);

    await purchaseAvailableAugmentations(ns);

}


