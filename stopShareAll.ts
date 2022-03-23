//kill all other instances of SHARE_SCRIPT
import { HOSTS, SCRIPTS } from './consts';
import { NS } from './NetscriptDefinitions';

export async function main(ns: NS) {
    for (let i = 0; i < HOSTS.length; i++) {
        let hostname = HOSTS[i];
        ns.scriptKill(SCRIPTS.share, hostname);
    }

    ns.tprint(`all instances of ${SCRIPTS.share} stopped!`);
}