import {NS} from 'NetscriptDefinitions';

export async function main(ns: NS) {
    let fragX = ns.args[0] as number;
    let fragY = ns.args[1] as number;

    if (isNaN(fragX) || isNaN(fragY)) {
        ns.tprint('ERROR! please specify a fragment X and Y!', {fragX, fragY});
        ns.exit();
    }

    await ns.stanek.chargeFragment(fragX, fragY);

}
