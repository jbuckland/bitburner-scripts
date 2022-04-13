import { NS, Player } from 'NetscriptDefinitions';
import { ICityFaction, ICompanyFaction, ICompanyJob, IDarkwebTool, IFaction, IRunnerServer } from 'types';
import {
    CITY_FACTIONS,
    COMPANY_FACTIONS,
    COMPANY_QUIT_PENALTY,
    DARK_DATA,
    DebugLevel,
    FACTION_WORK_HACKING,
    GANG_FACTIONS,
    HACK_FACTIONS,
    HOME,
    HOSTS,
    JOB_FIELDS,
    MAX_HOME_SERVER_RAM,
    NEURO_FLUX_GOVERNOR,
    NON_HACKING_AUGMENTS,
    OTHER_FACTIONS,
    SCRIPTS,
    SCRIPTS_OLD_CONTROLLERS,
    THE_RED_PILL,
    TOAST_DURATION,
    TOAST_VARIANT,
    TRAVEL_COST,
    WORK_TYPE,
    WORLD_DAEMON
} from 'lib/consts';
import { GYMS } from 'lib/crime-consts';
import {
    debug,
    debugLog,
    formatBigNumber,
    formatBigRam,
    formatBigTime,
    getAllHosts,
    getDonationNeededForReputation,
    getFirstAvailableRunnerForScript,
    getPlayerTools,
    getUnownedFactionAugmentations,
    hasRedPillInstalled,
    hasRemainingAugmentionsToBuy,
    indent,
    logBase,
    longConnect,
    round
} from 'lib/utils';
import { getGangIncome, getHacknetIncome, getTotalIncome, myGetScriptIncome } from 'lib/utils-crime';

export async function leaveTheCave(ns: NS) {
    let player = ns.getPlayer();
    if (hasRedPillInstalled(ns)) {

        let server = ns.getServer(WORLD_DAEMON.hostname);
        if (server.hasAdminRights && server.requiredHackingSkill < player.hacking) {
            let response = await ns.prompt(`Are you ready to leave the cave???`);
            if (response) {
                longConnect(ns, WORLD_DAEMON.hostname);
                await ns.installBackdoor();
                //ns.exec(SCRIPTS.backdoor, HOME, 1, WORLD_DAEMON.hostname);
            } else {
                //we're just going to ask again on the next pass :)
            }

        }

    }

}

export async function installBackdoors(ns: NS) {

    let player = ns.getPlayer();

    let factionList = [
        HACK_FACTIONS.csec,
        HACK_FACTIONS.nite,
        HACK_FACTIONS.blackHand,
        HACK_FACTIONS.bitrunners,
        COMPANY_FACTIONS.otech,
        COMPANY_FACTIONS.nwo,
        //COMPANY_FACTIONS.mega,
        //COMPANY_FACTIONS.blade,
        //COMPANY_FACTIONS.fultech,
        COMPANY_FACTIONS.clark

    ];

    for (let i = 0; i < factionList.length; i++) {
        const faction = factionList[i];
        if (!player.factions.includes(faction.name)) {
            let server = ns.getServer(faction.hostname);
            if (!server.backdoorInstalled) {
                if (server.hasAdminRights) {
                    if (server.requiredHackingSkill <= player.hacking) {

                        let runner = getFirstAvailableRunnerForScript(ns, SCRIPTS.backdoor);
                        if (runner) {
                            ns.exec(SCRIPTS.backdoor, runner, 1, faction.hostname);
                        } else {
                            debugLog(ns, DebugLevel.error, `No available runner for "${SCRIPTS.backdoor}", targeting [${faction.hostname}] !`);
                        }
                    }
                }
            }
        }
    }

}

export function buyDarkwebTools(ns: NS) {
    let player = ns.getPlayer();

    if (!player.tor && player.money > DARK_DATA.torCost) {
        player.tor = ns.purchaseTor();
        ns.toast(`TOR router purchased!`, TOAST_VARIANT.info, TOAST_DURATION);
    }

    if (player.tor) {
        let playersTools = getPlayerTools(ns);
        if (!playersTools.brute) {
            playersTools.brute = purchaseProgram(ns, player, DARK_DATA.tools.brute);
        }
        if (!playersTools.ftp) {
            playersTools.ftp = purchaseProgram(ns, player, DARK_DATA.tools.ftp);
        }
        if (!playersTools.smtp) {
            playersTools.smtp = purchaseProgram(ns, player, DARK_DATA.tools.smtp);
        }
        if (!playersTools.http) {
            playersTools.http = purchaseProgram(ns, player, DARK_DATA.tools.http);
        }
        if (!playersTools.sql) {
            playersTools.sql = purchaseProgram(ns, player, DARK_DATA.tools.sql);
        }

        //only buy these if we already have sql
        if (playersTools.sql) {
            if (!playersTools.alink) {
                playersTools.alink = purchaseProgram(ns, player, DARK_DATA.tools.alink);
            }
            if (!playersTools.scan1) {
                playersTools.scan1 = purchaseProgram(ns, player, DARK_DATA.tools.scan1);
            }
            if (!playersTools.scan2) {
                playersTools.scan2 = purchaseProgram(ns, player, DARK_DATA.tools.scan2);
            }
            if (!playersTools.prof) {
                playersTools.prof = purchaseProgram(ns, player, DARK_DATA.tools.prof);
            }

        }

    }

}

export function purchaseProgram(ns: NS, player: Player, program: IDarkwebTool): boolean {
    let success = false;
    if (player.money > program.cost) {
        success = ns.purchaseProgram(program.name);
        if (success) {
            ns.toast(`Purchased ${program.name} !`, TOAST_VARIANT.info, TOAST_DURATION);
            let nukeResults = ns.exec(SCRIPTS.autoNuke, HOME, 1, 'tail');
            if (nukeResults === 0) {
                ns.toast(`${SCRIPTS.autoNuke} did not run after purchase of ${program.name}!!`, 'error' as TOAST_VARIANT);
            }
        }

    }
    return success;
}

