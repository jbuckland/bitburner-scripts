import {NS} from './NetscriptDefinitions';
import {debugLog, setSettings, timestamp} from './utils';
import {
    buyDarkwebTools,
    claimedEarnedFactionRep,
    displayFactionProgress,
    displayHomeUpgradeInfo,
    displayIncomeStats,
    displayNextAugmentInfo,
    displayNextDarkwebTool,
    displayServerStats,
    displayWorldDaemonProgress,
    doDonationReset,
    findNextAugmentationToWorkToward,
    installBackdoors,
    joinFactions,
    leaveTheCave,
    purchaseAvailableAugmentations,
    tryPurchaseServer,
    upgradeHomeComputer,
    workOnReputation
} from './utils-player';
import {COMPANY_FACTIONS, DebugLevel, HACK_FACTIONS} from "./consts";

const SLEEP_TIME = 1000;

const COST_MULTIPLIER_BEFORE_BUYING = 1.5; // how much to multiply the cost of a server before actually buying it

export async function main(ns: NS) {

    ns.disableLog('ALL');
    ns.tail();

    setSettings(ns, {hackPercent: 0.1, ramBuffer: 190});
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
        //ns.stopAction();
        let targetAug = findNextAugmentationToWorkToward(ns);
        if (targetAug) {
            workOnReputation(ns, targetAug.fromFaction);

            //these factions have very high Rep requirements, so we're going to go the donation route
            let bigFactionList = [
                HACK_FACTIONS.daedalus, COMPANY_FACTIONS.nwo, HACK_FACTIONS.bitrunners
            ];
            doDonationReset(ns, bigFactionList);


        } else {
            debugLog(ns, DebugLevel.warn, `No target augmentation!`);
        }

        joinFactions(ns, [...Object.values(HACK_FACTIONS), ...Object.values(COMPANY_FACTIONS)]);
        tryPurchaseServer(ns, COST_MULTIPLIER_BEFORE_BUYING);
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
        displayHomeUpgradeInfo(ns);
        displayNextAugmentInfo(ns, targetAug);
        displayFactionProgress(ns);
        displayServerStats(ns, COST_MULTIPLIER_BEFORE_BUYING);

    }

}


