//kill all other instances of SHARE_SCRIPT
import { NS } from 'NetscriptDefinitions';
import { HOSTS, SCRIPTS } from 'lib/consts';

export async function main(ns: NS) {
    for (let i = 0; i < HOSTS.length; i++) {
        let hostname = HOSTS[i];
        ns.scriptKill(SCRIPTS.myShare, hostname);
    }
    ns.tprint(`all instances of ${SCRIPTS.myShare} stopped!`);
}