export function upgradeHomeComputer(ns: NS) {
    let player = ns.getPlayer();
    if (player.money > ns.getUpgradeHomeRamCost()) {
        let success = ns.upgradeHomeRam();
        if (success) {
            let server = ns.getServer(HOME);
            ns.toast(`Home Computer RAM upgraded to ${formatBigRam(server.maxRam)}!!`, TOAST_VARIANT.info, TOAST_DURATION);
        }
    } else if (player.money > ns.getUpgradeHomeCoresCost()) {
        let success = ns.upgradeHomeCores();
        if (success) {
            let server = ns.getServer(HOME);
            ns.toast(`Home Computer Cores upgraded to ${server.cpuCores}!!`, TOAST_VARIANT.info, TOAST_DURATION);
        }
    }
}

export function workOnReputation(ns: NS, targetFaction: IFaction) {

    let player = ns.getPlayer();

    if (isCityFaction(targetFaction.name)) {
        workOnCityReputation(targetFaction);
    } else if (isCompanyFaction(targetFaction.name)) {
        workOnCompanyReputation(targetFaction);
    } else {
        workOnFactionReputation(targetFaction);
    }

    //////////////////////////
    function workOnCityReputation(targetFaction: IFaction) {
        let cityFaction = targetFaction as ICityFaction;
        let currFactions = player.factions;

        if (currFactions.includes(cityFaction.name)) {
            if (!ns.isBusy()) {
                myWorkForFaction(ns, targetFaction.name, false);
            }
        } else {
            if (player.city !== cityFaction.homeCity && player.money > TRAVEL_COST) {
                ns.travelToCity(cityFaction.homeCity);
            }

            if (ns.joinFaction(cityFaction.name)) {
                ns.toast(`Joined ${cityFaction.name}!`, TOAST_VARIANT.info, TOAST_DURATION);
            }

        }
    }

    function workOnCompanyReputation(targetFaction: IFaction) {

        let compFaction = targetFaction as ICompanyFaction;

        if (!player.factions.includes(compFaction.name)) {

            //we need to build our rep with this company before we get an invite
            let fieldName = JOB_FIELDS.Software;

            if (!ns.isBusy() || player.currentWorkFactionName === targetFaction.name) {
                //Note: if we already have this job, we'll be trying for a promotion
                let success = ns.applyToCompany(compFaction.name, fieldName);
                if (success) {
                    ns.toast(`Got a ${fieldName} job with ${compFaction.name}!!`);
                }
            }

            if (ns.isBusy()) {

                //check if we're already working for the company
                //and we have enough gained rep to get an invite
                if (player.workType === WORK_TYPE.Company && player.companyName === compFaction?.name) {
                    let repGain = getCompanyRepGainedAfterPenalty(ns, compFaction.name);
                    if (repGain + ns.getCompanyRep(compFaction.name) >= compFaction.repNeededForInvite) {
                        ns.stopAction();
                        ns.toast(`Got enough company rep with ${compFaction.name}!`, TOAST_VARIANT.success, TOAST_DURATION);
                    }

                }

            } else {

                let myJobs = getPlayerJobs(ns);
                let factionJob = myJobs.find(j => j.copmpanyName === compFaction.name);
                if (factionJob) {
                    debugLog(ns, DebugLevel.info, `trying to work at ${factionJob?.jobName} job, for ${factionJob?.copmpanyName} `);
                    ns.workForCompany(factionJob?.copmpanyName);
                }
            }

        } else {
            if (!ns.isBusy()) {
                myWorkForFaction(ns, targetFaction.name, false);
            }
        }
    }

    function workOnFactionReputation(targetFaction: IFaction) {
        if (!ns.isBusy()) {
            myWorkForFaction(ns, targetFaction.name, false);
        }
    }

}

export function claimedEarnedFactionRep(ns: NS, restart: boolean = false) {

    let player = ns.getPlayer();
    let REP_CASHOUT_TIME = 100; //in seconds
    let factionRepAmount = REP_CASHOUT_TIME * getReputationGainRate(ns);

    debug(
        ns,
        `isWorking:${player.isWorking}, currentWorkFactionName:${player.currentWorkFactionName}, companyName:${player.companyName}, workType:${player.workType}`
    );

    if (player.isWorking) {
        if (player.workType === WORK_TYPE.Faction) {
            if (player.workRepGained >= factionRepAmount) {

                let isFocused = ns.isFocused();
                let currWorkType = player.currentWorkFactionDescription;
                let currWorkFaction = player.currentWorkFactionName;

                let msg = `Cashing in ${formatBigNumber(player.workRepGained)} gained reputation for '${currWorkFaction}', doing '${currWorkType}'`;
                debugLog(ns, DebugLevel.info, msg);
                ns.toast(msg, TOAST_VARIANT.info, TOAST_DURATION);
                ns.stopAction();

                if (restart) {

                    if (ns.isBusy()) {
                        debugLog(ns, DebugLevel.error, `Was still busy when trying to restart myWorkForFaction()`);
                    }
                    let success = myWorkForFaction(ns, currWorkFaction, isFocused);

                    if (success) {
                        debugLog(ns, DebugLevel.info, 'Work resumed!');
                    } else {
                        debugLog(ns, DebugLevel.error, 'Unable to restart working!');
                    }
                } else {
                    debugLog(ns, DebugLevel.warn, 'Did not restart working');
                }

            }
        } else if (player.workType === WORK_TYPE.Company) {
            //since this is a company faction, we'll only get 1/2 or 3/4 of our gained rep if we reset

            let currWorkCompany = player.companyName;

            let companies = Object.values(COMPANY_FACTIONS) as ICompanyFaction[];
            let company = companies.find(c => c.name === currWorkCompany);

            if (company) {

                //let companyServer = ns.getServer(company.hostname);

                let quitPenalty = getCompanyQuitPenalty(ns, company.hostname);

                //if we're working for a company, that means we're trying to get an invite into it's faction
                let targetRep = company.repNeededForInvite / (1 - quitPenalty);

                if (player.workRepGained >= targetRep) {
                    let isFocused = ns.isFocused();
                    let msg = `Cashing in ${formatBigNumber(player.workRepGained)} gained reputation for ${company.name}`;
                    ns.toast(msg, TOAST_VARIANT.info, TOAST_DURATION);
                    debugLog(ns, DebugLevel.info, msg);
                    ns.stopAction();

                    if (restart) {
                        let success = ns.workForCompany(company.name, isFocused);

                        if (success) {
                            debugLog(ns, DebugLevel.info, 'Work resumed!');
                        } else {
                            debugLog(ns, DebugLevel.error, 'Unable to restart working!');
                        }

                    } else {
                        debugLog(ns, DebugLevel.warn, 'Did not restart working');
                    }
                }

            } else {
                debug(ns, `ERROR! couldn't find company ${currWorkCompany}!`);
            }

        }
    }

}

