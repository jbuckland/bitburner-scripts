import {NS} from 'NetscriptDefinitions';

export async function main(ns: NS) {
    let target = ns.args[0] as string;


    let loop = false;
    if (ns.args[1] && ns.args[1] === 'loop') {
        loop = true;
    }

    if (!target) {
        ns.print('ERROR! please specify a target!');
        ns.exit();
    }

    do {
        let results = await ns.grow(target);
    } while (loop);


}
