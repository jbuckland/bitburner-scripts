import {NS} from './NetscriptDefinitions';
import {purchaseAvailableAugmentations} from './utils-player';

export async function main(ns: NS) {

    let flags = ns.flags([['force', false]]);

    purchaseAvailableAugmentations(ns);

}


