import { SCRIPTS } from './consts';
import { NS } from './NetscriptDefinitions';

export async function main(ns: NS) {

    let reset = await ns.prompt('Are you sure you want to reset?');
    if (reset) {
        ns.installAugmentations(SCRIPTS.controller);
        ns.softReset(SCRIPTS.controller);
    }

}