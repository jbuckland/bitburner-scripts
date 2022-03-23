import {
    CITY_FACTIONS, COMPANY_FACTIONS, COMPANY_QUIT_PENALTY, DARK_DATA, FACTION_WORK_HACKING, HACK_FACTIONS, HOME, JOB_FIELDS, NON_HACKING_AUGMENTS, SCRIPTS,
    THE_RED_PILL, TOAST_DURATION, TOAST_VARIANT, TRAVEL_COST, WORK_TYPE, WORLD_DAEMON
} from './consts';
import { NS, Player } from './NetscriptDefinitions';
import { ICityFaction, ICompanyFaction, ICompanyJob, IDarkwebTool, IFaction } from './types';
import {
    debug, formatBigRam, getDonationNeededForReputation, getPlayerTools, getRemainingFactionAugmentations, hasRemainingAugmentionsToBuy, myFormatCurrency,
    timestamp
} from './utils';

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
        COMPANY_FACTIONS.clark,
        WORLD_DAEMON
    ];

    for (let i = 0; i < factionList.length; i++) {
        const faction = factionList[i];
        if (!player.factions.includes(faction.name)) {
            let server = ns.getServer(faction.hostname);
            if (!server.backdoorInstalled) {
                if (server.hasAdminRights) {
                    if (server.requiredHackingSkill <= player.hacking) {
                        ns.exec(SCRIPTS.backdoor, HOME, 1, faction.hostname);
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

export function workOnFactionRep(ns: NS, targetFaction: IFaction) {

    if (isCityFaction(targetFaction)) {
        let player = ns.getPlayer();

        let cityFaction = targetFaction as ICityFaction;
        let currFactions = player.factions;

        if (currFactions.includes(cityFaction.name)) {
            if (!player.isWorking) {

                player.isWorking = myWorkForFaction(ns, targetFaction, false);
            }
        } else {
            if (player.city !== cityFaction.homeCity && player.money > TRAVEL_COST) {
                ns.travelToCity(cityFaction.homeCity);
            }
            joinFactions(ns, [cityFaction]);

        }

    } else if (isCompanyFaction(targetFaction)) {
        let player = ns.getPlayer();
        let compFaction = targetFaction as ICompanyFaction;

        if (!player.factions.includes(compFaction.name)) {

            //Object.keys(myJobs).includes(targetFaction.name)

            //we need to build our rep with this company before we get an invite
            let fieldName = JOB_FIELDS.Software;

            //Note: if we already have this job, we'll be trying for a promotion
            let success = ns.applyToCompany(compFaction.name, fieldName);
            if (success) {
                ns.toast(`Got a ${fieldName} job with ${compFaction.name}!!`);
            }

        }

        if (!player.isWorking) {
            let myJobs = getPlayerJobs(ns);
            let factionJob = myJobs.find(j => j.copmpanyName === targetFaction?.name);
            if (factionJob) {
                ns.print(`trying to work at ${factionJob.jobName} job, for ${factionJob.copmpanyName} `);
                ns.workForCompany(factionJob.copmpanyName);
            }
        }

    }

    //these factions have very high Rep requirements, so we're going to go the donation route
    if (targetFaction.name === HACK_FACTIONS.daedalus.name ||
        targetFaction.name === COMPANY_FACTIONS.nwo.name ||
        targetFaction.name === HACK_FACTIONS.bitrunners.name) {

        let currFavor = ns.getFactionFavor(targetFaction.name);
        let factionFavorGain = ns.getFactionFavorGain(targetFaction.name);

        let favorToDonate = ns.getFavorToDonate();
        let totalFavorAfterReset = currFavor + factionFavorGain;

        debug(ns, `${targetFaction.name}: currFavor: ${currFavor}, stored favor: ${factionFavorGain}, after reset: ${totalFavorAfterReset}`);

        //reset at thirds
        if (currFavor < (favorToDonate * .66)) {
            if (totalFavorAfterReset >= (favorToDonate * .66)) {
                ns.installAugmentations(SCRIPTS.controller);
                ns.softReset(SCRIPTS.controller);
            }
        } else if (currFavor < (favorToDonate * .33)) {
            if (totalFavorAfterReset >= (favorToDonate * .33)) {
                ns.installAugmentations(SCRIPTS.controller);
                ns.softReset(SCRIPTS.controller);
            }
        } else if (currFavor < favorToDonate) {
            if (totalFavorAfterReset >= favorToDonate) {
                ns.installAugmentations(SCRIPTS.controller);
                ns.softReset(SCRIPTS.controller);
            }

        }

    }

    let player = ns.getPlayer();
    if (!player.isWorking) {
        player.isWorking = myWorkForFaction(ns, targetFaction, false);
    }

}

export function claimedEarnedFactionRep(ns: NS, restart: boolean = false) {
    let factionRepAmount = 1000;

    let player = ns.getPlayer();

    debug(
        ns,
        `isWorking:${player.isWorking}, currentWorkFactionName:${player.currentWorkFactionName}, companyName:${player.companyName}, workType:${player.workType}`
    );

    //debug(ns, JSON.stringify(player, null, 4));

    if (player.isWorking) {
        if (player.workType === WORK_TYPE.Faction) {
            if (player.workRepGained >= factionRepAmount) {

                let isFocused = ns.isFocused();
                let currWorkType = player.workType;
                let currWorkFaction = player.currentWorkFactionName;

                ns.stopAction();
                ns.print(`${timestamp()} Cashing in on gained reputation for ${player.currentWorkFactionName}`);

                if (restart) {
                    ns.workForFaction(currWorkFaction, currWorkType, isFocused);

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
                    ns.print(`${timestamp()} Cashing in on gained reputation for ${company.name}`);

                    if (restart) {
                        ns.workForCompany(company.name, isFocused);

                    }
                }

            } else {
                debug(ns, `ERROR! couldn't find company ${currWorkCompany}!`);
            }

        }
    }

}

export interface ITargetAugmentation {
    augName: string;
    fromFaction: IFaction,
    totalRepCost: number;
    additionalRepNeeded: number;
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

                let additionalCost = rawCost - currRep;
                let adjustedCost = additionalCost / totalRepMult;

                if (isCompanyFaction(faction)) {
                    let company = getCompany(ns, faction.name);
                    if (company) {
                        //we need to take into consideration how long it would take to join the company
                        let compRep = ns.getCompanyRep(faction.name);
                        let additionalCompanyRep = company?.repNeededForInvite - compRep;

                        adjustedCost += additionalCompanyRep;
                    }

                }

                if (adjustedCost < lowestAdditionsRepCostAdjusted) {
                    lowestAdditionsRepCostAdjusted = adjustedCost;

                    targetAug = {
                        augName: a,
                        fromFaction: faction,
                        additionalRepNeeded: additionalCost,
                        totalRepCost: rawCost
                    };
                    lowestAdditionalRepCost = additionalCost;
                }
            }
        }
    }

    return targetAug;
}

export function myWorkForFaction(ns: NS, faction: IFaction, focus: boolean) {
    let player = ns.getPlayer();
    let success = false;

    let workType = FACTION_WORK_HACKING;

    if (player.factions.includes(faction.name)) {

        //do they still have augments I need?            
        let remainingFactionAugments = getRemainingFactionAugmentations(ns, faction.name);
        let totalCount = remainingFactionAugments.length;
        //filter out non hacking augments
        remainingFactionAugments = remainingFactionAugments.filter(a => {
            return !NON_HACKING_AUGMENTS.includes(a);
        });
        let wantedCount = remainingFactionAugments.length;
        let unwantedCount = totalCount - wantedCount;

        if (remainingFactionAugments.length > 0) {
            ns.print(`${faction.name} still has ${wantedCount} augments I need! (and ${unwantedCount} I don't want)`);

            success = ns.workForFaction(faction.name, workType, focus);
            if (success) {
                ns.toast(`Working for ${faction.name} doing ${workType}`, TOAST_VARIANT.info, TOAST_DURATION);
            } else {
                ns.print(`ERROR! Failed to work for ${faction.name} doing ${workType}`);
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

        let factionRep = ns.getFactionRep(faction);

        let remainingAugs = getRemainingFactionAugmentations(ns, faction);

        //filter out non hacking augments
        remainingAugs = remainingAugs.filter(a => {
            return !NON_HACKING_AUGMENTS.includes(a);
        });

        for (let j = 0; j < remainingAugs.length; j++) {
            let augName = remainingAugs[j];

            let price = ns.getAugmentationPrice(augName);
            let repReq = ns.getAugmentationRepReq(augName);

            if (price <= player.money) {
                if (repReq > factionRep) {

                    //donations
                    let neededFavor = ns.getFavorToDonate();
                    let currFavor = ns.getFactionFavor(faction);

                    if (currFavor >= neededFavor) {
                        let extraMoney = player.money - price;

                        let additionalRepNeeded = repReq - factionRep;

                        let donationAmountNeeded = getDonationNeededForReputation(ns, additionalRepNeeded);

                        if (donationAmountNeeded <= extraMoney) {
                            ns.donateToFaction(faction, donationAmountNeeded);
                            ns.print(`Donated ${myFormatCurrency(donationAmountNeeded)} for ${Math.round(additionalRepNeeded)} reputation!`);
                        }

                    }

                } else {
                    let success = ns.purchaseAugmentation(faction, augName);
                    if (success) {
                        ns.toast(`'${augName}' purchased from ${faction}!`, TOAST_VARIANT.info, TOAST_DURATION);
                    }
                    if (augName === THE_RED_PILL) {
                        ns.installAugmentations(SCRIPTS.controller);
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

export function tryPurchaseServer(ns: NS) {
    const MAX_RAM = Math.pow(2, 20);
    const MIN_RAM = 16;
    let myServers = ns.getPurchasedServers();

    let nextRamSize = MIN_RAM;

    let homeServersNames: string[] = ns.getPurchasedServers();
    let homeServers: { hostname: string, maxRam: number }[] = [];

    let smallestServer: { hostname: string, maxRam: number } | undefined;

    for (let i = 0; i < homeServersNames.length; i++) {
        const serverName = homeServersNames[i];
        const serverRam = ns.getServerMaxRam(serverName);

        if (!smallestServer || serverRam < smallestServer.maxRam) {
            smallestServer = { maxRam: serverRam, hostname: serverName };

        }
        homeServers.push({ hostname: serverName, maxRam: serverRam });
    }

    if (homeServers.length > 0) {
        //if we do have some home servers,
        //find the biggest
        homeServers.sort((a, b) => { return a.maxRam - b.maxRam; });
        let biggestServer = homeServers[homeServers.length - 1];
        nextRamSize = biggestServer.maxRam * 2;
    }

    //finally
    nextRamSize = Math.min(nextRamSize, MAX_RAM);
    let serverCost = ns.getPurchasedServerCost(nextRamSize);
    let playerHasEnoughMoney = ns.getPlayer().money >= serverCost;

    let serverLimit = ns.getPurchasedServerLimit();
    let serverCount = myServers.length;
    let homeServersFull = serverCount >= serverLimit;

    let serverNeedsUpgrade = smallestServer && smallestServer.maxRam < MAX_RAM;

    debug(ns, 'tryPurchaseServer()', { nextRamSize, serverCost, playerHasEnoughMoney, homeServersFull, smallestServer });
    if (playerHasEnoughMoney) {
        if (homeServersFull && smallestServer && serverNeedsUpgrade) {
            //delete
            ns.toast(`Removed home server! ${smallestServer.hostname} (${formatBigRam(smallestServer.maxRam)})`, TOAST_VARIANT.info, TOAST_DURATION);
            ns.killall(smallestServer.hostname);
            ns.deleteServer(smallestServer.hostname);
        }

        if (!homeServersFull || (smallestServer && serverNeedsUpgrade)) {
            //buy
            let newHostName = ns.purchaseServer(HOME, nextRamSize);
            ns.toast(`Purchased home server! ${newHostName} (${formatBigRam(nextRamSize)})`, TOAST_VARIANT.success, TOAST_DURATION);
            ns.run(SCRIPTS.addScripts); //get the scripts on the new server
        }
    }

}

export function isCompanyFaction(faction: IFaction) {
    return Object.values(COMPANY_FACTIONS).map(f => f.name).includes(faction.name);
}

export function isCityFaction(faction: IFaction) {
    return Object.values(CITY_FACTIONS).map(f => f.name).includes(faction.name);
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