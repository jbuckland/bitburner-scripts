import { NS } from './NetscriptDefinitions';
import { getAllHosts, timestamp } from './utils';

interface IRunningScriptStats {
    name: string;
    totalRamUsage: number;
    totalThreadUsage: number;

}

export async function main(ns: NS) {
    const SLEEP_TIME = 1000;
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
            return a.name.localeCompare(b.name);
        });

        let maxNameLength: number = Math.max(...scriptStats.map(s => s.name.length)); //find length of longest string

        for (let i = 0; i < scriptStats.length; i++) {
            let stats = scriptStats[i];

            ns.print(`${stats.name.padEnd(maxNameLength)} | RAM usage ${stats.totalRamUsage.toString().padStart(5)}, Threads ${
                stats.totalThreadUsage.toString().padStart(4)}`);
        }
        ns.print(timestamp());

        if (REFRESH) {
            ns.print(`(Auto-refresh:${SLEEP_TIME / 1000}s)`);
            await ns.sleep(SLEEP_TIME);
        }
    } while (REFRESH);

}
