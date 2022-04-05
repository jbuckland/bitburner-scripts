import {COMPANY_FACTIONS, GANG_FACTIONS, HACK_FACTIONS, SCRIPTS} from './consts';
import {NS} from './NetscriptDefinitions';
import {getAllTargetInfo, setSettings, timestamp} from './utils';
import {getTargetWorkInfoForTargets, isReadyForBatch} from './utils-controller';
import {
    buyDarkwebTools,
    displayIncomeStats,
    displayNextDarkwebTool,
    displayRunnerStatsNoHomeServer,
    installBackdoors,
    joinFactions,
    upgradeHomeComputer
} from './utils-player';
import {doBatches, prepAllTargets, singleHack} from './hack-utils';

const SLEEP_TIME = 1000;

//this script is just to get us from the 64gb to the 128gb home server upgrade
export async function main(ns: NS) {

    ns.disableLog('ALL');
    ns.tail();

    setSettings(ns, {hackPercent: 0.05});

    runInitialScripts();

    while (true) {
        ns.clearLog();
        ns.print(timestamp());

        let targetWorkInfos = getTargetWorkInfoForTargets(ns, getAllTargetInfo(ns));

        let workReadyForBatch = targetWorkInfos.filter(w => isReadyForBatch(w));

        let batchSuccesses = 0;
        if (workReadyForBatch.length > 0) {

            batchSuccesses = await doBatches(ns, workReadyForBatch); //+4 gb

        } else {
            singleHack(ns, targetWorkInfos[0].target.hostname);
        }

        let PREP_PERCENT = 0.5;
        prepAllTargets(ns, targetWorkInfos, PREP_PERCENT);
        await installBackdoors(ns);
        joinFactions(ns, [...Object.values(HACK_FACTIONS), ...Object.values(COMPANY_FACTIONS), ...Object.values(GANG_FACTIONS)]);
        upgradeHomeComputer(ns);
        buyDarkwebTools(ns);

        displayIncomeStats(ns);
        displayNextDarkwebTool(ns);
        displayRunnerStatsNoHomeServer(ns);

        await ns.sleep(SLEEP_TIME);
    }

    function runInitialScripts() {
        ns.run(SCRIPTS.addScripts);
        ns.run(SCRIPTS.debugWatcher);
        ns.run(SCRIPTS.targetStats);
        //ns.run('basic-crime.js');
    }

}

