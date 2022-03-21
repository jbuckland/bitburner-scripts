import { CONTROLLER_SCRIPT } from './consts';
import { NS } from './NetscriptDefinitions';

export async function main(ns: NS) {

    let reset = await ns.prompt('Are you sure you want to reset?');
    if (reset) {
        ns.installAugmentations(CONTROLLER_SCRIPT);
        ns.softReset(CONTROLLER_SCRIPT);
    }

}