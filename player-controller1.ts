import {NS} from './NetscriptDefinitions';
import {setSettings, timestamp} from './utils';
import {buyDarkwebTools, displayIncomeStats, displayNextDarkwebTool, displayServerStats, installBackdoors, tryPurchaseServer} from './utils-player';

const SLEEP_TIME = 1000;

export async function main(ns: NS) {
    ns.disableLog('ALL');
    ns.tail();


    setSettings(ns, {hackPercent: 0.001});

    while (true) {
        ns.clearLog();
        ns.print(`${timestamp()}`);

        //requires 78.4GB


        buyDarkwebTools(ns); //+65.9
        await installBackdoors(ns); //+3.8

        let costMultiplierBeforeBuying = 2.25;
        tryPurchaseServer(ns, costMultiplierBeforeBuying);

        displayServerStats(ns, costMultiplierBeforeBuying);
        displayNextDarkwebTool(ns); //+0.6
        displayIncomeStats(ns); //+0.2

        await ns.sleep(SLEEP_TIME);

    }
}