export interface ITargetAugmentation {
    additionalRepNeeded: number;
    augName: string;
    fromFaction: IFaction,
    moneyCost: number
    totalRepCost: number;
}

export async function trainStat(ns: NS, playerStatName: keyof Player, gymStatName: string) {
    let trainingWaitTime = 1000;
    ns.print(`training ${playerStatName}!`);
    ns.gymWorkout(GYMS.powerhouse, gymStatName, true);
    await ns.sleep(trainingWaitTime);

}

export function findNextAugmentationToWorkToward(ns: NS): ITargetAugmentation | undefined {

    let player = ns.getPlayer();

    //based on the Rep we have right now,
    // which faction has the augmentation that requires the least additional reputation?

    let allFactions: IFaction[] = [
        ...Object.values(CITY_FACTIONS),
        ...Object.values(HACK_FACTIONS),
        ...Object.values(COMPANY_FACTIONS),
        ...Object.values(GANG_FACTIONS)

    ];

    allFactions = filterUnavailableCityFactions(ns, allFactions);

    if (player.factions.includes(OTHER_FACTIONS.netburner.name)) {
        allFactions.push(OTHER_FACTIONS.netburner);
    }

    //if we have a Gang, remove it's faction because we can't 'work' for them directly
    if (ns.gang.inGang()) {
        let gangFaction = ns.gang.getGangInformation().faction;
        allFactions = allFactions.filter(f => f.name !== gangFaction);
    }

    debug(ns, `Factions to check`, allFactions);

    let lowestAdditionsRepCostAdjusted = Number.MAX_VALUE;
    let lowestAdditionalRepCost = Number.MAX_VALUE;

    //TODO
    //we want to find the FACTION that we want to target first
    //then find the next augment in that faction

    let targetAug: ITargetAugmentation | undefined;

    let repMult = player.faction_rep_mult;

    for (let i = 0; i < allFactions.length; i++) {
        let faction = allFactions[i];
        let factionFavorMult = 1 + (ns.getFactionFavor(faction.name) / 100.0);

        let totalRepMult = factionFavorMult * repMult;

        debug(ns, `${faction.name}: factionFavorMult:${factionFavorMult.toPrecision(4)}, faction_rep_mult:${repMult.toPrecision(4)}, totalRepMult:${
            totalRepMult.toPrecision(4)}`);

        let neededAugments = getUnownedFactionAugmentations(ns, faction.name);

        //filter out non hacking augments
        neededAugments = neededAugments.filter(a => {
            return !NON_HACKING_AUGMENTS.find(nha => nha === a);
        });

        debug(ns, `Needed augments from ${faction.name}:`, neededAugments);

        if (neededAugments.length > 0) {
            for (let i1 = 0; i1 < neededAugments.length; i1++) {
                const a = neededAugments[i1];
                let rawRepCost = ns.getAugmentationRepReq(a);
                let currRep = ns.getFactionRep(faction.name);
                let moneyCost = ns.getAugmentationPrice(a);

                let additionalRepCost = rawRepCost - currRep;
                let adjustedRepCost = additionalRepCost / totalRepMult;

                if (isCompanyFaction(faction.name)) {
                    let company = getCompany(ns, faction.name);
                    if (company) {
                        //we need to take into consideration how long it would take to join the company
                        let compRep = ns.getCompanyRep(faction.name);
                        let additionalCompanyRep = company?.repNeededForInvite - compRep;

                        let companyFavorMult = 1 + (ns.getCompanyFavor(faction.name) / 100.0);
                        let repMult = player.company_rep_mult;

                        let totalCompanyMult = companyFavorMult * repMult;
                        additionalCompanyRep /= totalCompanyMult;

                        adjustedRepCost += additionalCompanyRep;
                    }

                }

                //if we already have the rep for a desired aug, we'll just buy it when we have the money
                if (adjustedRepCost < lowestAdditionsRepCostAdjusted && adjustedRepCost > 0) {

                    lowestAdditionsRepCostAdjusted = adjustedRepCost;

                    targetAug = {
                        augName: a,
                        fromFaction: faction,
                        additionalRepNeeded: additionalRepCost,
                        totalRepCost: rawRepCost,
                        moneyCost: moneyCost
                    };
                    lowestAdditionalRepCost = additionalRepCost;
                }
            }
        }
    }

    return targetAug;
}

export function filterUnavailableCityFactions(ns: NS, allFactions: IFaction[]): IFaction[] {

    let currFactions = ns.getPlayer().factions;

    //remove factions from the list that we can't join

    //Sector-12 != Chongqing, New Tokyo, Ishima, Volhaven
    //Aevum != Chongqing, New Tokyo, Ishima, Volhaven
    if (currFactions.includes(CITY_FACTIONS.sec12.name) || currFactions.includes(CITY_FACTIONS.aevum.name)) {
        allFactions = allFactions.filter(f =>
            f.name != CITY_FACTIONS.tian.name &&
            f.name != CITY_FACTIONS.tokyo.name &&
            f.name != CITY_FACTIONS.ishi.name &&
            f.name != CITY_FACTIONS.vol.name
        );
    }

    //Chongqing != Sector-12, Aevum, Volhaven
    //New Tokyo != Sector-12, Aevum, Volhaven
    //Ishima != Sector-12, Aevum, Volhaven
    if (currFactions.includes(CITY_FACTIONS.tian.name) ||
        currFactions.includes(CITY_FACTIONS.tokyo.name) ||
        currFactions.includes(CITY_FACTIONS.ishi.name)
    ) {
        allFactions = allFactions.filter(f =>
            f.name != CITY_FACTIONS.sec12.name &&
            f.name != CITY_FACTIONS.aevum.name &&
            f.name != CITY_FACTIONS.vol.name
        );
    }

    //Volhaven != Sector-12, Aevum, Chongqing, New Tokyo, Ishima
    if (currFactions.includes(CITY_FACTIONS.vol.name)) {
        allFactions = allFactions.filter(f =>
            f.name != CITY_FACTIONS.sec12.name &&
            f.name != CITY_FACTIONS.aevum.name &&
            f.name != CITY_FACTIONS.tian.name &&
            f.name != CITY_FACTIONS.tokyo.name &&
            f.name != CITY_FACTIONS.ishi.name
        );
    }

    return allFactions;

}

