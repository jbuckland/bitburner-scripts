import {SCRIPTS} from './consts';
import {NS} from './NetscriptDefinitions';
import {getAllTargetInfo, timestamp} from './utils';
import {getTargetWorkInfoForTargets, isReadyForBatch} from './utils-controller';
import {
    displayIncomeStats,
    displayNextDarkwebTool,
    displayRunnerStatsNoHomeServer,
    installBackdoors
} from './utils-player';
import {doBatches, prepAllTargets, singleHack} from './hack-utils';

const SLEEP_TIME = 1000;

//this script is just to get us to the 64gb home server upgrade
export async function main(ns: NS) {

    ns.disableLog('ALL');
    ns.tail();
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
        let PREP_PERCENT = 0.6;
        prepAllTargets(ns, targetWorkInfos, PREP_PERCENT);
        await installBackdoors(ns);
        //joinFactions(ns, [...Object.values(HACK_FACTIONS), ...Object.values(COMPANY_FACTIONS), ...Object.values(GANG_FACTIONS)]);

        //buyDarkwebTools(ns); +4gb
        displayIncomeStats(ns);
        displayNextDarkwebTool(ns);
        displayRunnerStatsNoHomeServer(ns);

        await ns.sleep(SLEEP_TIME);
    }

    function runInitialScripts() {
        ns.run(SCRIPTS.autoNuke);
        ns.run(SCRIPTS.addScripts);
        //ns.run('basic-crime.js');
    }

}

