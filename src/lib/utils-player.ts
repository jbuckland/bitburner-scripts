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
import {GYMS} from 'lib/crime-consts';
import {
    debug,
    debugLog,
    formatBigNumber,
    formatBigRam,
    formatBigTime,
    formatPercent,
    getAllHosts,
    getDonationNeededForReputation,
    getGangIncome,
    getHacknetIncome,
    getPlayerFactionInfo,
    getPlayerTools,
    getServerFreeRam,
    getTotalIncome,
    getUnownedFactionAugmentations,
    hasRedPillInstalled,
    indent,
    longConnect,
    myGetScriptIncome,
    round,
    timestamp
} from 'lib/utils';
import {NS, Player} from 'NetscriptDefinitions';
import {IAugmentationInfo, ICityFaction, ICompanyFaction, ICompanyJob, IDarkwebTool, IFaction, IRunnerServer} from 'types';

export async function leaveTheCave(ns: NS) {
    let player = ns.getPlayer();
    if (hasRedPillInstalled(ns)) {

        let server = ns.getServer(WORLD_DAEMON.hostname);
        if (server.hasAdminRights && server.requiredHackingSkill < player.hacking) {
            let response = await ns.prompt(`Are you ready to leave the cave???`);
            if (response) {
                longConnect(ns, WORLD_DAEMON.hostname);
                await ns.singularity.installBackdoor();
                //ns.exec(SCRIPTS.backdoor, HOME, 1, WORLD_DAEMON.hostname);
            } else {
                //we're just going to ask again on the next pass :)
            }

        }

    }

}

export function installBackdoors(ns: NS) {

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

                        //always run on 'home'
                        if (!ns.scriptRunning(SCRIPTS.backdoor, HOME)) {

                            //manual ram check, allows us to use reserved ram
                            if (getServerFreeRam(ns, HOME) > ns.getScriptRam(HOME)) {

                                let pid = ns.exec(SCRIPTS.backdoor, HOME, 1, faction.hostname);
                                if (pid) {

                                } else {
                                    debugLog(ns, DebugLevel.error, `Unable to start ${SCRIPTS.backdoor} on ${HOME}`);
                                }
                            } else {
                                //not enough ram on HOME
                            }


                        } else {
                            //already running
                        }
                    } else {
                        //not enough hacking skill
                    }
                }
            }
        }
    }

}

export function buyDarkwebTools(ns: NS) {
    let player = ns.getPlayer();

    if (!player.tor && player.money > DARK_DATA.torCost) {
        player.tor = ns.singularity.purchaseTor();
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
        success = ns.singularity.purchaseProgram(program.name);
        if (success) {
            ns.toast(`Purchased ${program.name} !`, TOAST_VARIANT.info, TOAST_DURATION);

            let hackingTools: string [] = [
                DARK_DATA.tools.sql.name,
                DARK_DATA.tools.ftp.name,
                DARK_DATA.tools.brute.name,
                DARK_DATA.tools.http.name,
                DARK_DATA.tools.smtp.name
            ];

            if (hackingTools.includes(program.name)) {
                //include the program name as an arg just in case we buy a second hacking tool before the first autoNuke completes
                let nukeResults = ns.exec(SCRIPTS.autoNuke, HOME, 1, 'tail', program.name);
                if (nukeResults === 0) {
                    ns.toast(`${SCRIPTS.autoNuke} did not run after purchase of ${program.name}!!`, 'error' as TOAST_VARIANT);
                }

            }


        }

    }
    return success;
}

export function upgradeHomeComputer(ns: NS) {
    let player = ns.getPlayer();
    if (player.money > ns.singularity.getUpgradeHomeRamCost()) {
        let success = ns.singularity.upgradeHomeRam();
        if (success) {
            let server = ns.getServer(HOME);
            ns.toast(`Home Computer RAM upgraded to ${formatBigRam(server.maxRam)}!!`, TOAST_VARIANT.info, TOAST_DURATION);
        }
    } else if (player.money > ns.singularity.getUpgradeHomeCoresCost()) {
        let success = ns.singularity.upgradeHomeCores();
        if (success) {
            let server = ns.getServer(HOME);
            ns.toast(`Home Computer Cores upgraded to ${server.cpuCores}!!`, TOAST_VARIANT.info, TOAST_DURATION);
        }
    }
}

