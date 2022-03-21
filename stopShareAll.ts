//kill all other instances of SHARE_SCRIPT
import { HOSTS, SHARE_SCRIPT } from './consts';
import { NS } from './NetscriptDefinitions';

export async function main(ns: NS) {
    for (let i = 0; i < HOSTS.length; i++) {
        let hostname = HOSTS[i];
        ns.scriptKill(SHARE_SCRIPT, hostname);
    }

    ns.tprint(`all instances of ${SHARE_SCRIPT} stopped!`);
}