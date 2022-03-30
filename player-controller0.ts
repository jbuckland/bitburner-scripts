import {HOSTS, INDENT_STRING} from './consts';
import {NS} from './NetscriptDefinitions';
import {IRunnerServer} from './types';
import {formatBigRam, round, setSettings, timestamp} from './utils';
import {displayIncomeStats, displayNextDarkwebTool, installBackdoors} from './utils-player';

const SLEEP_TIME = 1000;

export async function main(ns: NS) {
    ns.disableLog('ALL');
    ns.tail();


    setSettings(ns, {hackPercent: 0.001});



    while (true) {
        ns.clearLog();

        ns.print(`${timestamp()}`);
        displayIncomeStats(ns); //5.85 gb, gain of 0.2

        //base of 1.6g;
        await installBackdoors(ns); //5.4gb, gain of 3.8gb
        //displayBackdoorStatus();


        displayNextDarkwebTool(ns);
        displayRunnerStatsNoHomeServer(); //gain of .15
        displayControllerRamUse();



        //displayServerStats(ns); //8.1gb, gain of 2.7

        //displayHomeServerInfo(ns); //gain of 2.6gb
        //tryPurchaseServer(ns, 3); // gain of 6.5gb
        //buyDarkwebTools(ns); //gain of 64.1
        //displayFactionProgress(ns); //gain of 88.3
        //joinFactions(ns, [...Object.values(HACK_FACTIONS), ...Object.values(COMPANY_FACTIONS)]); //gain of 96
        //claimedEarnedFactionRep(ns, true); //gain of 113.6
        //upgradeHomeComputer(ns); //gain of 144gb
        //let targetAug = findNextAugmentationToWorkToward(ns); //gain of 264gb
        //purchaseAvailableAugmentations(ns); //gain of 528.1gb
        //workOnFactionRep(ns, { name: 'sledkjf' }); //gain of 620.1

        await ns.sleep(SLEEP_TIME);

    }



    function displayRunnerStatsNoHomeServer() {
        ns.print('Servers:');

        let runners: IRunnerServer[] = [];

        for (let i = 0; i < HOSTS.length; i++) {
            let host = HOSTS[i];

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

        let totalUsedRam = 0;
        let totalMaxRam = 0;
        let totalFreeRam = 0;
        for (let i = 0; i < runners.length; i++) {
            let runner = runners[i];
            totalUsedRam += runner.usedRam;
            totalMaxRam += runner.maxRam;
            totalFreeRam += runner.maxRam - runner.usedRam;
        }

        let percentUsed = round((totalUsedRam / totalMaxRam) * 100, 2);

        ns.print(`${INDENT_STRING}Runners: ${runners.length}, Ram Usage: ${percentUsed}% of ${formatBigRam(totalMaxRam)}, `);
    }


    function displayControllerRamUse() {

        //getPlayerControllerScript()

        let currentScriptName = ns.getScriptName();
        let currentScriptRam = ns.getScriptRam(currentScriptName);
        let nextScriptName = '';
        let nextScriptRam = 0;


        ns.print('Player Controller Ram Use:');
        ns.print(`${INDENT_STRING} Current: '${currentScriptName}', ${formatBigRam(currentScriptRam)}`);
        ns.print(`${INDENT_STRING} Next: '${nextScriptName}', ${formatBigRam(nextScriptRam)}`);
    }


}

