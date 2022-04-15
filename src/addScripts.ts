import {NS} from '/NetscriptDefinitions';
import {SCRIPTS} from 'lib/consts';
import {getAllHosts} from 'lib/utils';

export async function main(ns: NS) {

    let flags = ns.flags([['force', false]]);

    for (let i = 0; i < getAllHosts(ns).length; i++) {
        let host = getAllHosts(ns)[i];
        if (host != 'home') {
            ns.print('');
            ns.print(`Copying files to [${host}]`);
            await addScripts(ns, host, flags.force);

        }

    }
}

const scriptList = [
    SCRIPTS.backdoor,
    SCRIPTS.batchGrow,
    SCRIPTS.batchHack,
    SCRIPTS.batchWeaken,
    SCRIPTS.grow,
    SCRIPTS.hack,
    SCRIPTS.weaken,
    SCRIPTS.expGain,

    //these are utility files
    'share.js',
    '/lib/consts.js',
    '/lib/utils.js'

];

export async function addScripts(ns: NS, host: string, force: boolean = false) {
    for (let script of scriptList) {
        if (ns.fileExists(script, host)) {
            if (force) {
                ns.rm(script, host);
                await ns.scp(script, 'home', host);
            } else {
                ns.print(`${script} already exists. Skipping`);
            }

        } else {
            await ns.scp(script, 'home', host);
        }

    }
}