export function workOnReputation(ns: NS, targetFaction: IFaction, targetRepAmount: number, forceWork: boolean = true) {

    let player = ns.getPlayer();
    let currFactions = player.factions;

    if (isCityFaction(targetFaction.name)) {
        workOnCityReputation(targetFaction);
    } else if (isCompanyFaction(targetFaction.name)) {
        workOnCompanyReputation(targetFaction);
    } else {
        workOnFactionReputation(targetFaction, false);
    }

    //////////////////////////
    function workOnCityReputation(targetFaction: IFaction) {
        let cityFaction = targetFaction as ICityFaction;


        if (!currFactions.includes(cityFaction.name)) {
            if (player.city !== cityFaction.homeCity && player.money > TRAVEL_COST) {
                let success = ns.singularity.travelToCity(cityFaction.homeCity);
                if (success) {
                    ns.toast(`Traveling to ${cityFaction.homeCity} to join ${cityFaction.name}`, TOAST_VARIANT.info, TOAST_DURATION);
                } else {
                    debugLog(ns, DebugLevel.error, `Unable to travel to ${cityFaction.homeCity}!`);
                }
            }
        } else {
            workOnFactionReputation(targetFaction, false);
        }
    }

    function workOnCompanyReputation(targetFaction: IFaction) {
        let compFaction = targetFaction as ICompanyFaction;

        if (!player.factions.includes(compFaction.name)) {

            //we need to build our rep with this company before we get an invite
            let fieldName = JOB_FIELDS.Software;

            if (player.currentWorkFactionName === targetFaction.name) {
                //Note: if we already have this job, we'll be trying for a promotion
                let success = ns.singularity.applyToCompany(compFaction.name, fieldName);
                if (success) {
                    ns.toast(`Got a ${fieldName} job with ${compFaction.name}!!`);
                }
            }

            if (ns.singularity.isBusy()) {

                //check if we're already working for the company
                //and we have enough gained rep to get an invite
                if (player.workType === WORK_TYPE.Company && player.companyName === compFaction?.name) {
                    let repGain = getCompanyRepGainedAfterPenalty(ns, compFaction.name);
                    if (repGain + ns.singularity.getCompanyRep(compFaction.name) >= compFaction.repNeededForInvite) {
                        ns.singularity.stopAction();
                        ns.toast(`Got enough company rep with ${compFaction.name}!`, TOAST_VARIANT.success, TOAST_DURATION);
                    }

                }

            } else {

                let myJobs = getPlayerJobs(ns);
                let factionJob = myJobs.find(j => j.copmpanyName === compFaction.name);
                if (factionJob) {
                    debugLog(ns, DebugLevel.info, `trying to work at ${factionJob?.jobName} job, for ${factionJob?.copmpanyName} `);
                    ns.singularity.workForCompany(factionJob?.copmpanyName);
                }
            }

        } else {
            workOnFactionReputation(targetFaction, false);
        }
    }

    function workOnFactionReputation(targetFaction: IFaction, focus: boolean) {
        if (ns.singularity.isBusy()) {
            if (player.currentWorkFactionName === targetFaction.name) {
                let totalFactionRep = ns.singularity.getFactionRep(targetFaction.name) + player.workRepGained;

                if (totalFactionRep >= targetRepAmount) {
                    ns.singularity.stopAction();
                    debugLog(ns, DebugLevel.info, `We got our target rep. of ${formatBigNumber(targetRepAmount)} with ${targetFaction.name}`);
                } else {
                    //debugLog(ns, DebugLevel.info, `We're not at our target rep. of ${formatBigNumber(targetRepAmount)} with ${targetFaction.name}`);
                }
            } else if (forceWork) {
                //switch work to new faction
                console.log(`workOnReputation().workOnFactionReputation() forcing work for faction ${targetFaction.name}`);
                myWorkForFaction(ns, targetFaction.name, focus);
            }
        } else {
            myWorkForFaction(ns, targetFaction.name, focus);
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

                let isFocused = ns.singularity.isFocused();
                let currWorkType = player.currentWorkFactionDescription;
                let currWorkFaction = player.currentWorkFactionName;

                let msg = `Cashing in ${formatBigNumber(player.workRepGained)} gained reputation for '${currWorkFaction}', doing '${currWorkType}'`;
                debugLog(ns, DebugLevel.info, msg);
                ns.toast(msg, TOAST_VARIANT.info, TOAST_DURATION);
                ns.singularity.stopAction();

                if (restart) {

                    if (ns.singularity.isBusy()) {
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
                    let isFocused = ns.singularity.isFocused();
                    let msg = `Cashing in ${formatBigNumber(player.workRepGained)} gained reputation for ${company.name}`;
                    ns.toast(msg, TOAST_VARIANT.info, TOAST_DURATION);
                    debugLog(ns, DebugLevel.info, msg);
                    ns.singularity.stopAction();

                    if (restart) {
                        let success = ns.singularity.workForCompany(company.name, isFocused);

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
    ns.singularity.gymWorkout(GYMS.powerhouse, gymStatName, true);
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

    allFactions = getAvailableCityFactions(ns);

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
        let factionFavorMult = 1 + (ns.singularity.getFactionFavor(faction.name) / 100.0);

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
                let rawRepCost = ns.singularity.getAugmentationRepReq(a);
                let currRep = ns.singularity.getFactionRep(faction.name);
                let moneyCost = ns.singularity.getAugmentationPrice(a);

                let additionalRepCost = rawRepCost - currRep;
                let adjustedRepCost = additionalRepCost / totalRepMult;

                if (isCompanyFaction(faction.name)) {
                    let company = getCompany(ns, faction.name);
                    if (company) {
                        //we need to take into consideration how long it would take to join the company
                        let compRep = ns.singularity.getCompanyRep(faction.name);
                        let additionalCompanyRep = company?.repNeededForInvite - compRep;

                        let companyFavorMult = 1 + (ns.singularity.getCompanyFavor(faction.name) / 100.0);
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

export function getAvailableCityFactions(ns: NS): ICityFaction[] {
    let availableCityFacs = [...Object.values(CITY_FACTIONS)];

    let currFactions = ns.getPlayer().factions;

    //remove factions from the list that we can't join

    //Sector-12 != Chongqing, New Tokyo, Ishima, Volhaven
    //Aevum != Chongqing, New Tokyo, Ishima, Volhaven
    if (currFactions.includes(CITY_FACTIONS.sec12.name) || currFactions.includes(CITY_FACTIONS.aevum.name)) {
        availableCityFacs = availableCityFacs.filter(f =>
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
        availableCityFacs = availableCityFacs.filter(f =>
            f.name != CITY_FACTIONS.sec12.name &&
            f.name != CITY_FACTIONS.aevum.name &&
            f.name != CITY_FACTIONS.vol.name
        );
    }

    //Volhaven != Sector-12, Aevum, Chongqing, New Tokyo, Ishima
    if (currFactions.includes(CITY_FACTIONS.vol.name)) {
        availableCityFacs = availableCityFacs.filter(f =>
            f.name != CITY_FACTIONS.sec12.name &&
            f.name != CITY_FACTIONS.aevum.name &&
            f.name != CITY_FACTIONS.tian.name &&
            f.name != CITY_FACTIONS.tokyo.name &&
            f.name != CITY_FACTIONS.ishi.name
        );
    }

    return availableCityFacs;

}



export function getAugmentFactionCostInfo(ns: NS, augmentName: string, factionName: string): IAugmentationInfo {
    let player = ns.getPlayer();
    let baseRepCost = ns.singularity.getAugmentationRepReq(augmentName);
    let currRep = ns.singularity.getFactionRep(factionName);
    let price = ns.singularity.getAugmentationPrice(augmentName);

    let baseAdditionalRepCost = baseRepCost - currRep;
    let factionFavorRepMult = 1 + (ns.singularity.getFactionFavor(factionName) / 100.0);
    let repMult = player.faction_rep_mult;
    let totalRepMult = factionFavorRepMult * repMult;
    let adjustedAdditionalRepCost = baseAdditionalRepCost / totalRepMult;

    if (isCompanyFaction(factionName)) {
        let company = getCompany(ns, factionName);
        if (company) {
            //we need to take into consideration how long it would take to join the company
            let compRep = ns.singularity.getCompanyRep(factionName);
            let additionalCompanyRep = company?.repNeededForInvite - compRep;

            let companyFavorMult = 1 + (ns.singularity.getCompanyFavor(factionName) / 100.0);
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
    } as IAugmentationInfo;

}

export function myWorkForFaction(ns: NS, factionName: string, focus: boolean): boolean {
    let player = ns.getPlayer();
    let success = false;

    let workType = FACTION_WORK_HACKING;

    if (player.factions.includes(factionName)) {

        ns.enableLog('ALL');
        success = ns.singularity.workForFaction(factionName, workType, focus);
        ns.disableLog('ALL');


        if (success) {
            ns.toast(`Working for '${factionName}' doing '${workType}'`, TOAST_VARIANT.info, TOAST_DURATION);
        } else {
            debugLog(ns, DebugLevel.error, `Failed to work for '${factionName}' doing '${workType}'`);
            //ns.exit()
        }


    }

    return success;
}

export function joinFactions(ns: NS) {
    let invites = ns.singularity.checkFactionInvitations();
    //join everyone EXCEPT city factions, because they exclude other factions.
    let cityFactions = Object.values(CITY_FACTIONS).map(f => f.name);

    invites.forEach(factionName => {
        if (!cityFactions.includes(factionName)) {

            if (getUnownedFactionAugmentations(ns, factionName).length > 0) {
                ns.singularity.joinFaction(factionName);
                ns.toast(`Joined ${factionName}!`, TOAST_VARIANT.info, TOAST_DURATION);
            }
        }
    });

}

export async function purchaseAvailableAugmentations(ns: NS) {
    let player = ns.getPlayer();
    for (let i = 0; i < player.factions.length; i++) {
        let faction = player.factions[i];

        let currRepWithFaction = ns.singularity.getFactionRep(faction);
        let remainingAugs = getUnownedFactionAugmentations(ns, faction);

        //filter out non hacking augments
        remainingAugs = remainingAugs.filter(a => {
            return !NON_HACKING_AUGMENTS.includes(a);
        });

        //buy the most expensive one we can currently afford

        for (let j = 0; j < remainingAugs.length; j++) {
            let augName = remainingAugs[j];

            let price = ns.singularity.getAugmentationPrice(augName);
            let repReq = ns.singularity.getAugmentationRepReq(augName);

            //we have the money to buy it
            if (player.money >= price) {

                if (repReq <= currRepWithFaction) {
                    let success = ns.singularity.purchaseAugmentation(faction, augName);
                    if (success) {
                        ns.toast(`'${augName}' purchased from ${faction}!`, TOAST_VARIANT.success, TOAST_DURATION);
                    }

                    if (augName === THE_RED_PILL) {
                        let results = await ns.prompt('Ready to take the Red Pill??');
                        if (results) {
                            doInstallReset(ns);

                        }
                    }

                } else {
                    // it requires too much reputation
                    //donations
                    let neededFavor = ns.getFavorToDonate();
                    let currFavor = ns.singularity.getFactionFavor(faction);

                    if (currFavor >= neededFavor) {

                        let additionalRepNeeded = repReq - currRepWithFaction;

                        let donationAmountNeeded = getDonationNeededForReputation(ns, additionalRepNeeded);

                        if (player.money >= price + donationAmountNeeded) {
                            ns.singularity.donateToFaction(faction, donationAmountNeeded);
                        }
                    }

                }
            }

        }

        //if we've purchased the last augmentation we need, and we're working for this faction, stop
        if (remainingAugs.length === 0 && player.isWorking && player.currentWorkFactionName === faction) {

            ns.toast(`Purchased the last augmentation from ${faction}!`, TOAST_VARIANT.info, TOAST_DURATION);
            if (getUnownedFactionAugmentations(ns, faction).length === 0) {
                ns.singularity.stopAction();
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

    //don't go over max
    nextRamSize = Math.min(nextRamSize, MAX_RAM);

    //don't buy anything smaller than the current home
    let homeMaxRam = ns.getServerMaxRam(HOME);
    nextRamSize = Math.max(nextRamSize, homeMaxRam);

    return nextRamSize;
}

export function isHackingFaction(factionName: string) {
    return Object.values(HACK_FACTIONS).map(f => f.name).includes(factionName);
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
        nextCostString = `, \$${formatBigNumber(nextCost)}x${costMultiplierBeforeBuying} = \$${formatBigNumber(nextCost *
            costMultiplierBeforeBuying)} for next`;
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

export function displayReputationFactionProgress(ns: NS) {

}

export function displayReputationCompanyProgress(ns: NS) {

}

export function displayReputationProgress(ns: NS) {

    let player = ns.getPlayer();

    let workType: 'Faction' | 'Company' | 'Unknown' = 'Unknown';
    let groupWorkingFor: string | undefined;

    if (player.currentWorkFactionName) {
        groupWorkingFor = player.currentWorkFactionName;
        workType = 'Faction';
    } else if (player.companyName) {
        groupWorkingFor = player.companyName;
        workType = 'Company';
    }

    if (groupWorkingFor && workType !== 'Unknown') {

        //let currRep = 0;
        //let currFavor = 0;
        //let remainingFavorToDonation = 0;
        //let gainedFavor = 0;
        //let nextFavorResetAmount = 0;
        //let remainingFavorToReset = 0;
        //let remainingRepNeededForReset = 0;

        //let gainedRep = player.workRepGained;
        //let repIncome = getReputationGainRate(ns);



        if (workType === 'Company') {
            let remainingRep = 0;
            let currRep = ns.singularity.getCompanyRep(groupWorkingFor);
            let company = getCompany(ns, groupWorkingFor);
            if (company) {
                remainingRep = company.repNeededForInvite - currRep;
            }
            let quitPenalty = getCompanyQuitPenalty(ns, groupWorkingFor);
            let currFavor = ns.singularity.getCompanyFavor(groupWorkingFor);

            let gainedRep = player.workRepGained;
            let repIncome = getReputationGainRate(ns);

            //let remainingFavorToReset = nextFavorResetAmount - currFavor - gainedFavor;
            let gainedFavor = ns.singularity.getCompanyFavorGain(groupWorkingFor);
            let remainingFavorToDonation = ns.getFavorToDonate() - currFavor - gainedFavor;



            /////////////////
            let currentRepString = formatBigNumber(currRep);
            let gainedRepString = formatBigNumber(gainedRep);
            let gainRateString = `${formatBigNumber(repIncome)} rep/sec`;
            let penaltyString = ` (${formatBigNumber(gainedRep * (1 - quitPenalty))} after -${round(quitPenalty * 100)}%)`;
            let remainingRepString = formatBigNumber(remainingRep);

            let currentFavorString = formatBigNumber(currFavor);
            let gainedFavorString = formatBigNumber(gainedFavor);
            let remainingFavorString = '';
            if (remainingFavorToDonation > 0) {
                remainingFavorString = `${formatBigNumber(remainingFavorToDonation)}, `;
            }

            ns.print(`Current Reputation Progress:`);
            ns.print(`${indent()}${workType}: [${groupWorkingFor}]`);

            ns.print(`${indent()}Reputation: Current: ${currentRepString}, Gained: ${gainedRepString} ${penaltyString}, ${gainRateString}`);
            ns.print(`${indent(2)}Remaining: ${remainingRepString}`);

            ns.print(`${indent()}Favor: Current: ${currentFavorString}, Gained: ${gainedFavorString}`);
            //if (bigFaction && remainingFavorToDonation > 0) {
            //    ns.print(`${indent(2)}Remaining: ${remainingFavorString}, +${round(remainingFavorToReset, 1)} until reset!`);
            //}
            ns.print(`${indent(2)}Remaining: ${remainingFavorString}`);



        } else if (workType === 'Faction') {


            let currRep = ns.singularity.getFactionRep(groupWorkingFor);
            let currFavor = ns.singularity.getFactionFavor(groupWorkingFor);
            let gainedFavor = ns.singularity.getFactionFavorGain(groupWorkingFor);
            let remainingFavorToDonation = ns.getFavorToDonate() - currFavor - gainedFavor;
            let gainedRep = player.workRepGained;
            let repIncome = getReputationGainRate(ns);


            let nextFavorResetAmount = 0;
            let repNeededThisTimeForReset = 0;
            let repAtStartOfReset = 0;

            let bigFaction = bigFactionList.find(f => f.name === groupWorkingFor);
            if (bigFaction) {

                nextFavorResetAmount = calcNextFavorResetAmount(ns, currFavor);

                repAtStartOfReset = ns.formulas.reputation.calculateFavorToRep(currFavor);
                //let totalFactionRepNeededToDonate = ns.formulas.reputation.calculateFavorToRep(ns.getFavorToDonate());
                //let additionalRepNeededToDonate = totalFactionRepNeededToDonate - factionRepAtStartOfReset;

                let totalFactionRepNeededToNextReset = ns.formulas.reputation.calculateFavorToRep(nextFavorResetAmount);

                repNeededThisTimeForReset = totalFactionRepNeededToNextReset - repAtStartOfReset - currRep;
            }


            let remainingFavorToReset = nextFavorResetAmount - currFavor - gainedFavor;



            /////////////////////
            let currentRepString = formatBigNumber(currRep);
            let gainedRepString = formatBigNumber(gainedRep);
            let repGainRateString = `${formatBigNumber(repIncome)} rep/sec`;

            let shareString = `+${formatPercent(ns.getSharePower() - 1)}`;

            let currentFavorString = formatBigNumber(currFavor);
            let gainedFavorString = formatBigNumber(gainedFavor);
            let remainingFavorString = formatBigNumber(remainingFavorToDonation);
            let resetEtaString = makeRepCostTimeString(ns, repNeededThisTimeForReset, (repNeededThisTimeForReset - currRep));

            ns.print(`Current Reputation Progress:`);
            ns.print(`${indent()}${workType}: [${groupWorkingFor}]`);

            ns.print(`${indent()}Reputation: Current: ${currentRepString}, Gained: ${gainedRepString}, ${repGainRateString}`);
            ns.print(`${indent()}Share Bonus: ${shareString}`);

            ns.print(`${indent()}Favor: Current: ${currentFavorString}, Gained: ${gainedFavorString}`);
            if (bigFaction && remainingFavorToDonation > 0) {
                ns.print(`${indent(2)}Remaining: ${remainingFavorString}, +${round(remainingFavorToReset, 1)} until reset!`);



                ns.print(`${indent(2)}${resetEtaString}`);
            }



        }

        ns.print('');

    } else {
        //ns.print(`${repHeader}: none!`);
    }

}

//these factions have very high Rep requirements, so we're going to go the donation route
export const bigFactionList: IFaction[] = [
    HACK_FACTIONS.blackHand,
    HACK_FACTIONS.bitrunners,
    COMPANY_FACTIONS.nwo,
    HACK_FACTIONS.daedalus
];

export function calcNextFavorResetAmount(ns: NS, currFavor: number) {
    let nextResetAmount = ns.getFavorToDonate();

    //these numbers were manually determined as optimal for 150 favor to donate
    let resetPoints = [
        42,
        82,
        117
    ];

    for (let resetPoint of resetPoints) {
        if (currFavor < resetPoint) {
            nextResetAmount = resetPoint;
            break;
        }
    }

    return nextResetAmount;
}



export function displayNFGInfo(ns: NS) {
    ns.print(`Next NFG:`);

    let nfgPrice = ns.singularity.getAugmentationPrice(NEURO_FLUX_GOVERNOR);
    let nfgRepReq = ns.singularity.getAugmentationRepReq(NEURO_FLUX_GOVERNOR);

    //display the faction with the most rep, that has enough to buy it

    let playerFactions = getPlayerFactionInfo(ns);
    if (playerFactions.length > 0) {

        playerFactions.sort((a, b) => b.reputation - a.reputation);

        let bestFaction = playerFactions.find(f => f.reputation >= nfgRepReq);
        let additionalRepNeeded = 0;
        if (!bestFaction) {
            //else the closest, factoring in favor

            let moreFactionInfo = playerFactions.map(f => {

                let favorMult = 1 + (f.favor / 100.0);

                return {
                    ...f,
                    scaledRemainingFaction: (nfgRepReq - f.reputation) / favorMult
                };
            });
            moreFactionInfo.sort((a, b) => {
                return a.scaledRemainingFaction - b.scaledRemainingFaction;
            });

            bestFaction = moreFactionInfo[0];
            additionalRepNeeded = Math.max(0, moreFactionInfo[0].scaledRemainingFaction);
        }



        let moneyCostTimeString = makeMoneyCostTimeString(ns, nfgPrice);
        let repCostTimeString = makeRepCostTimeString(ns, nfgRepReq, additionalRepNeeded);

        ns.print(`${indent()}From [${bestFaction.name}], Rep: ${formatBigNumber(bestFaction.reputation)}`);
        ns.print(`${indent()}Money Needed: ${moneyCostTimeString}`);
        ns.print(`${indent()}Rep. Needed: ${repCostTimeString}`);
    }



    ns.print('');
}

export function displayNextAugmentInfo(ns: NS, targetAug: ITargetAugmentation | undefined) {

    let header = 'Next augment:';
    let body = 'none!';

    if (targetAug) {

        //if we can donate to this faction
        //show how much money we'd need
        let favorToDonate = ns.getFavorToDonate();
        let currFavor = ns.singularity.getFactionFavor(targetAug?.fromFaction.name);
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

export function displayHeader(ns: NS, scriptRunTimeMs?: number) {
    let msg = `${timestamp()} `;
    if (scriptRunTimeMs != null) {
        msg += `Run Time: ${scriptRunTimeMs}ms, `;
    }
    msg += `RAM Used: ${formatBigRam(ns.getScriptRam(ns.getScriptName()))}`;

    ns.print(msg);
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
        let etaString = etaTime.toLocaleString('en-US', {hour: 'numeric', minute: 'numeric', second: 'numeric'});

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

export function makeRepCostTimeString(ns: NS, totalCost: number, remainingCost: number): string {
    let incomePerSec = getReputationGainRate(ns);
    return makeEtaTimeString(ns, totalCost, remainingCost, incomePerSec);
}

export function makeEtaTimeString(ns: NS, totalCost: number, remainingCost: number, gain: number): string {

    let costString = `${formatBigNumber(totalCost)}`;
    let etaDurationString = 'None!';
    let timeLeftString = 'Now!';
    if (remainingCost > 0) {
        let etaTime = new Date();
        let estTimeLeft = (remainingCost / gain) * 1000;
        etaTime.setTime(new Date().getTime() + estTimeLeft);
        etaDurationString = etaTime.toLocaleString('en-US', {hour: 'numeric', minute: 'numeric', second: 'numeric'});

        timeLeftString = `${formatBigTime(estTimeLeft).padStart(5)}`;
    }

    let remainingCostString = `+${formatBigNumber(remainingCost)}`;
    return `${costString}, ${remainingCostString}, Time left: ${timeLeftString}, ETA: ${etaDurationString}`;
}

export function makeMoneyCostTimeString(ns: NS, itemCost: number): string {
    let player = ns.getPlayer();

    let incomePerSec = getTotalIncome(ns);
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

    return `${itemCostString}, ${remainingCostString}, Time left: ${timeLeftString}, ETA: ${etaDurationString}`;
}

export function displayHomeUpgradeInfo(ns: NS) {
    let homeCoreCost = formatBigNumber(ns.singularity.getUpgradeHomeCoresCost());

    ns.print(`Next Home Upgrades:`);
    ns.print(`${indent()}Ram: ${makeMoneyCostTimeString(ns, ns.singularity.getUpgradeHomeRamCost())}`);
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
    let allAugs = ns.singularity.getOwnedAugmentations(true);
    let installedAugs = ns.singularity.getOwnedAugmentations(false);

    return allAugs.filter(a => !installedAugs.includes(a));

}

export function doInstallReset(ns: NS) {
    //if we have uninstalled augmentations
    if (getPendingAugmentations(ns).length > 0) {
        ns.singularity.installAugmentations(SCRIPTS_OLD_CONTROLLERS.hackController);
    } else {
        ns.singularity.softReset(SCRIPTS_OLD_CONTROLLERS.hackController);
    }
}

export function buyNFGs(ns: NS) {
    ns.print(`Try to buy as many NGFs as we can!`);
    //we'll try to buy as many NFGs as we can

    let player = ns.getPlayer();

    let nfgPrice = ns.singularity.getAugmentationPrice(NEURO_FLUX_GOVERNOR);
    let nfgRepReq = ns.singularity.getAugmentationRepReq(NEURO_FLUX_GOVERNOR);

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
                reputation: ns.singularity.getFactionRep(f),
                favor: ns.singularity.getFactionFavor(f)
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
                let success = ns.singularity.purchaseAugmentation(targetFaction.name, NEURO_FLUX_GOVERNOR);
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
                    ns.singularity.donateToFaction(targetFaction.name, donationRequired);
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
