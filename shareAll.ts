import { HOME, HOSTS, SCRIPTS } from './consts';
import { NS } from './NetscriptDefinitions';
import { getThreadsAvailableForScript } from './utils';

export async function main(ns: NS) {

    let totalThreads = 0;

    for (let i = 0; i < HOSTS.length; i++) {
        let hostname = HOSTS[i];

        if (hostname === HOME) {
            ns.scriptKill(SCRIPTS.hack, hostname);
            ns.scriptKill(SCRIPTS.weaken, hostname);
            ns.scriptKill(SCRIPTS.grow, hostname);
        } else {
            ns.killall(hostname);
        }

        let numThreads = getThreadsAvailableForScript(ns, hostname, SCRIPTS.share);
        totalThreads += numThreads;
        if (numThreads > 0) {
            ns.exec(SCRIPTS.share, hostname, numThreads);
        }

    }

    ns.tprint(`Sharing ALL available server power!! (${totalThreads} threads)`);

}

