//kill all other instances of SHARE_SCRIPT
import { HOSTS, SCRIPTS } from 'utils/consts';
import { NS } from 'NetscriptDefinitions';

export async function main(ns: NS) {
    for (let i = 0; i < HOSTS.length; i++) {
        let hostname = HOSTS[i];
        ns.scriptKill(SCRIPTS.myShare, hostname);
    }

    ns.tprint(`all instances of ${SCRIPTS.myShare} stopped!`);
}
