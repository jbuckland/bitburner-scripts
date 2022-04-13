import { NS } from 'NetscriptDefinitions';
import { IRunnerServer } from 'types';
import { formatBigRam, getAllHosts, round, timestamp } from 'lib/utils';

interface IRunningScriptStats {
    name: string;
    totalRamUsage: number;
    totalThreadUsage: number;

}

export async function main(ns: NS) {
    const SLEEP_TIME = 250;

    ns.tail();
    ns.disableLog('ALL');

    while (true) {
        ns.clearLog();

        displayRunnerStats();
        ns.print('');

        ns.print(`${timestamp()} Auto-refresh:${SLEEP_TIME / 1000}s`);
        await ns.sleep(SLEEP_TIME);

    }

    function displayRunnerStats() {
        let runners: IRunnerServer[] = [];

        for (let i = 0; i < getAllHosts(ns).length; i++) {
            let host = getAllHosts(ns)[i];

            if (ns.hasRootAccess(host) && ns.getServerMaxRam(host) > 0) {
                let maxRam = ns.getServerMaxRam(host);
                let usedRam = ns.getServerUsedRam(host);

                let runner = {
                    hostname: host,
                    maxRam,
                    usedRam: round(usedRam, 1),
                    freeRam: round(maxRam - usedRam, 1)
                };

                runners.push(runner);
            }

        }

        runners.sort((a, b) => {
            return a.maxRam - b.maxRam;
        });

        let maxHostLength: number = Math.max(...runners.map(s => s.hostname.length)); //find length of longest string

        let totalUsedRam = 0;
        let totalMaxRam = 0;
        let totalFreeRam = 0;
        for (let i = 0; i < runners.length; i++) {
            let runner = runners[i];
            totalUsedRam += runner.usedRam;
            totalMaxRam += runner.maxRam;
            totalFreeRam += runner.maxRam - runner.usedRam;
            ns.print(`${runner.hostname.padEnd(maxHostLength)}| RAM ${formatBigRam(runner.usedRam).padStart(7)} / ${formatBigRam(runner.maxRam).padStart(3)}`);
        }

        ns.print(`Count: ${runners.length}, Total Ram: ${formatBigRam(totalFreeRam)} free of ${formatBigRam(totalMaxRam)}`);

    }

}