export function getAugmentFactionCostInfo(ns: NS, augmentName: string, factionName: string) {
    let player = ns.getPlayer();
    let baseRepCost = ns.getAugmentationRepReq(augmentName);
    let currRep = ns.getFactionRep(factionName);
    let price = ns.getAugmentationPrice(augmentName);

    let baseAdditionalRepCost = baseRepCost - currRep;
    let factionFavorRepMult = 1 + (ns.getFactionFavor(factionName) / 100.0);
    let repMult = player.faction_rep_mult;
    let totalRepMult = factionFavorRepMult * repMult;
    let adjustedAdditionalRepCost = baseAdditionalRepCost / totalRepMult;

    if (isCompanyFaction(factionName)) {
        let company = getCompany(ns, factionName);
        if (company) {
            //we need to take into consideration how long it would take to join the company
            let compRep = ns.getCompanyRep(factionName);
            let additionalCompanyRep = company?.repNeededForInvite - compRep;

            let companyFavorMult = 1 + (ns.getCompanyFavor(factionName) / 100.0);
            let repMult = player.company_rep_mult;

            let totalCompanyMult = companyFavorMult * repMult;
            additionalCompanyRep /= totalCompanyMult;

            adjustedAdditionalRepCost += additionalCompanyRep;
        }

    }

    return {
        name: augmentName,
        fromFaction: factionName,
        price,
        baseRepCost,
        baseAdditionalRepCost,
        totalRepMult,
        adjustedAdditionalRepCost
    };

}

export function myWorkForFaction(ns: NS, factionName: string, focus: boolean): boolean {
    let player = ns.getPlayer();
    let success = false;

    let workType = FACTION_WORK_HACKING;

    if (player.factions.includes(factionName)) {

        //do they still have augments I need?
        let remainingFactionAugments = getUnownedFactionAugmentations(ns, factionName);
        let totalCount = remainingFactionAugments.length;
        //filter out non hacking augments
        remainingFactionAugments = remainingFactionAugments.filter(a => {
            return !NON_HACKING_AUGMENTS.includes(a);
        });
        let wantedCount = remainingFactionAugments.length;
        let unwantedCount = totalCount - wantedCount;

        if (remainingFactionAugments.length > 0) {
            //ns.print(`${factionName} still has ${wantedCount} augments I need! (and ${unwantedCount} I don't want)`);
            ns.enableLog('ALL');
            success = ns.workForFaction(factionName, workType, focus);
            ns.disableLog('ALL');
            if (success) {
                ns.toast(`Working for '${factionName}' doing '${workType}'`, TOAST_VARIANT.info, TOAST_DURATION);
            } else {
                debugLog(ns, DebugLevel.error, `Failed to work for '${factionName}' doing '${workType}'`);
                //ns.exit()
            }
        }

    }

    return success;
}

export function joinFactions(ns: NS) {
    let invites = ns.checkFactionInvitations();
    //join everyone EXCEPT city factions, because they exclude other factions.
    let cityFactions = Object.values(CITY_FACTIONS).map(f => f.name);

    invites.forEach(factionName => {
        if (!cityFactions.includes(factionName)) {
            ns.joinFaction(factionName);
            ns.toast(`Joined ${factionName}!`, TOAST_VARIANT.info, TOAST_DURATION);
        }
    });

}

export function purchaseAvailableAugmentations(ns: NS) {
    let player = ns.getPlayer();
    for (let i = 0; i < player.factions.length; i++) {
        let faction = player.factions[i];

        let currRepWithFaction = ns.getFactionRep(faction);
        let remainingAugs = getUnownedFactionAugmentations(ns, faction);

        //filter out non hacking augments
        remainingAugs = remainingAugs.filter(a => {
            return !NON_HACKING_AUGMENTS.includes(a);
        });

        for (let j = 0; j < remainingAugs.length; j++) {
            let augName = remainingAugs[j];

            let price = ns.getAugmentationPrice(augName);
            let repReq = ns.getAugmentationRepReq(augName);

            //we have the money to buy it
            if (player.money >= price) {

                if (repReq <= currRepWithFaction) {
                    let success = ns.purchaseAugmentation(faction, augName);
                    if (success) {
                        ns.toast(`'${augName}' purchased from ${faction}!`, TOAST_VARIANT.success, TOAST_DURATION);
                    }

                    if (augName === THE_RED_PILL) {
                        doInstallReset(ns);
                    }

                } else {
                    // it requires too much reputation
                    //donations
                    let neededFavor = ns.getFavorToDonate();
                    let currFavor = ns.getFactionFavor(faction);

                    if (currFavor >= neededFavor) {

                        let additionalRepNeeded = repReq - currRepWithFaction;

                        let donationAmountNeeded = getDonationNeededForReputation(ns, additionalRepNeeded);

                        if (player.money >= price + donationAmountNeeded) {
                            ns.donateToFaction(faction, donationAmountNeeded);
                        }
                    }

                }
            }

        }

        //if we've purchased the last augmentation we need, and we're working for this faction, stop
        remainingAugs = getUnownedFactionAugmentations(ns, faction);
        if (remainingAugs.length === 0 && player.isWorking && player.currentWorkFactionName === faction) {

            ns.toast(`Purchased the last augmentation from ${faction}!`, TOAST_VARIANT.info, TOAST_DURATION);
            if (hasRemainingAugmentionsToBuy(ns)) {
                ns.stopAction();
            }

        }

    }
}

/**
 *
 * @param ns
 * @param costMultiplierBeforeBuying how much to multiply the cost of a server before actually buy it
 */
