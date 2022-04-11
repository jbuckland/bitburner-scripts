import { COMPANY_FACTIONS, DebugLevel, HACK_FACTIONS } from './consts';
import { NS } from './NetscriptDefinitions';
import { ServerManager } from './server-controller';
import { debugLog, setSettings, timestamp } from './utils';
import {
    bigFactionList,
    buyDarkwebTools,
    claimedEarnedFactionRep,
    displayFactionProgress,
    displayHacknetInfo,
    displayHomeUpgradeInfo,
    displayIncomeStats,
    displayNextAugmentInfo,
    displayNextDarkwebTool,
    displayWorldDaemonProgress,
    doDonationReset,
    findNextAugmentationToWorkToward,
    installBackdoors,
    joinFactions,
    leaveTheCave,
    purchaseAvailableAugmentations,
    upgradeHomeComputer,
    workOnReputation
} from './utils-player';

const SLEEP_TIME = 1000;

const COST_MULTIPLIER_BEFORE_BUYING = 1.5; // how much to multiply the cost of a server before actually buying it

export async function main(ns: NS) {

    ns.disableLog('ALL');
    ns.tail();

    setSettings(ns, {
        ramBuffer: 100
    });

    let serverMgr = new ServerManager(ns);
    serverMgr.costMultiplierBeforeBuying = 1.5;

    while (true) {

        await doPlayerStuff();

        await ns.sleep(SLEEP_TIME);
    }

    ///////////////////////////////////////////////////////
    //Functions
    ///////////////////////////////////////////////////////
    async function doPlayerStuff() {

        buyDarkwebTools(ns);

        await installBackdoors(ns);
        upgradeHomeComputer(ns);
        claimedEarnedFactionRep(ns, true); //should be before purchaseAvailableAugmentations()
        purchaseAvailableAugmentations(ns); //should be before findNextAugmentationToWorkToward()

        let targetAug = findNextAugmentationToWorkToward(ns);
        let workingTowardGang = true;
        if (!workingTowardGang) {

            if (targetAug) {
                let repWithFaction = ns.getFactionRep(targetAug.fromFaction.name);
                if (repWithFaction < targetAug.totalRepCost) {
                    workOnReputation(ns, targetAug.fromFaction);
                }

                await doDonationReset(ns, bigFactionList);

            } else {
                debugLog(ns, DebugLevel.warn, `No target augmentation!`);
            }

        }
        joinFactions(ns, [...Object.values(HACK_FACTIONS), ...Object.values(COMPANY_FACTIONS)]);
        await serverMgr.tryPurchaseServer();

        //destroy the bit node!
        await leaveTheCave(ns);

        ////////////////////////////////
        // Display
        ////////////////////////////////
        ns.clearLog();
        ns.print(`${timestamp()} Player Status:`);
        ns.print('');
        displayIncomeStats(ns);
        displayWorldDaemonProgress(ns);
        displayNextDarkwebTool(ns); //+0.6
        displayNextAugmentInfo(ns, targetAug);
        displayFactionProgress(ns);
        displayHomeUpgradeInfo(ns);
        serverMgr.displayServerStats();
        displayHacknetInfo(ns);

    }

}


