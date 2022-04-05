import {NS} from './NetscriptDefinitions';
import {setSettings, timestamp} from './utils';
import {
    buyDarkwebTools,
    displayIncomeStats,
    displayNextDarkwebTool,
    displayServerStats,
    installBackdoors
} from './utils-player';

const SLEEP_TIME = 1000;

export async function main(ns: NS) {
    ns.disableLog('ALL');
    ns.tail();

    setSettings(ns, {hackPercent: 0.001});

    while (true) {
        ns.clearLog();
        ns.print(`${timestamp()}`);

        //requires 30.6 gb

        buyDarkwebTools(ns);
        await installBackdoors(ns);

        let costMultiplierBeforeBuying = 2.25;
        //tryPurchaseServer(ns, costMultiplierBeforeBuying);

        displayIncomeStats(ns);
        displayServerStats(ns, costMultiplierBeforeBuying);
        displayNextDarkwebTool(ns);

        await ns.sleep(SLEEP_TIME);

    }
}
