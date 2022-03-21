import { NS } from './NetscriptDefinitions';
import { formatBigNumber, formatBigRam, getAllHosts, round, timestamp } from './utils';

interface IRunnerServer {
    hostname: string;
    maxRam: number;
    usedRam: number;
    freeRam: number;
}

interface IRunningScriptStats {
    name: string;
    totalRamUsage: number;
    totalThreadUsage: number;

}

export async function main(ns: NS) {
    const SLEEP_TIME = 250;
    let flags = ns.flags([
        ['refresh', true],
        ['debug', false]
    ]);

    const REFRESH: boolean = flags.refresh;
    const DEBUG: boolean = flags.debug;
    ns.tail();
    ns.disableLog('ALL');

    do {
        ns.clearLog();

        displayRunnerStats();
        ns.print('');
        displayScriptStats();

        ns.print('');

        if (REFRESH) {
            ns.print(`${timestamp()} Auto-refresh:${SLEEP_TIME / 1000}s`);
            await ns.sleep(SLEEP_TIME);
        }
    } while (REFRESH);

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

    function displayScriptStats() {
        let scriptStats: IRunningScriptStats[] = [];

        for (let i = 0; i < getAllHosts(ns).length; i++) {

            let host = getAllHosts(ns)[i];

            if (ns.hasRootAccess(host) && ns.getServerMaxRam(host) > 0) {

                let runningScripts = ns.ps(host);
                if (DEBUG) ns.print(`${timestamp()} found ${runningScripts.length} running scripts on ${host}`);

                for (let j = 0; j < runningScripts.length; j++) {
                    let script = runningScripts[j];

                    let stats = scriptStats.find(s => s.name === script.filename);

                    if (!stats) {
                        stats = {
                            name: script.filename,
                            totalThreadUsage: 0,
                            totalRamUsage: 0
                        };
                        scriptStats.push(stats);
                    }

                    stats.totalThreadUsage += script.threads;
                    stats.totalRamUsage += script.threads * ns.getScriptRam(script.filename, host);

                }

            }

        }

        scriptStats.sort((a, b) => {
            return a.totalRamUsage - b.totalRamUsage;
        });

        let maxNameLength: number = Math.max(...scriptStats.map(s => s.name.length)); //find length of longest string

        //ns.print(`Running Scripts:`);
        for (let i = 0; i < scriptStats.length; i++) {
            let stats = scriptStats[i];

            ns.print(`${stats.name.padEnd(maxNameLength)} | RAM usage ${formatBigRam(stats.totalRamUsage).padStart(7)}, Threads ${
                formatBigNumber(stats.totalThreadUsage).padStart(6)}`);
        }
    }

}




