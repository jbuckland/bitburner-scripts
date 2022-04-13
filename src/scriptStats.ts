import { NS } from 'NetscriptDefinitions';
import { debug, formatBigNumber, formatBigRam, getAllHosts, timestamp } from 'utils/utils';
import { ITableData, Table } from 'utils/utils-table';

interface IRunningScriptStats {
    name: string;
    totalRamUsage: number;
    totalThreadUsage: number;

}

export async function main(ns: NS) {
    const SLEEP_TIME = 1000;

    ns.tail();
    ns.disableLog('ALL');

    while (true) {
        ns.clearLog();

        displayScriptStats();

        ns.print(`(Auto-refresh:${SLEEP_TIME / 1000}s)`);
        await ns.sleep(SLEEP_TIME);

    }

    function displayScriptStats() {
        let scriptStats: IRunningScriptStats[] = [];

        for (let i = 0; i < getAllHosts(ns).length; i++) {

            let host = getAllHosts(ns)[i];

            if (ns.hasRootAccess(host) && ns.getServerMaxRam(host) > 0) {

                let runningScripts = ns.ps(host);
                debug(ns, `${timestamp()} found ${runningScripts.length} running scripts on ${host}`);

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

        let scriptsTable: Table = new Table(ns);

        let tableData: ITableData[] = scriptStats.map(item => {
            return {
                'Script Name': item.name,
                'Ram': formatBigRam(item.totalRamUsage),
                'Threads': formatBigNumber(item.totalThreadUsage)
            };
        });
        scriptsTable.setData(tableData);

        ns.print(' Running Scripts:');
        scriptsTable.print();

        /*
        let maxNameLength: number = Math.max(...scriptStats.map(s => s.name.length)); //find length of longest string

        //ns.print(`Running Scripts:`);
        for (let i = 0; i < scriptStats.length; i++) {
            let stats = scriptStats[i];

            ns.print(`${stats.name.padEnd(maxNameLength)} | RAM usage ${formatBigRam(stats.totalRamUsage).padStart(7)}, Threads ${
                formatBigNumber(stats.totalThreadUsage).padStart(6)}`);
        }
        
         */
    }

}
