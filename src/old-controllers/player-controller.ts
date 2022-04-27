import {ServerManager} from '/old-controllers/server-controller';
import {IFaction} from '/types';
import {DebugLevel} from 'lib/consts';
import {debugLog, setSettings, timestamp} from 'lib/utils';
import {
    bigFactionList,
    buyDarkwebTools,
    claimedEarnedFactionRep,
    displayReputationProgress,
    displayHacknetInfo,
    displayHomeUpgradeInfo,
    displayIncomeStats,
    displayNextAugmentInfo,
    displayNextDarkwebTool,
    displayWorldDaemonProgress,
    doInstallReset,
    findNextAugmentationToWorkToward,
    installBackdoors,
    joinFactions,
    leaveTheCave,
    purchaseAvailableAugmentations,
    upgradeHomeComputer,
    workOnReputation
} from 'lib/utils-player';
import {NS} from 'NetscriptDefinitions';

const SLEEP_TIME = 1000;

const COST_MULTIPLIER_BEFORE_BUYING = 1.5; // how much to multiply the cost of a server before actually buying it

let donationResetsCanceled: string[] = [];

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
        await purchaseAvailableAugmentations(ns); //should be before findNextAugmentationToWorkToward()

        let targetAug = findNextAugmentationToWorkToward(ns);
        if (targetAug) {
            workOnReputation(ns, targetAug.fromFaction, targetAug.totalRepCost);

            await doDonationReset(ns, bigFactionList);

        } else {
            debugLog(ns, DebugLevel.warn, `No target augmentation!`);
        }

        joinFactions(ns);
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
        displayReputationProgress(ns);
        displayHomeUpgradeInfo(ns);
        serverMgr.displayServerStats();
        displayHacknetInfo(ns);

    }

}

export async function doDonationReset(ns: NS, factionList: IFaction[]) {
    for (const targetFaction of factionList) {
        if (!donationResetsCanceled.includes(targetFaction.name)) {

            let currFavor = ns.singularity.getFactionFavor(targetFaction.name);
            let factionFavorGain = ns.singularity.getFactionFavorGain(targetFaction.name);

            let favorToDonate = ns.getFavorToDonate();
            let totalFavorAfterReset = currFavor + factionFavorGain;

            //reset at thirds
            if (currFavor < (favorToDonate * .33)) {
                if (totalFavorAfterReset >= (favorToDonate * .33)) {
                    if (await ns.prompt(`${targetFaction.name} now has ${totalFavorAfterReset} favor! Ready to Reset?`)) {
                        debugLog(ns, DebugLevel.info, `Resetting! 33%`);
                        doInstallReset(ns);
                    } else {
                        donationResetsCanceled.push(targetFaction.name);
                    }

                } else {
                    //debugLog(ns, DebugLevel.info, `Don't reset, would not yet be at 33% favor with [${targetFaction.name}]!`);
                }
            } else if (currFavor < (favorToDonate * .66)) {
                if (totalFavorAfterReset >= (favorToDonate * .66)) {
                    if (await ns.prompt(`${targetFaction.name} now has ${totalFavorAfterReset} favor! Ready to Reset?`)) {
                        debugLog(ns, DebugLevel.success, `Resetting! 66%`);
                        doInstallReset(ns);
                    } else {
                        donationResetsCanceled.push(targetFaction.name);
                    }

                } else {
                    //debugLog(ns, DebugLevel.info, `Don't reset, would not yet be at 66% favor with [${targetFaction.name}]!`);
                }
            } else if (currFavor < favorToDonate) {
                if (totalFavorAfterReset >= favorToDonate) {
                    if (await ns.prompt(`${targetFaction.name} now has ${totalFavorAfterReset} favor! Ready to Reset?`)) {
                        debugLog(ns, DebugLevel.success, `Resetting! 100%`);
                        doInstallReset(ns);
                    } else {
                        donationResetsCanceled.push(targetFaction.name);
                    }

                } else {
                    //debugLog(ns, DebugLevel.info, `Don't reset, would not yet be at 100% favor with [${targetFaction.name}]!`);
                }

            } else {
                //No need to reset yet! currFavor: ${currFavor}, stored favor: ${factionFavorGain}, after reset: ${totalFavorAfterReset}

            }
        }
    }

}