export function tryPurchaseServer(ns: NS, costMultiplierBeforeBuying: number) {

    let myServers = ns.getPurchasedServers();

    //finally
    let nextRamSize = getNextHomeServerSize(ns);
    let serverCost = ns.getPurchasedServerCost(nextRamSize);
    let playerHasEnoughMoney = ns.getPlayer().money >= (serverCost * costMultiplierBeforeBuying);

    let serverLimit = ns.getPurchasedServerLimit();
    let serverCount = myServers.length;
    let homeServersFull = serverCount >= serverLimit;

    let homeServers = getHomeServers(ns);
    let aServerNeedsUpgraded = false;
    let smallestServer: HomeServer | undefined;
    if (homeServers.length > 0) {

        homeServers.sort((a, b) => a.maxRam - b.maxRam);
        smallestServer = homeServers[0];
        aServerNeedsUpgraded = smallestServer && smallestServer.maxRam < MAX_HOME_SERVER_RAM;
    }

    debug(ns, 'tryPurchaseServer()', { nextRamSize, serverCost, playerHasEnoughMoney, homeServersFull, smallestServer });
    if (playerHasEnoughMoney) {
        if (homeServersFull && smallestServer && aServerNeedsUpgraded) {
            //delete
            ns.toast(`Removed home server ${smallestServer.hostname} (${formatBigRam(smallestServer.maxRam)})`, TOAST_VARIANT.info, TOAST_DURATION);
            ns.killall(smallestServer.hostname);
            ns.deleteServer(smallestServer.hostname);
        }

        if (!homeServersFull || (smallestServer && aServerNeedsUpgraded)) {
            //buy
            let newHostName = ns.purchaseServer(HOME, nextRamSize);
            ns.run(SCRIPTS.addScripts); //get the scripts on the new server
            ns.toast(`Purchased home server ${newHostName} (${formatBigRam(nextRamSize)})`, TOAST_VARIANT.info, TOAST_DURATION);
        }
    }

}

export interface HomeServer {
    hostname: string,
    maxRam: number
}

export function getHomeServers(ns: NS): HomeServer[] {
    let homeServersNames: string[] = ns.getPurchasedServers();
    let homeServers: HomeServer[] = [];

    for (let i = 0; i < homeServersNames.length; i++) {
        const serverName = homeServersNames[i];
        const serverRam = ns.getServerMaxRam(serverName);

        homeServers.push({ hostname: serverName, maxRam: serverRam });
    }

    return homeServers;
}

export function getNextHomeServerSize(ns: NS): number {
    const MIN_RAM = Math.pow(2, 7);
    const MAX_RAM = Math.pow(2, 20);
    let nextRamSize = MIN_RAM;

    let homeServers: { hostname: string, maxRam: number; }[] = getHomeServers(ns);

    if (homeServers.length > 0) {
        //if we do have some home servers,
        //find the biggest
        homeServers.sort((a, b) => {
            return a.maxRam - b.maxRam;
        });
        let biggestServer = homeServers[homeServers.length - 1];
        nextRamSize = biggestServer.maxRam * 2;
    }

    //don't go over max
    nextRamSize = Math.min(nextRamSize, MAX_RAM);

    //don't buy anything smaller than the current home
    let homeMaxRam = ns.getServerMaxRam(HOME);
    nextRamSize = Math.max(nextRamSize, homeMaxRam);

    return nextRamSize;
}

export function isCompanyFaction(factionName: string) {
    return Object.values(COMPANY_FACTIONS).map(f => f.name).includes(factionName);
}

export function isCityFaction(factionName: string) {
    return Object.values(CITY_FACTIONS).map(f => f.name).includes(factionName);
}

export function getPlayerJobs(ns: NS): ICompanyJob[] {
    let compJobs: ICompanyJob[] = [];

    let jobsObject: { [key: string]: string } = ns.getPlayer().jobs;
    debug(ns, `jobObjects:`, jobsObject);

    for (let i = 0; i < Object.keys(jobsObject).length; i++) {
        const compName = Object.keys(jobsObject)[i];

        compJobs.push({
            copmpanyName: compName,
            jobName: jobsObject[compName]
        });

    }

    return compJobs;

}

export function getCompany(ns: NS, companyName: string): ICompanyFaction | undefined {
    let companies = Object.values(COMPANY_FACTIONS) as ICompanyFaction[];
    let company = companies.find(c => c.name === companyName);
    return company;
}

export function isWorkingForCompany(ns: NS, companyName: string): boolean {
    let player = ns.getPlayer();
    return player.workType === WORK_TYPE.Company && player.companyName === companyName;
}

export function getCompanyRepGainedAfterPenalty(ns: NS, companyName: string) {
    let repGain = 0;

    let player = ns.getPlayer();

    if (isWorkingForCompany(ns, companyName)) {

        let quitPenalty = getCompanyQuitPenalty(ns, companyName);

        repGain = player.workRepGained * (1 - quitPenalty);
    }
    return repGain;
}

export function getCompanyQuitPenalty(ns: NS, companyName: string) {
    let penalty = COMPANY_QUIT_PENALTY.default;

    let company = getCompany(ns, companyName);
    if (company) {
        let compServer = ns.getServer(company?.hostname);

        if (compServer && compServer.backdoorInstalled) {
            penalty = COMPANY_QUIT_PENALTY.withBackdoor;
        }
    }

    return penalty;

}

export function getMaxHackingNeededForBitNode(ns: NS) {
    return ns.getServerRequiredHackingLevel(WORLD_DAEMON.hostname);
}

export function displayServerStats(ns: NS, costMultiplierBeforeBuying: number) {
    ns.print('Server Stats:');
    displayRunnerStats(ns);
    displayHomeServerInfo(ns, costMultiplierBeforeBuying);
    ns.print('');
}

export function displayHomeServerInfo(ns: NS, costMultiplierBeforeBuying: number) {
    let purchasedServers = ns.getPurchasedServers();
    let limit = ns.getPurchasedServerLimit();
    let totalRam = 0;

    let allServersMaxed = purchasedServers.length > 0;
    for (let i = 0; i < purchasedServers.length; i++) {
        const server = purchasedServers[i];
        let ram = ns.getServerMaxRam(server);
        totalRam += ram;
        if (ram < MAX_HOME_SERVER_RAM) {
            allServersMaxed = false;
        }
    }

    let nextSize = getNextHomeServerSize(ns);
    let nextCost = ns.getPurchasedServerCost(nextSize);

    let nextCostString = '';
    if (allServersMaxed) {
        nextCostString = ', All maxed!!';
    } else {
        nextCostString = `, \$${formatBigNumber(nextCost)}x${costMultiplierBeforeBuying} = \$${formatBigNumber(nextCost * costMultiplierBeforeBuying)} for next`;
    }

    ns.print(`${indent()}Home: ${purchasedServers.length} of ${limit}${nextCostString}`);

}

