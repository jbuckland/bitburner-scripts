import {
    CITY_FACTIONS,
    COMPANY_FACTIONS,
    COMPANY_QUIT_PENALTY,
    DARK_DATA,
    DebugLevel,
    FACTION_WORK_HACKING,
    HACK_FACTIONS,
    HOME,
    INDENT_STRING,
    JOB_FIELDS,
    MAX_HOME_SERVER_RAM,
    NEURO_FLUX_GOVERNOR,
    NON_HACKING_AUGMENTS,
    SCRIPTS,
    THE_RED_PILL,
    TOAST_DURATION,
    TOAST_VARIANT,
    TRAVEL_COST,
    WORK_TYPE,
    WORLD_DAEMON
} from './consts';
import {NS, Player} from './NetscriptDefinitions';
import {ICityFaction, ICompanyFaction, ICompanyJob, IDarkwebTool, IFaction, IRunnerServer} from './types';
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
    getRemainingFactionAugmentations,
    hasRedPillInstalled,
    hasRemainingAugmentionsToBuy,
    longConnect,
    round,
    setSettings
} from './utils';
import {ITableData, Table} from './utils-table';

export async function leaveTheCave(ns: NS) {
    let player = ns.getPlayer();
    if (hasRedPillInstalled(ns)) {

        setSettings(ns, {share: false, expGain: true});

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
        COMPANY_FACTIONS.nwo,
        COMPANY_FACTIONS.mega,
        COMPANY_FACTIONS.blade,
        COMPANY_FACTIONS.fultech,
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
        if (!playersTools.brute) playersTools.brute = purchaseProgram(ns, player, DARK_DATA.tools.brute);
        if (!playersTools.ftp) playersTools.ftp = purchaseProgram(ns, player, DARK_DATA.tools.ftp);
        if (!playersTools.smtp) playersTools.smtp = purchaseProgram(ns, player, DARK_DATA.tools.smtp);
        if (!playersTools.http) playersTools.http = purchaseProgram(ns, player, DARK_DATA.tools.http);

        //only buy these if we already have http
        if (playersTools.http) {
            if (!playersTools.alink) playersTools.alink = purchaseProgram(ns, player, DARK_DATA.tools.alink);
            if (!playersTools.scan1) playersTools.scan1 = purchaseProgram(ns, player, DARK_DATA.tools.scan1);
            if (!playersTools.scan2) playersTools.scan2 = purchaseProgram(ns, player, DARK_DATA.tools.scan2);
            if (!playersTools.prof) playersTools.prof = purchaseProgram(ns, player, DARK_DATA.tools.prof);

        }

        if (!playersTools.sql) playersTools.sql = purchaseProgram(ns, player, DARK_DATA.tools.sql);
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


export function doDonationReset(ns: NS, factionList: IFaction[]) {
    for (let i = 0; i < factionList.length; i++) {
        const targetFaction = factionList[i];
        let currFavor = ns.getFactionFavor(targetFaction.name);
        let factionFavorGain = ns.getFactionFavorGain(targetFaction.name);

        let favorToDonate = ns.getFavorToDonate();
        let totalFavorAfterReset = currFavor + factionFavorGain;

        //reset at thirds
        if (currFavor < (favorToDonate * .33)) {
            if (totalFavorAfterReset >= (favorToDonate * .33)) {
                debugLog(ns, DebugLevel.info, `Resetting! 33%`);
                doInstallReset(ns);

            } else {
                //debugLog(ns, DebugLevel.info, `Don't reset, would not yet be at 33% favor with [${targetFaction.name}]!`);
            }
        } else if (currFavor < (favorToDonate * .66)) {
            if (totalFavorAfterReset >= (favorToDonate * .66)) {
                debugLog(ns, DebugLevel.success, `Resetting! 66%`);
                doInstallReset(ns);

            } else {
                //debugLog(ns, DebugLevel.info, `Don't reset, would not yet be at 66% favor with [${targetFaction.name}]!`);
            }
        } else if (currFavor < favorToDonate) {
            if (totalFavorAfterReset >= favorToDonate) {
                debugLog(ns, DebugLevel.success, `Resetting! 100%`);
                doInstallReset(ns);

            } else {
                //debugLog(ns, DebugLevel.info, `Don't reset, would not yet be at 100% favor with [${targetFaction.name}]!`);
            }

        } else {
            //No need to reset yet! currFavor: ${currFavor}, stored favor: ${factionFavorGain}, after reset: ${totalFavorAfterReset}

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
            joinFactions(ns, [cityFaction]);

        }
    }

    function workOnCompanyReputation(targetFaction: IFaction) {

        let compFaction = targetFaction as ICompanyFaction;

        if (!player.factions.includes(compFaction.name)) {


            //we need to build our rep with this company before we get an invite
            let fieldName = JOB_FIELDS.Software;

            //Note: if we already have this job, we'll be trying for a promotion
            let success = ns.applyToCompany(compFaction.name, fieldName);
            if (success) {
                ns.toast(`Got a ${fieldName} job with ${compFaction.name}!!`);
            }


            if (!ns.isBusy()) {

                let myJobs = getPlayerJobs(ns);
                let factionJob = myJobs.find(j => j.copmpanyName === compFaction.name);
                if (factionJob) {
                    debugLog(ns, DebugLevel.info, `trying to work at ${factionJob?.jobName} job, for ${factionJob?.copmpanyName} `);
                    ns.workForCompany(factionJob?.copmpanyName);
                }
            } else {

                //check if we're already working for the company
                //and we have enough gained rep to get an invite
                if (player.workType === WORK_TYPE.Company && player.companyName === compFaction?.name) {
                    let repGain = getCompanyRepGainedAfterPenalty(ns, compFaction.name);
                    if (repGain + ns.getCompanyRep(compFaction.name) >= compFaction.repNeededForInvite) {
                        ns.stopAction();
                        ns.toast(`Got enough company rep with ${compFaction.name}!`, TOAST_VARIANT.success, TOAST_DURATION);
                    }

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
    let factionRepAmount = 100 * getReputationGainRate(ns);

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

                ns.stopAction();
                debugLog(ns, DebugLevel.info, `Cashing in ${formatBigNumber(player.workRepGained)} gained reputation for ${player.currentWorkFactionName}`);

                if (restart) {

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

                let companyServer = ns.getServer(company.hostname);

                let quitPenalty = getCompanyQuitPenalty(ns, company.hostname);

                //if we're working for a company, that means we're trying to get an invite into it's faction
                let targetRep = company.repNeededForInvite / (1 - quitPenalty);

                if (player.workRepGained >= targetRep) {
                    let isFocused = ns.isFocused();
                    ns.stopAction();
                    debugLog(ns, DebugLevel.info, `Cashing in ${formatBigNumber(player.workRepGained)} gained reputation for ${company.name}`);


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

export function findNextAugmentationToWorkToward(ns: NS): ITargetAugmentation | undefined {

    let player = ns.getPlayer();

    //based on the Rep we have right now,
    // which faction has the augmentation that requires the least additional reputation?

    let allFactions = [
        ...Object.values(CITY_FACTIONS),
        ...Object.values(HACK_FACTIONS),
        COMPANY_FACTIONS.nwo

    ];

    let currFactions = player.factions;
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
    debug(ns, `Factions to check`, allFactions);

    let lowestAdditionsRepCostAdjusted = Number.MAX_VALUE;
    let lowestAdditionalRepCost = Number.MAX_VALUE;
    let targetAug: ITargetAugmentation | undefined;

    let repMult = player.faction_rep_mult;

    for (let i = 0; i < allFactions.length; i++) {
        let faction = allFactions[i];
        let factionFavorMult = 1 + (ns.getFactionFavor(faction.name) / 100.0);

        let totalRepMult = factionFavorMult * repMult;

        debug(ns, `${faction.name}: factionFavorMult:${factionFavorMult.toPrecision(4)}, faction_rep_mult:${repMult.toPrecision(4)}, totalRepMult:${
            totalRepMult.toPrecision(4)}`);

        let neededAugments = getRemainingFactionAugmentations(ns, faction.name);

        //filter out non hacking augments
        neededAugments = neededAugments.filter(a => {
            return !NON_HACKING_AUGMENTS.find(nha => nha === a);
        });

        debug(ns, `Needed augments from ${faction.name}:`, neededAugments);

        if (neededAugments.length > 0) {
            for (let i1 = 0; i1 < neededAugments.length; i1++) {
                const a = neededAugments[i1];
                let rawCost = ns.getAugmentationRepReq(a);
                let currRep = ns.getFactionRep(faction.name);
                let price = ns.getAugmentationPrice(a);

                let additionalCost = rawCost - currRep;
                let adjustedCost = additionalCost / totalRepMult;

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

                        adjustedCost += additionalCompanyRep;
                    }

                }

                if (adjustedCost < lowestAdditionsRepCostAdjusted) {
                    lowestAdditionsRepCostAdjusted = adjustedCost;

                    targetAug = {
                        augName: a,
                        fromFaction: faction,
                        additionalRepNeeded: additionalCost,
                        totalRepCost: rawCost,
                        moneyCost: price
                    };
                    lowestAdditionalRepCost = additionalCost;
                }
            }
        }
    }

    return targetAug;
}

export function myWorkForFaction(ns: NS, factionName: string, focus: boolean): boolean {
    let player = ns.getPlayer();
    let success = false;

    let workType = FACTION_WORK_HACKING;

    if (player.factions.includes(factionName)) {

        //do they still have augments I need?
        let remainingFactionAugments = getRemainingFactionAugmentations(ns, factionName);
        let totalCount = remainingFactionAugments.length;
        //filter out non hacking augments
        remainingFactionAugments = remainingFactionAugments.filter(a => {
            return !NON_HACKING_AUGMENTS.includes(a);
        });
        let wantedCount = remainingFactionAugments.length;
        let unwantedCount = totalCount - wantedCount;

        if (remainingFactionAugments.length > 0) {
            //ns.print(`${factionName} still has ${wantedCount} augments I need! (and ${unwantedCount} I don't want)`);

            success = ns.workForFaction(factionName, workType, focus);
            if (success) {
                ns.toast(`Working for ${factionName} doing ${workType}`, TOAST_VARIANT.info, TOAST_DURATION);
            } else {
                debugLog(ns, DebugLevel.error, `Failed to work for ${factionName} doing ${workType}`);
            }
        }

    }

    return success;
}

export function joinFactions(ns: NS, factions: IFaction[]) {
    let invites = ns.checkFactionInvitations();

    factions.forEach(faction => {
        if (invites.includes(faction.name)) {
            ns.joinFaction(faction.name);
            ns.toast(`Joined ${faction.name}!`, TOAST_VARIANT.info, TOAST_DURATION);
        }
    });

}


export function purchaseAvailableAugmentations(ns: NS) {
    let player = ns.getPlayer();
    for (let i = 0; i < player.factions.length; i++) {
        let faction = player.factions[i];

        let currRepWithFaction = ns.getFactionRep(faction);
        let remainingAugs = getRemainingFactionAugmentations(ns, faction);

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
                        ns.toast(`'${augName}' purchased from ${faction}!`, TOAST_VARIANT.info, TOAST_DURATION);
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
                        let extraMoney = player.money - price;

                        let additionalRepNeeded = repReq - currRepWithFaction;

                        let donationAmountNeeded = getDonationNeededForReputation(ns, additionalRepNeeded);


                        if (donationAmountNeeded <= extraMoney) {

                            ns.donateToFaction(faction, donationAmountNeeded);

                            /*
                            let prodId = runDonate(ns, faction, donationAmountNeeded);

                            if (prodId > 0) {
                                ns.print(`Donated ${myFormatCurrency(donationAmountNeeded)} for ${Math.round(additionalRepNeeded)} reputation!`);
                            } else {
                                debugLog(ns, DebugLevel.error, `Unable to runDonate()!`);
                            }
                            */
                        }
                    }

                }
            }

        }

        //if we've purchased the last augmentation we need, and we're working for this faction, stop
        remainingAugs = getRemainingFactionAugmentations(ns, faction);
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

    debug(ns, 'tryPurchaseServer()', {nextRamSize, serverCost, playerHasEnoughMoney, homeServersFull, smallestServer});
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

        homeServers.push({hostname: serverName, maxRam: serverRam});
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

    //finally
    return Math.min(nextRamSize, MAX_RAM);
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

    ns.print(`${INDENT_STRING}Home: ${purchasedServers.length} of ${limit}${nextCostString}`);

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

    ns.print(`${INDENT_STRING}Runners: ${runners.length}, Ram Usage: ${percentUsed}% of ${formatBigRam(totalMaxRam)}, `);

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
        let repHeader = `Rep. Progress`;
        ns.print(`Faction Progress:`);
        ns.print(`${INDENT_STRING}Current ${factionTypeString}: [${factionWorkingFor}]`);

        //////////////////////
        // Reputation
        //////////////////////
        repHeader = `${INDENT_STRING}Reputation:`;
        let currentRepString = `Current: ${formatBigNumber(currRep)}`;
        let remainingRepString = `Remaining: ${formatBigNumber(remainingRep)}`;

        let gainedRepString = `Gained: ${formatBigNumber(gainedRep)}${penaltyString}`;

        ns.print(`${repHeader} ${currentRepString}, ${gainedRepString}`);

        ///////////////
        // Favor
        ///////////////
        let favorHeader = `${INDENT_STRING}Favor:`;

        let currentFavorString = `Current: ${formatBigNumber(currFavor)}`;

        let remainingFavorString = '';
        if (ns.getFavorToDonate() - currFavor > 0) {
            remainingFavorString = `Remaining: ${formatBigNumber(ns.getFavorToDonate() - currFavor)}, `;
        }


        let gainedFavorString = `Gained: ${formatBigNumber(gainedFavor)}`;

        ns.print(`${favorHeader} ${currentFavorString}, ${remainingFavorString}${gainedFavorString}`);

        let shareString = `${INDENT_STRING}Share Bonus: +${round((ns.getSharePower() - 1) * 100)}%`;
        ns.print(`${shareString}`);
        ns.print('');
    } else {
        //ns.print(`${repHeader}: none!`);
    }


}

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
        ns.print(`${INDENT_STRING}'${targetAug.augName}' from [${targetAug.fromFaction.name}]`);
        ns.print(`${INDENT_STRING}Money Needed: ${moneyCostTimeString}`);
        ns.print(`${INDENT_STRING}Rep. Needed: ${repCostTimeString}`);

        if (currFavor >= favorToDonate) {
            let donationNeeded = getDonationNeededForReputation(ns, targetAug.additionalRepNeeded);
            //donateString = `, or \$${formatBigNumber(donationNeeded)} donation`;
            let donationTimeString = makeMoneyCostTimeString(ns, donationNeeded);
            ns.print(` ${INDENT_STRING}Or donation: ${donationTimeString}`);
        }


    } else {
        ns.print(`${header} ${body}`);
    }

    ns.print('');
}

export function displayIncomeStats(ns: NS) {

    let money = ns.getScriptIncome();
    let exp = ns.getScriptExpGain();

    let moneyIncome = `\$${formatBigNumber(money[0])}`;
    let expIncome = formatBigNumber(exp);
    let repIncome = formatBigNumber(getReputationGainRate(ns));


    let incomeTable = new Table(ns);
    let tableData: ITableData[] = [
        {
            '$/s': moneyIncome,
            'xp/s': expIncome,
            'rep/s': repIncome
        }

    ];
    incomeTable.setData([
        {
            '$$/s': moneyIncome,
            'Exp/s': expIncome,
            'Rep/s': repIncome
        }
    ]);

    //incomeTable.print();


    ns.print(`Income: ${moneyIncome}/s, ${expIncome} xp/s, ${repIncome} rep/s`);
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
        let etaString = etaTime.toLocaleString('en-US', {hour: 'numeric', minute: 'numeric', second: 'numeric'});


        ns.print(`Next Darkweb tool: '${nextTool.name}'`);
        ns.print(`${INDENT_STRING} Cost: \$${formatBigNumber(nextTool.cost)}, +\$${formatBigNumber(remainingCost)}`);
        ns.print(`${INDENT_STRING} Time left: ${formatBigTime(estTimeLeft).padStart(6)}, ETA: ${etaString}`);

        if (!player.tor && player.money >= DARK_DATA.torCost) {
            ns.print(`INFO You have enough to buy the TOR router!`);
        }

        if (!playerTools.sql && player.money >= DARK_DATA.tools.sql.cost) {
            ns.print(`INFO You have enough to buy ${DARK_DATA.tools.sql.name}!`);
        }
        ns.print('');
    }


}


