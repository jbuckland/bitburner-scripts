import { SCRIPTS }from 'lib/consts';
import { NS } from 'NetscriptDefinitions';
import { doBatches, prepAllTargets, singleHack } from 'lib/hack-utils';
import { getAllTargetInfo, timestamp } from 'lib/utils';
import { getTargetWorkInfoForTargets, isReadyForBatch } from 'lib/utils-controller';
import { displayIncomeStats, displayNextDarkwebTool, displayRunnerStatsNoHomeServer, installBackdoors } from 'lib/utils-player';

//this script is just to get us to the 64gb home server upgrade
export async function main(ns: NS) {

    let controller = new HackController0(ns);
    await controller.doRun();

}

class HackController0 {
    private SLEEP_TIME = 1000;

    constructor(private ns: NS) {
        //ns.disableLog('ALL');
        ns.disableLog('sleep');
        ns.disableLog('getServerMaxRam');
        ns.disableLog('getServerUsedRam');
        ns.disableLog('getServerRequiredHackingLevel');
        ns.disableLog('exec');
        ns.disableLog('getServerGrowth');
        ns.disableLog('getServerMoneyAvailable');
        ns.disableLog('getServerMaxMoney');
        ns.disableLog('getServerMinSecurityLevel');
        ns.disableLog('getServerSecurityLevel');
        ns.tail();

        this.runInitialScripts();
    }

    public async doRun() {
        let crimeTime = 100;
        while (true) {
            this.ns.clearLog();
            this.ns.print(timestamp());
            //this.SLEEP_TIME = this.ns.singularity.commitCrime('mug');

            let targetWorkInfos = getTargetWorkInfoForTargets(this.ns, getAllTargetInfo(this.ns));

            let workReadyForBatch = targetWorkInfos.filter(w => isReadyForBatch(w));

            let batchSuccesses = 0;
            if (workReadyForBatch.length > 0) {

                batchSuccesses = await doBatches(this.ns, workReadyForBatch); //+4 gb

            } else {
                singleHack(this.ns, targetWorkInfos[0].target.hostname);
            }
            let PREP_PERCENT = 0.8;
            prepAllTargets(this.ns, targetWorkInfos, PREP_PERCENT);
            await installBackdoors(this.ns);
            //joinFactions(ns, [...Object.values(HACK_FACTIONS), ...Object.values(COMPANY_FACTIONS), ...Object.values(GANG_FACTIONS)]);

            //buyDarkwebTools(ns); +4gb
            displayIncomeStats(this.ns);
            displayNextDarkwebTool(this.ns);
            displayRunnerStatsNoHomeServer(this.ns);

            await this.ns.sleep(this.SLEEP_TIME);
        }

    }

    private runInitialScripts() {
        this.ns.run(SCRIPTS.autoNuke);
        this.ns.run(SCRIPTS.addScripts);
        //this.ns.run('basic-crime.js');
    }

}