export function displayRunnerStats(ns: NS) {
    let runners: IRunnerServer[] = [];

    for (let i = 0; i < getAllHosts(ns).length; i++) {
        let host = getAllHosts(ns)[i];

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

    ns.print(`${indent()}Runners: ${runners.length}, Ram Usage: ${percentUsed}% of ${formatBigRam(totalMaxRam)}, `);

}

export function displayFactionProgress(ns: NS) {

    let player = ns.getPlayer();

    //show who I AM working for, not who I should be
    let factionWorkingFor: string | undefined;

    if (player.currentWorkFactionName) {
        factionWorkingFor = player.currentWorkFactionName;
    } else if (player.companyName) {
        factionWorkingFor = player.companyName;
    }

    if (factionWorkingFor) {

        let factionTypeString = '';
        let currRep = 0;
        let remainingRep = 0;
        let gainedRep = player.workRepGained;

        let currFavor = 0;
        let remainingFavor = 0;
        let gainedFavor = 0;
        let penaltyString = '';

        if (player.currentWorkFactionName) {
            factionTypeString = `Faction`;
            currRep = ns.getFactionRep(factionWorkingFor);
            currFavor = ns.getFactionFavor(factionWorkingFor);
            gainedFavor = ns.getFactionFavorGain(factionWorkingFor);
        } else if (isCompanyFaction(factionWorkingFor)) {
            factionTypeString = `Company`;
            currRep = ns.getCompanyRep(factionWorkingFor);
            let company = getCompany(ns, factionWorkingFor);
            if (company) {
                remainingRep = company.repNeededForInvite - currRep;
            }

            currFavor = ns.getCompanyFavor(factionWorkingFor);
            gainedFavor = ns.getCompanyFavorGain(factionWorkingFor);

            let quitPenalty = getCompanyQuitPenalty(ns, factionWorkingFor);
            penaltyString = ` (${formatBigNumber(gainedRep * (1 - quitPenalty))} after -${round(quitPenalty * 100)}%)`;

        } else {

        }

        //////////////////////
        // Header
        //////////////////////
        ns.print(`Faction Progress:`);
        ns.print(`${indent()}Current ${factionTypeString}: [${factionWorkingFor}]`);

        //////////////////////
        // Reputation
        //////////////////////
        let repHeader = `${indent()}Reputation:`;
        let currentRepString = `Current: ${formatBigNumber(currRep)}`;
        let remainingRepString = `Remaining: ${formatBigNumber(remainingRep)}`;

        let gainedRepString = `Gained: ${formatBigNumber(gainedRep)}${penaltyString}`;

        ns.print(`${repHeader} ${currentRepString}, ${gainedRepString}`);

        ///////////////
        // Favor
        ///////////////
        let favorHeader = `${indent()}Favor:`;

        let currentFavorString = `Current: ${formatBigNumber(currFavor)}`;

        let remainingFavorString = '';
        if (ns.getFavorToDonate() - currFavor > 0) {
            remainingFavorString = `Remaining: ${formatBigNumber(ns.getFavorToDonate() - currFavor)}, `;
        }

        let gainedFavorString = `Gained: ${formatBigNumber(gainedFavor)}`;
        ns.print(`${favorHeader} ${currentFavorString}, ${remainingFavorString}${gainedFavorString}`);

        let bigFaction = bigFactionList.find(f => f.name === factionWorkingFor);
        if (bigFaction) {
            //show ETA to next big faction reset

            let nextResetAmount = 0;
            let favorToDonate = ns.getFavorToDonate();
            if (currFavor + gainedFavor < favorToDonate * .333) {
                nextResetAmount = favorToDonate * .333;
            } else if (currFavor + gainedFavor < favorToDonate * .666) {
                nextResetAmount = favorToDonate * .666;
            } else {
                nextResetAmount = favorToDonate;
            }

            let remainingFavorUntilReset = nextResetAmount - currFavor - gainedFavor;

            let totalFactionRep = 0;
            let repNeededForReset = 0;

            let currentRep = 0;

            ns.print(`${indent(2)}+${round(remainingFavorUntilReset, 1)} favor until reset!`);

            //calculate how much more rep needed to get to that
            //how much total rep is needed to get to the reset point?
            let totalFavor = 1 + (logBase(1.02, (currentRep + 25000) / 25500));

            // ns.faction

            //how much rep do we have now based on favor?

        }

        let shareString = `${indent()}Share Bonus: +${round((ns.getSharePower() - 1) * 100)}%`;
        ns.print(`${shareString}`);
        ns.print('');
    } else {
        //ns.print(`${repHeader}: none!`);
    }

}

//these factions have very high Rep requirements, so we're going to go the donation route
export const bigFactionList: IFaction[] = [
    HACK_FACTIONS.daedalus,
    COMPANY_FACTIONS.nwo,
    HACK_FACTIONS.bitrunners,
    HACK_FACTIONS.blackHand
];

export function displayNextAugmentInfo(ns: NS, targetAug: ITargetAugmentation | undefined) {

    let header = 'Next augment:';
    let body = 'none!';

    if (targetAug) {

        //if we can donate to this faction
        //show how much money we'd need
        let favorToDonate = ns.getFavorToDonate();
        let currFavor = ns.getFactionFavor(targetAug?.fromFaction.name);
        let donateString = '';

        let additionalRepNeeded = Math.max(0, targetAug.additionalRepNeeded);

        let moneyCostTimeString = makeMoneyCostTimeString(ns, targetAug.moneyCost);
        let repCostTimeString = makeRepCostTimeString(ns, targetAug.totalRepCost, additionalRepNeeded);

        ns.print(header);
        ns.print(`${indent()}'${targetAug.augName}' from [${targetAug.fromFaction.name}]`);
        ns.print(`${indent()}Money Needed: ${moneyCostTimeString}`);
        ns.print(`${indent()}Rep. Needed: ${repCostTimeString}`);

        if (currFavor >= favorToDonate) {
            let donationNeeded = getDonationNeededForReputation(ns, targetAug.additionalRepNeeded);
            //donateString = `, or \$${formatBigNumber(donationNeeded)} donation`;
            let donationTimeString = makeMoneyCostTimeString(ns, donationNeeded);
            ns.print(` ${indent()}Or donation: ${donationTimeString}`);
        }

    } else {
        ns.print(`${header} ${body}`);
    }

    ns.print('');
}

export function displayIncomeStats(ns: NS) {

    let exp = ns.getScriptExpGain();
    let expIncome = formatBigNumber(exp);
    let repIncome = formatBigNumber(getReputationGainRate(ns));

    let scriptMoneyIncome = myGetScriptIncome(ns);
    let hacknetMoneyIncome = getHacknetIncome(ns);
    let gangMoneyIncome = getGangIncome(ns);

    let totalMoneyIncome = scriptMoneyIncome + gangMoneyIncome + hacknetMoneyIncome;

    /*
    let incomeTable = new Table(ns);
    let tableData: ITableData[] = [
        { '$/s': moneyIncome, 'xp/s': expIncome, 'rep/s': repIncome }

    ];
    incomeTable.setData([
        { '$$/s': moneyIncome, 'Exp/s': expIncome, 'Rep/s': repIncome }
    ]);
    incomeTable.print();
    */
    let padding = 8;

    ns.print(`Income: \$${formatBigNumber(totalMoneyIncome, 2)}/s, ${expIncome} xp/s, ${repIncome} rep/s`);

    let hackMoneyString = `\$${formatBigNumber(scriptMoneyIncome, 2)}`;
    ns.print(`${indent()}Hacking: ${hackMoneyString.padStart(padding)}/s`);

    if (ns.gang.inGang()) {
        let gangMoneyString = `\$${formatBigNumber(gangMoneyIncome, 2)}`;
        ns.print(`${indent()}Gang:    ${gangMoneyString.padStart(padding)}/s`);
    }

    if (ns.hacknet.numNodes() > 0) {
        let hnMoneyString = `\$${formatBigNumber(hacknetMoneyIncome, 2)}`;
        ns.print(`${indent()}Hacknet: ${hnMoneyString.padStart(padding)}/s`);
    }
    ns.print('');

}

export function displayNextDarkwebTool(ns: NS) {
    let player = ns.getPlayer();
    let playerTools = getPlayerTools(ns);
    let nextTool: IDarkwebTool | undefined;

    if (!playerTools.brute) {
        nextTool = DARK_DATA.tools.brute;
    } else if (!playerTools.ftp) {
        nextTool = DARK_DATA.tools.ftp;
    } else if (!playerTools.smtp) {
        nextTool = DARK_DATA.tools.smtp;

    } else if (!playerTools.http) {
        nextTool = DARK_DATA.tools.http;

    } else if (!playerTools.sql) {
        nextTool = DARK_DATA.tools.sql;
    }

    if (nextTool) {
        if (player.money >= nextTool.cost) {
            ns.print(`INFO You have enough to buy ${nextTool.name}!`);
        }

        let incomePerSec = ns.getScriptIncome()[0];
        let remainingCost = nextTool.cost - player.money;

        let etaTime = new Date();
        let estTimeLeft = (remainingCost / incomePerSec) * 1000;
        etaTime.setTime(new Date().getTime() + estTimeLeft);
        let etaString = etaTime.toLocaleString('en-US', { hour: 'numeric', minute: 'numeric', second: 'numeric' });

        ns.print(`Next Darkweb tool: '${nextTool.name}'`);
        ns.print(`${indent()}Cost: \$${formatBigNumber(nextTool.cost)}, +\$${formatBigNumber(remainingCost)}`);
        ns.print(`${indent()}Time left: ${formatBigTime(estTimeLeft).padStart(6)}, ETA: ${etaString}`);

        if (!player.tor && player.money >= DARK_DATA.torCost) {
            ns.print(`INFO You have enough to buy the TOR router!`);
        }

        if (!playerTools.sql && player.money >= DARK_DATA.tools.sql.cost) {
            ns.print(`INFO You have enough to buy ${DARK_DATA.tools.sql.name}!`);
        }
        ns.print('');
    }

}

export function displayRunnerStatsNoHomeServer(ns: NS) {
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

    ns.print(`${indent()}Runners: ${runners.length}, Ram Usage: ${percentUsed}% of ${formatBigRam(totalMaxRam)}, `);
}

export function getReputationGainRate(ns: NS) {
    return ns.getPlayer().workRepGainRate * 5;// why *5?? Because of the game code
}

function makeRepCostTimeString(ns: NS, totalCost: number, remainingCost: number): string {
    let incomePerSec = getReputationGainRate(ns);
    return makeEtaTimeString(ns, totalCost, remainingCost, incomePerSec);
}

export function makeEtaTimeString(ns: NS, totalCost: number, remainingCost: number, gain: number): string {

    let etaTime = new Date();
    let estTimeLeft = (remainingCost / gain) * 1000;
    etaTime.setTime(new Date().getTime() + estTimeLeft);
    let etaDurationString = etaTime.toLocaleString('en-US', { hour: 'numeric', minute: 'numeric', second: 'numeric' });

    let costString = `${formatBigNumber(totalCost)}`;
    let remainingCostString = `+${formatBigNumber(remainingCost)}`;
    let timeLeftString = `Time left: ${formatBigTime(estTimeLeft).padStart(5)}`;
    let etaString = `ETA: ${etaDurationString}`;

    return `${costString}, ${remainingCostString.padStart(7)}, ${timeLeftString}, ${etaString}`;
}

function makeMoneyCostTimeString(ns: NS, itemCost: number): string {
    let player = ns.getPlayer();

    let incomePerSec = getTotalIncome(ns);
    let remainingCost = Math.max(itemCost - player.money, 0);

    let etaDurationString = 'Now!';
    let timeLeftString = 'None!';
    if (remainingCost > 0) {
        let etaTime = new Date();
        let estTimeLeft = (remainingCost / incomePerSec) * 1000;
        etaTime.setTime(new Date().getTime() + estTimeLeft);
        etaDurationString = etaTime.toLocaleString('en-US', { hour: 'numeric', minute: 'numeric', second: 'numeric' });
        timeLeftString = formatBigTime(estTimeLeft).padStart(5);
    }

    let itemCostString = `\$${formatBigNumber(itemCost)}`;
    let remainingCostString = `+\$${formatBigNumber(remainingCost)}`;

    return `${itemCostString}, ${remainingCostString.padStart(6)}, Time left: ${timeLeftString}, ETA: ${etaDurationString}`;
}

export function displayHomeUpgradeInfo(ns: NS) {
    let homeCoreCost = formatBigNumber(ns.getUpgradeHomeCoresCost());

    ns.print(`Next Home Upgrades:`);
    ns.print(`${indent()}Ram: ${makeMoneyCostTimeString(ns, ns.getUpgradeHomeRamCost())}`);
    ns.print(`${indent()}Cores: \$${homeCoreCost}`);
    ns.print('');

}

export function displayHacknetInfo(ns: NS) {
    let numNodes = ns.hacknet.numNodes();

    if (numNodes > 0) {

        ns.print(`Hacknet:`);
        ns.print(`${indent()}Nodes: ${numNodes}, Next cost: \$${formatBigNumber(ns.hacknet.getPurchaseNodeCost(), 1)}`);

        let totalHashGain = 0;
        for (let i = 0; i < numNodes; i++) {
            let nodeInfo = ns.hacknet.getNodeStats(i);
            totalHashGain += nodeInfo.production;
        }
        ns.print(`${indent()}Hash Gain: ${round(totalHashGain, 3)}/s`);
        ns.print(`${indent()}Hashes: ${round(ns.hacknet.numHashes(), 2)}`);
        ns.print('');
    }

}

export function getPendingAugmentations(ns: NS) {
    let allAugs = ns.getOwnedAugmentations(true);
    let installedAugs = ns.getOwnedAugmentations(false);

    return allAugs.filter(a => !installedAugs.includes(a));

}

export function doInstallReset(ns: NS) {
    //if we have uninstalled augmentations
    if (getPendingAugmentations(ns).length > 0) {
        ns.installAugmentations(SCRIPTS_OLD_CONTROLLERS.hackController);
    } else {
        ns.softReset(SCRIPTS_OLD_CONTROLLERS.hackController);
    }
}

export function buyNFGs(ns: NS) {
    ns.print(`Try to buy as many NGFs as we can!`);
    //we'll try to buy as many NFGs as we can

    let player = ns.getPlayer();

    let nfgPrice = ns.getAugmentationPrice(NEURO_FLUX_GOVERNOR);
    let nfgRepReq = ns.getAugmentationRepReq(NEURO_FLUX_GOVERNOR);

    ns.print(`'${NEURO_FLUX_GOVERNOR}' price: \$${formatBigNumber(nfgPrice)}, rep: ${formatBigNumber(nfgRepReq)}`);

    let joinedFactions = player.factions;
    if (ns.gang.inGang()) {
        let info = ns.gang.getGangInformation();
        joinedFactions = joinedFactions.filter(f => f !== info.faction);
    }

    if (joinedFactions.length > 0) {
        let factionReps = joinedFactions.map(f => {
            return {
                name: f,
                reputation: ns.getFactionRep(f),
                favor: ns.getFactionFavor(f)
            };
        });

        //factionReps.sort((a, b) => b.reputation - a.reputation);

        //ns.print(`factions`, factionReps);

        //let bestRepFaction = factionReps[0];

        //get a faction that has enough rep to buy an NFG
        let targetFaction = factionReps.find(f => f.reputation > nfgRepReq);

        if (targetFaction) {
            if (player.money > nfgPrice) {
                ns.print(`Purchase ${NEURO_FLUX_GOVERNOR} from ${targetFaction.name} for \$${formatBigNumber(nfgPrice)}, requires ${formatBigNumber(nfgRepReq)}`);
                let success = ns.purchaseAugmentation(targetFaction.name, NEURO_FLUX_GOVERNOR);
                if (success) {
                    ns.toast(`Purchased ${NEURO_FLUX_GOVERNOR}! `, TOAST_VARIANT.info, TOAST_DURATION);
                }
            } else {
                ns.print(`Not enough money to buy NFG!`);
            }

        } else {

            //let's check if there's a faction we can donate to
            let donateFactions = factionReps.filter(f => f.favor > ns.getFavorToDonate());

            if (donateFactions.length > 0) {
                //sweet! found donatable factions!
                donateFactions.sort((a, b) => b.reputation - a.reputation);

                targetFaction = donateFactions[0];

                let additionalRepNeeded = nfgRepReq - targetFaction.reputation;

                //how much would we need to donate to buy an NFG?
                let donationRequired = getDonationNeededForReputation(ns, additionalRepNeeded);

                if (player.money >= donationRequired) {
                    ns.print(`Donating \$${formatBigNumber(donationRequired)} to [${targetFaction.name}] to gain ${formatBigNumber(additionalRepNeeded)} rep!`);
                    ns.donateToFaction(targetFaction.name, donationRequired);
                } else {
                    ns.print('not enough money for NFG donation!');
                }

            } else {
                ns.print('No factions have enough rep to buy an NFG!');
            }

        }

    }

    //including donations

}

export function displayWorldDaemonProgress(ns: NS) {
    if (hasRedPillInstalled(ns)) {

        ns.print(`*** We have the Red Pill ***`);
        let player = ns.getPlayer();

        let hackSkillRequired = ns.getServerRequiredHackingLevel(WORLD_DAEMON.hostname);
        let remainingHackSkill = hackSkillRequired - player.hacking;

        let expNeeded = ns.formulas.skills.calculateExp(hackSkillRequired, player.hacking_exp_mult);
        let currExp = player.hacking_exp;

        ns.print(`${indent()}[${WORLD_DAEMON.hostname}] Hack Skill Req.: ${hackSkillRequired}, Current: ${player.hacking}, Remaining: ${remainingHackSkill}`);
        ns.print(`${indent()}EXP Needed: ${formatBigNumber(expNeeded)}, Current EXP: ${formatBigNumber(currExp)}`);

        ns.print('');

    }
}
