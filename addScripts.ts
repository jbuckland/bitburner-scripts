import { SCRIPTS } from './consts';
import { NS } from './NetscriptDefinitions';
import { getAllHosts } from './utils';

export async function main(ns: NS) {

    ns.tail();

    const scriptList = [
        SCRIPTS.hack,
        SCRIPTS.weaken,
        SCRIPTS.grow,
        SCRIPTS.batchHack,
        SCRIPTS.batchWeaken,
        SCRIPTS.batchGrow,

        'share.js',
        'consts.js',
        'utils.js'
    ];

    let flags = ns.flags([['force', false]]);

    for (let i = 0; i < getAllHosts(ns).length; i++) {
        let host = getAllHosts(ns)[i];
        if (host != 'home') {

            for (let j = 0; j < scriptList.length; j++) {
                let script = scriptList[j];

                if (ns.fileExists(script, host)) {
                    if (flags.force) {
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

    }
}