export function getReputationGainRate(ns: NS) {
    return ns.getPlayer().workRepGainRate * 5;// why *5?? Because of the game code
}

function makeRepCostTimeString(ns: NS, totalCost: number, remainingCost: number): string {


    let player = ns.getPlayer();

    let incomePerSec = getReputationGainRate(ns);

    let etaTime = new Date();
    let estTimeLeft = (remainingCost / incomePerSec) * 1000;
    etaTime.setTime(new Date().getTime() + estTimeLeft);
    let etaDurationString = etaTime.toLocaleString('en-US', {hour: 'numeric', minute: 'numeric', second: 'numeric'});

    let repCostString = `${formatBigNumber(totalCost)}`;
    let remainingCostString = `+${formatBigNumber(remainingCost)}`;
    let timeLeftString = `Time left: ${formatBigTime(estTimeLeft).padStart(5)}`;
    let etaString = `ETA: ${etaDurationString}`;


    return `${repCostString}, ${remainingCostString.padStart(7)}, ${timeLeftString}, ${etaString}`;

}


function makeMoneyCostTimeString(ns: NS, itemCost: number): string {
    let player = ns.getPlayer();

    let incomePerSec = ns.getScriptIncome()[0];
    let remainingCost = Math.max(itemCost - player.money, 0);


    let etaDurationString = 'Now!';
    let timeLeftString = 'None!';
    if (remainingCost > 0) {
        let etaTime = new Date();
        let estTimeLeft = (remainingCost / incomePerSec) * 1000;
        etaTime.setTime(new Date().getTime() + estTimeLeft);
        etaDurationString = etaTime.toLocaleString('en-US', {hour: 'numeric', minute: 'numeric', second: 'numeric'});
        timeLeftString = formatBigTime(estTimeLeft).padStart(5);
    }

    let itemCostString = `\$${formatBigNumber(itemCost)}`;
    let remainingCostString = `+\$${formatBigNumber(remainingCost)}`;

    return `${itemCostString}, ${remainingCostString.padStart(6)}, Time left: ${timeLeftString}, ETA: ${etaDurationString}`;
}

