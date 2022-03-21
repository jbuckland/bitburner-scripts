import { GROW_SCRIPT, HACK_SCRIPT, HOME, HOSTS, SHARE_SCRIPT, WEAKEN_SCRIPT } from './consts';
import { NS } from './NetscriptDefinitions';
import { getThreadsAvailableForScript } from './utils';

export async function main(ns: NS) {
    
    
    
    let totalThreads = 0;

    for (let i = 0; i < HOSTS.length; i++) {
        let hostname = HOSTS[i];

        if (hostname === HOME) {
            ns.scriptKill(HACK_SCRIPT, hostname);
            ns.scriptKill(WEAKEN_SCRIPT, hostname);
            ns.scriptKill(GROW_SCRIPT, hostname);
        } else {
            ns.killall(hostname);
        }

        let numThreads = getThreadsAvailableForScript(ns, hostname, SHARE_SCRIPT);
        totalThreads += numThreads;
        if (numThreads > 0) {
            ns.exec(SHARE_SCRIPT, hostname, numThreads);
        }

    }

    ns.tprint(`Sharing ALL available server power!! (${totalThreads} threads)`);

}

