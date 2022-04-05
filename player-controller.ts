import {NS} from './NetscriptDefinitions';
import {debugLog, timestamp} from './utils';
import {
    buyDarkwebTools,
    claimedEarnedFactionRep,
    displayFactionProgress,
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
import {COMPANY_FACTIONS, DebugLevel, HACK_FACTIONS} from './consts';
import {ServerManager} from './server-controller';
import {IFaction} from './types';

const SLEEP_TIME = 1000;

const COST_MULTIPLIER_BEFORE_BUYING = 1.5; // how much to multiply the cost of a server before actually buying it

//these factions have very high Rep requirements, so we're going to go the donation route
const bigFactionList: IFaction[] = [
    HACK_FACTIONS.daedalus,
    COMPANY_FACTIONS.nwo,
    HACK_FACTIONS.bitrunners,
    HACK_FACTIONS.blackHand
];

export async function main(ns: NS) {

    ns.disableLog('ALL');
    ns.tail();

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
        if (targetAug) {
            workOnReputation(ns, targetAug.fromFaction);

            if (ns.gang.inGang()) {
                let currGang = ns.gang.getGangInformation();
                bigFactionList.push({name: currGang.faction});
            }

            doDonationReset(ns, bigFactionList);

        } else {
            debugLog(ns, DebugLevel.warn, `No target augmentation!`);
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

    }

}


