import {NS} from './NetscriptDefinitions';

export async function main(ns: NS) {
    let target = ns.args[0] as string;

    if (!target) {
        ns.print('ERROR! please specify a target!');
        ns.exit();
    }

    let results = await ns.weaken(target);

}