export function displayHomeUpgradeInfo(ns: NS) {
    let homeCoreCost = formatBigNumber(ns.getUpgradeHomeCoresCost());

    ns.print(`Next Home Upgrades:`);
    ns.print(`${INDENT_STRING}Ram: ${makeMoneyCostTimeString(ns, ns.getUpgradeHomeRamCost())}`);
    ns.print(`${INDENT_STRING}Cores: \$${homeCoreCost}`);
    ns.print('');

}


export function getPendingAugmentations(ns: NS) {
    let allAugs = ns.getOwnedAugmentations(true);
    let installedAugs = ns.getOwnedAugmentations(false);

    return allAugs.filter(a => !installedAugs.includes(a));


}

export function doInstallReset(ns: NS) {
    //if we have uninstalled augmentations
    if (getPendingAugmentations(ns).length > 0) {
        ns.installAugmentations(SCRIPTS.controller);
    } else {
        ns.softReset(SCRIPTS.controller);
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
                ns.purchaseAugmentation(targetFaction.name, NEURO_FLUX_GOVERNOR);
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

        ns.print(`*** We have the Red Pill!!! ***`);

        let hackSkillRequired = ns.getServerRequiredHackingLevel(WORLD_DAEMON.hostname);
        let player = ns.getPlayer();
        ns.print(`${INDENT_STRING}Hack Skill Required: ${hackSkillRequired}, Current: ${player.hacking}, Remaining: ${hackSkillRequired - player.hacking}`);


        ns.print('');

    }
}
