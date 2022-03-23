import { COMPANY_FACTIONS, HACK_FACTIONS } from './consts';
import { NS } from './NetscriptDefinitions';
import { IFaction } from './types';
import { formatBigNumber, formatBigRam, round, timestamp } from './utils';
import {
    buyDarkwebTools, claimedEarnedFactionRep, findNextAugmentationToWorkToward, getCompany, getCompanyQuitPenalty, installBackdoors, isCompanyFaction,
    ITargetAugmentation, joinFactions, purchaseAvailableAugmentations, tryPurchaseServer, upgradeHomeComputer, workOnFactionRep
} from './utils-player';

const SLEEP_TIME = 1000;

const NONE = 'none!';

export async function main(ns: NS) {

    ns.disableLog('ALL');
    ns.tail();

    while (true) {
        ns.clearLog();

        ns.print(`${timestamp()}`);
        await doPlayerStuff();

        await ns.sleep(SLEEP_TIME);
    }

    ///////////////////////////////////////////////////////
    //Functions
    ///////////////////////////////////////////////////////

    function displayHomeServerInfo() {
        let purchasedServers = ns.getPurchasedServers();
        let limit = ns.getPurchasedServerLimit();
        let totalRam = 0;
        for (let i = 0; i < purchasedServers.length; i++) {
            const server = purchasedServers[i];
            totalRam += ns.getServerMaxRam(server);
        }

        ns.print(`Home Servers: ${purchasedServers.length} of ${limit}. Total Ram: ${formatBigRam(totalRam)}`);

    }

    function displayFactionProgress(faction: IFaction | undefined) {
        let player = ns.getPlayer();
        let repHeader = `Rep. Progress`;

        if (faction) {

            let factionTypeString = '';
            let currRep = 0;
            let remainingRep = 0;
            let gainedRep = player.workRepGained;

            let currFavor = 0;
            let remainingFavor = 0;
            let gainedFavor = 0;
            let penaltyString = '';

            if (isCompanyFaction(faction)) {
                factionTypeString = `Company`;
                currRep = ns.getCompanyRep(faction.name);
                let company = getCompany(ns, faction.name);
                if (company) {
                    remainingRep = company.repNeededForInvite - currRep;
                }

                currFavor = ns.getCompanyFavor(faction.name);
                gainedFavor = ns.getCompanyFavorGain(faction.name);

                let quitPenalty = getCompanyQuitPenalty(ns, faction.name);
                penaltyString = ` (${formatBigNumber(gainedRep * (1 - quitPenalty))} after -${round(quitPenalty * 100)}%)`;

            } else {
                factionTypeString = `Faction`;
                currRep = ns.getFactionRep(faction.name);
                currFavor = ns.getFactionFavor(faction.name);
                gainedFavor = ns.getFactionFavorGain(faction.name);
            }

            //////////////////////
            // Reputation
            //////////////////////

            repHeader = `${factionTypeString} Reputation: [${faction.name}] `;
            let currentRepString = `Current: ${formatBigNumber(currRep)}`;
            let remainingRepString = `Remaining: ${formatBigNumber(remainingRep)}`;

            let gainedRepString = `Gained: ${formatBigNumber(gainedRep)}${penaltyString}`;
            let shareString = `Share: +${round((ns.getSharePower() - 1) * 100)}%`;

            ns.print(`${repHeader} ${currentRepString}, ${remainingRepString}, ${gainedRepString}, ${shareString}`);

            ///////////////
            // Favor
            ///////////////
            let favorHeader = `${factionTypeString} Favor: [${faction.name}] `;

            let currentFavorString = `Current: ${formatBigNumber(currFavor)}`;

            let remainingFavorString = `Remaining: ${formatBigNumber(ns.getFavorToDonate() - currFavor)}`;

            let gainedFavorString = `Gained: ${formatBigNumber(gainedFavor)}`;

            ns.print(`${favorHeader} ${currentFavorString}, ${remainingFavorString}, ${gainedFavorString}`);

        } else {
            ns.print(`${repHeader}: ${NONE}`);
        }

    }

    function displayNextAugmentInfo(targetAug: ITargetAugmentation | undefined) {
        let header = 'Next augment:';

        if (targetAug) {
            ns.print(`${header} '${targetAug.augName}' from '${targetAug.fromFaction.name}'. Need ${formatBigNumber(targetAug.additionalRepNeeded)} additional rep`);
        } else {
            ns.print(`${header} ${NONE}`);
        }

    }

    async function doPlayerStuff() {

        buyDarkwebTools(ns);

        upgradeHomeComputer(ns);

        claimedEarnedFactionRep(ns, true);

        let targetAug = findNextAugmentationToWorkToward(ns);

        displayNextAugmentInfo(targetAug);
        displayFactionProgress(targetAug?.fromFaction);

        if (targetAug) {
            workOnFactionRep(ns, targetAug.fromFaction);
        }

        await installBackdoors(ns);

        joinFactions(ns, [
                ...Object.values(HACK_FACTIONS),
                ...Object.values(COMPANY_FACTIONS)
            ]
        );

        purchaseAvailableAugmentations(ns);

        tryPurchaseServer(ns);
        displayHomeServerInfo();

    }
}


