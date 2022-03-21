import { NS } from './NetscriptDefinitions';
import { getAllServerInfo, getPriorityServers, myFormatCurrency, round, timestamp } from './utils';

export async function main(ns: NS) {
    const SLEEP_TIME = 1000;
    let flags = ns.flags([['refresh', false]]);

    const REFRESH: boolean = flags.refresh;
    ns.tail();
    ns.disableLog('ALL');

    do {
        ns.clearLog();

        let serverInfo = getPriorityServers(ns, getAllServerInfo(ns));
        
        /*serverInfo.sort((a, b) => {
            return ((a.growthParam ?? 0) / (a.minSecurity ?? 1)) - ((b.growthParam ?? 0) / (b.minSecurity ?? 1));
        });*/

        let maxHostLength: number = Math.max(...serverInfo.map(s => s.hostname.length)); //find length of longest string

        serverInfo.forEach(s => {

            let weakenSeconds = Math.round((s.weakenTime ?? 0) / 1000 / 60);
            let weakenString = `WeakTime: ${weakenSeconds.toString().padStart(4)}s`;
            let valueString = `Value: ${round((s.growthParam / s.minSecurity), 1)}`;
            let growthParamString = `GrowP: ${s.growthParam}`;

            let currSecString = (Math.round((s.currSecurity ?? 0) * 10) / 10).toString().padStart(4);
            let minSecString = (s.minSecurity ?? 0).toString().padStart(2);
            let secString = `Sec: ${currSecString}/${minSecString}`;
            let moneyString = `${myFormatCurrency(s.currMoney).padStart(7)} / ${myFormatCurrency(s.maxMoney).padStart(7)}`;

            ns.print(`${s.hostname.padEnd(maxHostLength)} ${secString}, ${moneyString}`);

        });
        ns.print(timestamp());
        let income = ns.getScriptIncome();
        let exp = ns.getScriptExpGain('controller.js', 'home');
        ns.print(`Stats: ${myFormatCurrency(income[0])}/s, ${Math.round(exp)} xp/s`);

        if (REFRESH) {
            ns.print(`(Auto-refresh:${SLEEP_TIME / 1000}s)`);
            await ns.sleep(SLEEP_TIME);
        }

    } while (REFRESH);

}