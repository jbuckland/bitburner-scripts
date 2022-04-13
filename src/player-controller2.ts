import { NS } from 'NetscriptDefinitions';
import { formatBigNumber, round, setSettings, timestamp } from 'utils/utils';
import {
    buyDarkwebTools, displayHacknetInfo,
    displayHomeUpgradeInfo,
    displayIncomeStats,
    displayNextDarkwebTool,
    displayServerStats,
    installBackdoors,
    tryPurchaseServer,
    upgradeHomeComputer
} from 'utils/utils-player';

const SLEEP_TIME = 1000;
let COST_MULTIPLIER_BEFORE_BUYING = 1.5;

export async function main(ns: NS) {
    ns.disableLog('ALL');
    ns.tail();

    setSettings(ns, { hackPercent: 0.002 });

    while (true) {
        ns.clearLog();
        ns.print(`${timestamp()}`);

        //requires 222.6GB

        buyDarkwebTools(ns); //+65.9
        await installBackdoors(ns); //+3.8
        upgradeHomeComputer(ns); //+146.5

        tryPurchaseServer(ns, COST_MULTIPLIER_BEFORE_BUYING); //+9.1

        ////////////////////////
        // Display
        ////////////////////////
        //displayNextAugmentInfo(ns, targetAug);
        //ns.print('');
        //displayFactionProgress(ns);
        //ns.print('');
        displayIncomeStats(ns);
        displayServerStats(ns, COST_MULTIPLIER_BEFORE_BUYING);
        displayNextDarkwebTool(ns);
        displayHomeUpgradeInfo(ns);
        displayHacknetInfo(ns);

        let shareBonus = (ns.getSharePower() - 1) * 100;
        ns.print(`Share Bonus: +${round(shareBonus, 2)}%`);
        ns.print('');

        await ns.sleep(SLEEP_TIME);

    }
}

