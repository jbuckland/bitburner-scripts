import { SCRIPTS } from './consts';
import { NS } from './NetscriptDefinitions';
import { formatBigNumber, getAllServerInfo, getRandomId, getThreadsAvailableForScript, round, timestamp } from './utils';

export async function main(ns: NS) {

    ns.tail();
    ns.disableLog('ALL');

    const SHARE_FRACTION = .75;

    while (true) {

        let totalThreads = 0;

        let serverInfo = getAllServerInfo(ns);

        for (let i = 0; i < serverInfo.length; i++) {
            const server = serverInfo[i];

            if (server.hasRoot) {

                let numThreads = getThreadsAvailableForScript(ns, server.hostname, SCRIPTS.share);
                let threadsToRun = round(numThreads * SHARE_FRACTION);

                if (threadsToRun > 0) {
                    totalThreads += threadsToRun;
                    ns.exec(SCRIPTS.share, server.hostname, threadsToRun, getRandomId());
                }

            }

        }

        ns.print(`${timestamp()} SHARE for ${formatBigNumber(totalThreads).padStart(6)} threads!`);
        await ns.sleep(1000);
    }

}

