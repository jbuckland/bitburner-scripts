import { SCRIPTS } from './consts';

import { NS } from './NetscriptDefinitions';
import { getAllHosts } from './utils';

export async function main(ns: NS) {

    let flags = ns.flags([['force', false]]);

    for (let i = 0; i < getAllHosts(ns).length; i++) {
        let host = getAllHosts(ns)[i];
        if (host != 'home') {

            await addScripts(ns, host, flags.force);

        }

    }
}

const scriptList = [
    SCRIPTS.backdoor,
    SCRIPTS.batchGrow,
    SCRIPTS.batchHack,
    SCRIPTS.batchWeaken,
    SCRIPTS.donate,
    SCRIPTS.grow,
    SCRIPTS.hack,
    SCRIPTS.reset,
    SCRIPTS.weaken,
    SCRIPTS.expGain,

    //these are utility files
    'share.js',
    'consts.js',
    'utils.js'

];

export async function addScripts(ns: NS, host: string, force: boolean = false) {
    for (let j = 0; j < scriptList.length; j++) {
        let script = scriptList[j];

        if (ns.fileExists(script, host)) {
            if (force) {
                ns.rm(script, host);
                await ns.scp(script, 'home', host);
            } else {
                ns.print(`${script} already exists on ${host}. Skipping`);
            }

        } else {
            await ns.scp(script, 'home', host);
        }

    }
}
