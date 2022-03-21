import {
    CITY_FACTIONS, COMPANY_FACTIONS, CONTROLLER_SCRIPT, DARK_DATA, FACTION_WORK_HACKING, HACK_FACTIONS, HOME, SHARE_SCRIPT, THE_RED_PILL, TOAST_DURATION,
    TRAVEL_COST, WORLD_DAEMON
} from './consts';
import { NS, Player, RunningScript } from './NetscriptDefinitions';
import { ICityFaction, IDarkwebTool, IFaction, IHackFaction, RunMode, ServerInfo, Task, TaskType, TOAST_VARIANT } from './types';
import {
    formatBigNumber, getAllHosts, getAllServerInfo, getDonationNeededForReputation, getFirstAvailableRunnerForScript, getFirstAvailableRunnerForScriptThreads,
    getPlayerTools, getPriorityServers, getRandomId, getRemainingFactionAugmentations, getServerFreeRam, getThreadsAvailableForScript,
    getThreadsNeededToGrowHost, getThreadsNeededToHackAllHost, getThreadsNeededToWeakenHost, hasJoinedDaedalus, hasRedPillInstalled,
    hasRemainingAugmentionsToBuy, longConnect, myFormatCurrency, runMyGrow, runMyWeaken, timestamp
} from './utils';

const MIN_MONEY = 5000;
const MIN_THREADS_TO_RUN = 5;

const WEAKEN_SCRIPT = 'weaken.js';
const GROW_SCRIPT = 'grow.js';
const HACK_SCRIPT = 'hack.js';
const AUTO_NUKE_SCRIPT = 'autoNuke.js';

const DELAY_WEAKEN_SCRIPT = 'delay-weaken.js';
const DELAY_GROW_SCRIPT = 'delay-grow.js';
const DELAY_HACK_SCRIPT = 'delay-hack.js';

const MIN_MONEY_BEFORE_HACK: number = 0.8; //what percent of max money does a server need before we start hacking it?
const GROW_THRESHOLD: number = 0.9; //what percent of max to stop growing
const HACK_FRACTION_INITIAL: number = 0.2; //what percent to take when hacking
const STALL_TIME = 1000;

let taskList: Task[] = [];

export async function main(ns: NS) {

    let flags = ns.flags([
        ['mode', 'normal'],
        ['debug', false]
    ]);

    let debug = flags.debug;

    const MODE: RunMode = flags.mode as RunMode;

    ns.disableLog('ALL');

    ns.tail();

    //////////////////////////
    // Start initial scripts
    ///////////////////////////
    ns.run('addScripts.js');
    ns.run('autoNuke.js');
    ns.run('getRunnerStats.js', 1, '--refresh');
    ns.run('getStats.js', 1, '--refresh');
    ns.run('overviewMods.js', 1);

    let servers: ServerInfo[] = [];

    let restart = true;
    let extraTarget: ServerInfo | undefined = undefined;

    if (MODE !== 'share') {
        //kill any share scripts that might be left over from before
        for (let i = 0; i < getAllHosts(ns).length; i++) {
            let hostname = getAllHosts(ns)[i];
            ns.scriptKill(SHARE_SCRIPT, hostname);
        }
    }

    while (true) {
        await doPlayerAction();

        if (hasRedPillInstalled(ns)) {

            if (ns.getPurchasedServers().length < ns.getPurchasedServerLimit()) {
                tryPurchaseServer();
                await normalMode(getAllServerInfo(ns));
            } else {
                await doGainHackExp();
            }

        } else if (hasJoinedDaedalus(ns)) {

            //if we don't have 150 favor yet, share
            //if we DO have 150 favor, earn money!

            let minFav = Math.min(ns.getFactionFavor(HACK_FACTIONS.daedalus.name), ns.getFactionFavor(COMPANY_FACTIONS.nwo.name));

            if (minFav < 150) {
                await shareMode();
            } else {
                await normalMode(getAllServerInfo(ns));
            }

        } else {
            await normalMode(getAllServerInfo(ns));
        }

        await ns.sleep(10);
    }

    function tryPurchaseServer() {
        let serverLimit = ns.getPurchasedServerLimit();
        let myServers = ns.getPurchasedServers();
        let serverCount = myServers.length;

        if (serverCount < serverLimit) {

            let maxRam = Math.pow(2, 20);
            let serverCost = ns.getPurchasedServerCost(maxRam);

            if (ns.getPlayer().money >= serverCost) {
                ns.purchaseServer(HOME, maxRam);
                ns.toast(`${formatBigNumber(maxRam)}ram server purchased!`, 'info' as TOAST_VARIANT, null);
                ns.run('addScripts.js');
            }

        }
    }

    async function doGainHackExp() {

        tryPurchaseServer();

        let target = 'joesguns'; //this is the best server I've found for pure exp
        /*
                    let growThreads = getThreadsNeededToGrowHost(ns, target);
                    growThreads = Math.min(growThreads, getThreadsAvailableForScript(ns, HOME, GROW_SCRIPT));
                    if (growThreads > 0) {
        
                        ns.print(`growing ${target} with ${growThreads} threads using ${HOME}`);
                        runMyGrow(ns, HOME, target, growThreads);
                    }
        */
        let weakenThreads = getThreadsNeededToWeakenHost(ns, target);
        weakenThreads = Math.min(weakenThreads, getThreadsAvailableForScript(ns, HOME, WEAKEN_SCRIPT));
        if (weakenThreads > 0) {
            ns.print(`weakening ${target} with ${weakenThreads} threads using ${HOME}`);
            runMyWeaken(ns, HOME, target, weakenThreads);
        }

        let hosts = getAllHosts(ns);
        for (let i = 0; i < hosts.length; i++) {
            let runner = hosts[i];

            let numThreads = getThreadsAvailableForScript(ns, runner, GROW_SCRIPT);
            numThreads = Math.min(numThreads, getThreadsAvailableForScript(ns, runner, GROW_SCRIPT));
            if (numThreads > 0) {
                ns.print(`growing ${target} with ${numThreads} threads using ${runner}`);
                runMyGrow(ns, runner, target, numThreads);
            }
        }

        //await ns.sleep(ns.getHackTime(target) + 10);

    }

    async function shareMode() {
        let totalThreads = 0;

        for (let i = 0; i < getAllHosts(ns).length; i++) {
            let hostname = getAllHosts(ns)[i];
            let runningScripts = ns.ps(hostname);

            if (hostname === HOME) {

                ns.scriptKill(HACK_SCRIPT, hostname);
                ns.scriptKill(WEAKEN_SCRIPT, hostname);
                ns.scriptKill(GROW_SCRIPT, hostname);

            } else {

                for (let j = 0; j < runningScripts.length; j++) {
                    let script = runningScripts[j];

                    if (script.filename !== SHARE_SCRIPT) {
                        ns.scriptKill(script.filename, hostname);

                    }

                }
            }

            let numThreads = getThreadsAvailableForScript(ns, hostname, SHARE_SCRIPT);

            if (numThreads > 0) {
                ns.exec(SHARE_SCRIPT, hostname, numThreads);
            }

            runningScripts.forEach(s => {
                if (s.filename === SHARE_SCRIPT) {
                    totalThreads += s.threads;
                }
            });

        }

        ns.print(`${timestamp()} Sharing ALL available server power!! (${totalThreads} threads)`);
        await ns.sleep(10000);
    }

    async function normalMode2(server: ServerInfo) {
        //any server that gets here should already be max money and min security

        //we want to do a batch on this server
        //all calculations should be on min security

        //hack for 10% of money

    }

    async function normalMode(serverList: ServerInfo[]) {
        if (restart) {
            servers = getPriorityServers(ns, serverList);

            if (servers && servers.length > 0) {
                extraTarget = servers.reduce((max, server) => {
                    if (max.growthParam > server.growthParam) {
                        return max;
                    } else {
                        return server;
                    }
                });
            }

        }
        restart = true;

        //see if any of our list of running processes have finished
        updateTaskList(ns);

        // starting with the easiest...    

        let target: ServerInfo = servers.pop()!;
        if (target) {
            if (debug) ns.print(`target is ${target.hostname}`);

            //does it need to be weakened?
            if (target.currSecurity > target.minSecurity) {
                restart = await doTask(target, 'weaken');

                // } else if (target.currMoney > (target.maxMoney * MIN_MONEY_BEFORE_HACK)) {
                //     restart = await doTask(target, 'hack');

            } else if (target.currMoney < target.maxMoney) {
                restart = await doTask(target, 'grow');

            } else {
                restart = await doTask(target, 'hack');
            }
        } else {

            if (extraTarget) {
                await doExtra(extraTarget);
            }

        }
    }

    async function doPlayerAction() {
        if (debug) ns.print('doPlayerAction()');

        let player = ns.getPlayer();

        ///////////////
        //Darkweb stuff
        ///////////////

        if (!player.tor && player.money > DARK_DATA.torCost) {
            player.tor = ns.purchaseTor();
            ns.toast(`TOR router purchased!`, 'info' as TOAST_VARIANT, null);
        }
        if (player.tor) {
            let playersTools = getPlayerTools(ns);
            if (!playersTools.brute) playersTools.brute = purchaseProgram(player, DARK_DATA.tools.brute);
            if (!playersTools.ftp) playersTools.ftp = purchaseProgram(player, DARK_DATA.tools.ftp);
            if (!playersTools.smtp) playersTools.smtp = purchaseProgram(player, DARK_DATA.tools.smtp);
            if (!playersTools.http) playersTools.http = purchaseProgram(player, DARK_DATA.tools.http);

            if (!playersTools.alink) playersTools.alink = purchaseProgram(player, DARK_DATA.tools.alink);
            if (!playersTools.scan1) playersTools.scan1 = purchaseProgram(player, DARK_DATA.tools.scan1);
            if (!playersTools.scan2) playersTools.scan2 = purchaseProgram(player, DARK_DATA.tools.scan2);
            if (!playersTools.prof) playersTools.prof = purchaseProgram(player, DARK_DATA.tools.prof);

            if (!playersTools.sql) playersTools.sql = purchaseProgram(player, DARK_DATA.tools.sql);
        }

        player = ns.getPlayer();

        //////////////////////////
        // Upgrade Home Computer
        //////////////////////////

        if (player.money > ns.getUpgradeHomeRamCost()) {
            let success = ns.upgradeHomeRam();
            if (success) {
                let server = ns.getServer(HOME);
                ns.toast(`Home Computer RAM upgraded to ${server.maxRam}!!`, 'info' as TOAST_VARIANT, null);
                player = ns.getPlayer();
            }
        }

        if (player.money > ns.getUpgradeHomeCoresCost()) {
            let success = ns.upgradeHomeCores();
            if (success) {
                let server = ns.getServer(HOME);
                ns.toast(`Home Computer Cores upgraded to ${server.cpuCores}!!`, 'info' as TOAST_VARIANT, null);
                player = ns.getPlayer();
            }
        }

        //////////////////////
        // player "work"
        /////////////////////        

        //reset and claim work rep every 1000 rep
        let playerWasFocusing = ns.isFocused();
        if (player.isWorking && player.currentWorkFactionName) {
            if (player.workRepGained > 1000) {

                ns.stopAction();
                player.isWorking = false;
                ns.print(`${timestamp()} Cashing in on gained reputation for ${player.currentWorkFactionName}`);
            }
        }

        ////////////////////
        //faction invites
        ////////////////////

        if (hasRemainingAugmentionsToBuy(ns)) {
            let cheapestFaction = findNextFactionToWorkFor();

            if (cheapestFaction) {

                if (debug)
                    ns.print(`Cheapest faction was ${cheapestFaction.name}`);

                if (
                    cheapestFaction.name === CITY_FACTIONS.tokyo.name ||
                    cheapestFaction.name === CITY_FACTIONS.tian.name ||
                    cheapestFaction.name === CITY_FACTIONS.ishi.name ||
                    cheapestFaction.name === CITY_FACTIONS.sec12.name ||
                    cheapestFaction.name === CITY_FACTIONS.aevum.name ||
                    cheapestFaction.name === CITY_FACTIONS.vol.name
                ) {
                    let cityFaction = cheapestFaction as ICityFaction;
                    let currFactions = player.factions;

                    if (currFactions.includes(cityFaction.name)) {
                        if (!player.isWorking) {

                            player.isWorking = myWorkForFaction(cheapestFaction, playerWasFocusing);
                        }
                    } else {
                        if (player.city !== cityFaction.homeCity && player.money > TRAVEL_COST) {
                            ns.travelToCity(cityFaction.homeCity);
                        }
                        joinFactions([cityFaction]);

                    }

                }

                if (!player.isWorking) {
                    player.isWorking = myWorkForFaction(cheapestFaction, playerWasFocusing);
                }

                //these factions have very high Rep requirements, so we're going to go the donation route
                if (cheapestFaction.name === HACK_FACTIONS.daedalus.name ||
                    cheapestFaction.name === COMPANY_FACTIONS.nwo.name) {

                    let currFavor = ns.getFactionFavor(cheapestFaction.name);
                    let factionFavorGain = ns.getFactionFavorGain(cheapestFaction.name);

                    let favorToDonate = ns.getFavorToDonate();
                    let totalFavorAfterReset = currFavor + factionFavorGain;

                    if (debug) ns.print(`${cheapestFaction.name}: currFavor: ${currFavor}, stored favor: ${factionFavorGain}, after reset: ${totalFavorAfterReset}`);

                    //reset at thirds
                    if (currFavor < (favorToDonate * .66)) {
                        if (totalFavorAfterReset >= (favorToDonate * .66)) {
                            ns.installAugmentations(CONTROLLER_SCRIPT);
                            ns.softReset(CONTROLLER_SCRIPT);
                        }
                    } else if (currFavor < (favorToDonate * .33)) {
                        if (totalFavorAfterReset >= (favorToDonate * .33)) {
                            ns.installAugmentations(CONTROLLER_SCRIPT);
                            ns.softReset(CONTROLLER_SCRIPT);
                        }
                    } else if (currFavor < favorToDonate) {
                        if (totalFavorAfterReset >= favorToDonate) {
                            ns.installAugmentations(CONTROLLER_SCRIPT);
                            ns.softReset(CONTROLLER_SCRIPT);
                        }

                    }

                }
            }
        }

        ///////////////////////////
        //check for backdoors
        ///////////////////////////
        await installBackdoor(player, HACK_FACTIONS.csec);
        await installBackdoor(player, HACK_FACTIONS.nite);
        await installBackdoor(player, HACK_FACTIONS.blackHand);
        await installBackdoor(player, HACK_FACTIONS.bitrunners);
        await installBackdoor(player, WORLD_DAEMON);

        joinFactions([
            ...Object.values(HACK_FACTIONS),
            ...Object.values(COMPANY_FACTIONS)
        ]);

        ///////////////////////////
        // Augmentations
        ///////////////////////////
        purchaseAvailableAugmentations();

        //if we working for a faction that we can donate to, donate

    }

    function findNextFactionToWorkFor(): IFaction | undefined {
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
        if (debug) ns.print(`Factions to check`, allFactions);

        let lowestAdditionsRepCostAdjusted = Number.MAX_VALUE;
        let lowestAdditionalRepCost = Number.MAX_VALUE;
        let cheapestAugment = '';
        let cheapestFaction: IFaction | undefined;

        let repMult = player.faction_rep_mult;

        for (let i = 0; i < allFactions.length; i++) {
            let faction = allFactions[i];
            let factionFavorMult = 1 + (ns.getFactionFavor(faction.name) / 100.0);

            let totalRepMult = factionFavorMult * repMult;

            if (debug) ns.print(`${faction.name}: factionFavorMult:${factionFavorMult.toPrecision(4)}, faction_rep_mult:${repMult.toPrecision(4)}, totalRepMult:${
                totalRepMult.toPrecision(4)}`);

            let neededAugments = getRemainingFactionAugmentations(ns, faction.name);
            if (neededAugments.length > 0) {
                neededAugments.forEach(a => {
                    let rawCost = ns.getAugmentationRepReq(a);
                    let currRep = ns.getFactionRep(faction.name);
                    let additionalCost = rawCost - currRep;

                    let adjustedCost = additionalCost / totalRepMult;

                    if (adjustedCost < lowestAdditionsRepCostAdjusted) {
                        lowestAdditionsRepCostAdjusted = adjustedCost;

                        cheapestAugment = a;
                        cheapestFaction = faction;
                        lowestAdditionalRepCost = additionalCost;
                    }
                });
            }
        }
        if (cheapestFaction) {
            if (debug) ns.print(`Next augment: '${cheapestAugment}' from '${cheapestFaction.name}'. Need ${Math.round(lowestAdditionalRepCost)} additional rep`);
        }

        return cheapestFaction;
    }

    function purchaseAvailableAugmentations() {
        let player = ns.getPlayer();
        for (let i = 0; i < player.factions.length; i++) {
            let faction = player.factions[i];

            let factionRep = ns.getFactionRep(faction);

            let remainingAugs = getRemainingFactionAugmentations(ns, faction);
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
                            ns.toast(`'${augName}' purchased from ${faction}!`, 'info' as TOAST_VARIANT, null);
                        }
                        if (augName === THE_RED_PILL) {
                            ns.installAugmentations(CONTROLLER_SCRIPT);
                        }
                    }
                }

            }

            //if we've purchased the last augmentation we need, and we're working for this faction, stop
            remainingAugs = getRemainingFactionAugmentations(ns, faction);
            if (remainingAugs.length === 0 && player.isWorking && player.currentWorkFactionName === faction) {

                ns.toast(`Purchased the last augmentation from ${faction}!`, 'info' as TOAST_VARIANT, null);
                if (hasRemainingAugmentionsToBuy(ns)) {
                    ns.stopAction();
                }

            }

        }
    }

    function progressCityFaction(player: Player, faction: ICityFaction) {
        let working = false;
        if (getRemainingFactionAugmentations(ns, faction.name).length > 0) {
            working = true;

            if (player.city !== faction.homeCity && player.money > TRAVEL_COST) {
                ns.travelToCity(faction.homeCity);
            }
            joinFactions([faction]);

        }
        return working;
    }

    function joinFactions(factions: IFaction[]) {
        let invites = ns.checkFactionInvitations();

        factions.forEach(faction => {
            if (invites.includes(faction.name)) {
                ns.joinFaction(faction.name);
                ns.toast(`Joined ${faction.name}!`, 'info' as TOAST_VARIANT, null);
            }
        });

    }

    function purchaseProgram(player: Player, program: IDarkwebTool): boolean {
        let success = false;
        if (player.money > program.cost) {
            success = ns.purchaseProgram(program.name);
            if (success) {
                ns.toast(`Purchased ${program.name} !`, 'info' as TOAST_VARIANT, null);
                let nukeResults = ns.exec(AUTO_NUKE_SCRIPT, HOME, 1, 'tail');
                if (!nukeResults) {
                    ns.toast(`${AUTO_NUKE_SCRIPT} did not run after purchase of ${program.name}!!`, 'error' as TOAST_VARIANT);
                }
            }

        }
        return success;
    }

    function myWorkForFaction(faction: IFaction, focus: boolean) {
        let player = ns.getPlayer();
        let success = false;

        let workType = FACTION_WORK_HACKING;

        if (player.factions.includes(faction.name)) {

            //do they still have augments I need?            
            let remainingFactionAugments = getRemainingFactionAugmentations(ns, faction.name);

            if (remainingFactionAugments.length > 0) {
                ns.print(`${faction.name} still has ${remainingFactionAugments.length} augments I need!`);

                success = ns.workForFaction(faction.name, workType, focus);
                if (success) {
                    ns.toast(`Working for ${faction.name} doing ${workType}`, 'info' as TOAST_VARIANT, TOAST_DURATION);
                } else {
                    ns.print(`ERROR! Failed to work for ${faction.name} doing ${workType}`);
                }
            }

        }

        return success;
    }

    function workOnProgram(player: Player, program: IDarkwebTool): boolean {
        let success = false;

        if (!ns.fileExists(program.name, HOME) && player.hacking >= program.createSkill) {
            success = ns.createProgram(program.name, false);
            ns.toast(`Now working on ${program.name}`, 'info' as TOAST_VARIANT, null);
        }

        return success;
    }

    async function installBackdoor(player: Player, faction: IHackFaction): Promise<boolean> {
        let success = false;

        if (!player.factions.includes(faction.name)) {
            let server = ns.getServer(faction.hostname);
            if (!server.backdoorInstalled) {
                if (server.hasAdminRights) {
                    if (server.requiredHackingSkill <= player.hacking) {
                        ns.print(`Connecting to ${server.hostname} and installing backdoor!`);
                        longConnect(ns, server.hostname);
                        await ns.installBackdoor();
                        ns.toast(`backdoor installed on ${server.hostname}!`, 'info' as TOAST_VARIANT, null);
                        ns.connect(HOME);
                    }
                }
            }
        }

        return success;
    }

    async function doTask(target: ServerInfo, taskType: TaskType): Promise<boolean> {
        if (debug) ns.print(`doing task ${taskType}`);
        let actionPerformed = true;

        let taskScript = '';
        if (taskType === 'weaken') taskScript = WEAKEN_SCRIPT;
        else if (taskType === 'grow') taskScript = GROW_SCRIPT;
        else if (taskType === 'hack') taskScript = HACK_SCRIPT;

        let neededTaskThreads = getThreadsNeededForTask(ns, target, taskType);
        let currentTaskThreads = getNumRunningThreads(ns, target, taskType);

        let currTask = taskList.find(t => t.hostname == target.hostname && t.taskType == taskType);

        //setup the task for this server if it doesn't exist yet
        if (!currTask) {
            currTask = {
                hostname: target.hostname,
                taskType: taskType,
                allocatedThreads: [],
                threadsNeeded: neededTaskThreads
            };
            //sanity check!
            if (currentTaskThreads > 0) {
                ns.print(`ERROR! While doing ${taskType} on ${target.hostname}, found no ${taskType} task but ${currentTaskThreads} running threads!`);
            }

            taskList.push(currTask);
        }

        let remainingThreadsNeeded = neededTaskThreads - currentTaskThreads;

        let taskString = taskType.toUpperCase();
        let threadCountString = `${currentTaskThreads}/${neededTaskThreads} existing,`;
        let prefixString = `${timestamp()} ${taskString} ${target.hostname} | ${threadCountString}`;

        let runner = '';

        if (remainingThreadsNeeded > 0) {
            //we need to allocate more threads
            //how many threads could we allocate?

            let availableRunner = getFirstAvailableRunnerForScript(ns, taskScript);

            let availableThreads = 0;
            if (availableRunner) {
                runner = availableRunner;
                availableThreads = getThreadsAvailableForScript(ns, availableRunner, taskScript);
            } else {
                if (debug) ns.print(`No available runner to ${taskType}`);
            }

            if (availableThreads > 0) {
                //we can allocate more threads to weakening!

                let threadCountToAllocate = remainingThreadsNeeded;

                if (availableThreads < remainingThreadsNeeded) {
                    //we can only allocate as many threads as we have available
                    threadCountToAllocate = availableThreads;
                }

                //ns.enableLog('exec');
                let procId = ns.exec(taskScript, runner, threadCountToAllocate, target.hostname, getRandomId());
                if (procId == 0) {
                    ns.print(`ERROR! tried to ${taskString} ${target.hostname} with ${runner}, but it failed`);
                } else {
                    let actionString = `+${threadCountToAllocate} more threads on ${runner}`;
                    if (debug) ns.print(`${prefixString} ${actionString}`);

                    //we need to keep track of this process
                    currTask.allocatedThreads.push({
                        hostname: runner,
                        pid: procId,
                        threadCount: threadCountToAllocate
                    });
                }
                //ns.disableLog('exec');

            } else {
                if (debug) ns.print(`No available threads! Waiting...`);
                //ns.print(`${prefixString} ${actionString}`);
                await ns.sleep(STALL_TIME);
            }

        } else {
            //let actionString = `Next target!`;
            //ns.print(`${prefixString} ${actionString}`);
            actionPerformed = false;
        }
        return actionPerformed;
    }

    async function doBatch(target: ServerInfo) {

        let OPERATION_SPACE = 50; //ms        
        let batchId = getRandomId();

        ////////////////////////////////////
        // hack an amount of money
        ////////////////////////////////////

        let hackTime = ns.getHackTime(target.hostname);
        let hackThreadsUsed = 8;
        let hackSingleAmount = ns.hackAnalyze(target.hostname);
        let hackAmountTaken = hackSingleAmount * target.currMoney * hackThreadsUsed;

        let hackTotalSecGain = ns.hackAnalyzeSecurity(hackThreadsUsed);
        //let hackTotalSecGain = hackSingleSecGain * hackThreadsUsed;

        //example: 
        //maxMoney 1000
        //hackAmountTaken 10
        //currMoney 976
        //growAmountNeeded = 1000 - (976 - 10) = 1000 - 966 = 34
        //growResultingMultiple = 1 + (growAmountNeeded / currMoney)

        //we hack right away
        let hackDelay = 0;
        await runDelayScript(DELAY_HACK_SCRIPT, hackThreadsUsed, target, hackDelay, batchId);

        /////////////////////////////////////////////////////
        // weaken back down the security increase from hack
        /////////////////////////////////////////////////////

        //weakening is "always" longer than hacking
        //start it right away

        let weakenTime = ns.getWeakenTime(target.hostname);
        let weakenSingleSecDecrease = ns.weakenAnalyze(1);

        let hackWeakenThreadsNeeded = Math.ceil(hackTotalSecGain / weakenSingleSecDecrease);
        let hackWeakenDelay = 0;

        await runDelayScript(DELAY_WEAKEN_SCRIPT, hackWeakenThreadsNeeded, target, hackWeakenDelay, batchId);

        ///////////////////////////////////////////////
        // grow back up to maxMoney
        ///////////////////////////////////////////////

        let growTime = ns.getGrowTime(target.hostname);
        let growAmountNeeded = target.maxMoney - (target.currMoney - hackAmountTaken);
        let growResultingMultiple = 1 + (growAmountNeeded / (target.currMoney || 1));   //this will technically be slightly too little, but close enough
        let growThreadsNeeded = Math.ceil(ns.growthAnalyze(target.hostname, growResultingMultiple));
        let growSecGain = ns.growthAnalyzeSecurity(growThreadsNeeded);

        //we want grow to finish OPERATION_SPACE ms AFTER the first weaken finishes
        // (weakenTime + OPERATION_SPACE) = when to grow should finish
        // growDelay = weakenTime - growTime + OPERATION_SPACE        
        let growDelay = weakenTime + OPERATION_SPACE - growTime;
        await runDelayScript(DELAY_GROW_SCRIPT, growThreadsNeeded, target, growDelay, batchId);

        ///////////////////////////////////////////////////
        // weaken security increase from grow
        ///////////////////////////////////////////////////

        let growWeakenThreadsNeeded = Math.ceil(growSecGain / weakenSingleSecDecrease);
        let growWeakenDelay = growDelay + growTime + OPERATION_SPACE - weakenTime;
        await runDelayScript(DELAY_WEAKEN_SCRIPT, growWeakenThreadsNeeded, target, growWeakenDelay, batchId);

        //ns.print(`hackTotalSecGain:${hackTotalSecGain}, weakenSingleSecDecrease:${weakenSingleSecDecrease}, hackWeakenThreadsNeeded:${hackWeakenThreadsNeeded}`);
        //ns.print(`hackAmountTaken:${hackAmountTaken}, growAmountNeeded:${growAmountNeeded}, growResultingMultiple:${growResultingMultiple}, growThreadsNeeded:${growThreadsNeeded}`);
        //ns.print(`growSecGain:${growSecGain}, weakenSingleSecDecrease:${weakenSingleSecDecrease}, growWeakenThreadsNeeded:${growWeakenThreadsNeeded}`);
        ns.print(`${timestamp()} BATCH ${target.hostname}: Hack(${hackThreadsUsed}), Weaken(${hackWeakenThreadsNeeded}), Grow(${growThreadsNeeded}), Weaken(${growWeakenThreadsNeeded})`);

        //await ns.sleep(2000);
    }

    //for when we run out of normal stuff to do, do SOMETHING!
    async function doExtra(target: ServerInfo) {
        if (debug) ns.print(`doing extra work!`);
        //if we ran out of servers to do stuff to, let's just grow the biggest server again

        let runner = getFirstAvailableRunnerForScript(ns, HACK_SCRIPT);

        if (runner) {
            let server = ns.getServer(runner);

            //let's find the correct hack/weaken/grow ratios first        
            let testHackThreads = 100;
            let hackIncSecurity = ns.hackAnalyzeSecurity(testHackThreads);
            let hackFractionTaken = ns.hackAnalyze(runner) * testHackThreads;

            let singleWeakenDecSecurity = ns.weakenAnalyze(1, server.cpuCores);
            let testHackWeakenThreads = hackIncSecurity / singleWeakenDecSecurity;
            let testExtraGrowThreads = Math.ceil(ns.growthAnalyze(runner, 1 + hackFractionTaken, server.cpuCores));
            let testGrowWeakenThreads = Math.ceil(ns.growthAnalyzeSecurity(testExtraGrowThreads));

            //in theory the ratio of the threads should be correct
            let total = 100 + testHackWeakenThreads + testExtraGrowThreads + testGrowWeakenThreads;

            let hackThreadRatio = testHackWeakenThreads / total;
            let growThreadRatio = testExtraGrowThreads / total;
            let weakenThreadRatio = (testHackWeakenThreads + testGrowWeakenThreads) / total;

            //the three scripts should be able the same, but let's get the biggest 
            let maxScriptRamCost = Math.max(ns.getScriptRam(HACK_SCRIPT, runner), ns.getScriptRam(WEAKEN_SCRIPT, runner), ns.getScriptRam(GROW_SCRIPT, runner));

            //how many total threads could we run at that script cost?
            let freeRam = getServerFreeRam(ns, runner);

            let availableThreads = freeRam / maxScriptRamCost;

            let extraHackThreads = Math.floor(availableThreads * hackThreadRatio);
            let extraWeakenThreads = Math.floor(availableThreads * weakenThreadRatio);
            let extraGrowThreads = Math.floor(availableThreads * growThreadRatio);

            if (extraGrowThreads > 0) {
                ns.exec(GROW_SCRIPT, runner, extraGrowThreads, target.hostname, getRandomId());
            }

            if (extraWeakenThreads > 0) {
                ns.exec(WEAKEN_SCRIPT, runner, extraWeakenThreads, target.hostname, getRandomId());
            }

            if (extraHackThreads > 0) {
                ns.exec(HACK_SCRIPT, runner, extraWeakenThreads, target.hostname, getRandomId());
            }

            if (debug)
                ns.print(`${timestamp()} Runner: ${runner}, freeRam: ${Math.round(freeRam)}, availableThreads:${Math.round(availableThreads)}. Ratios: Grow:${growThreadRatio.toPrecision(
                    3)}, Weaken:${weakenThreadRatio.toPrecision(3)}, Hack:${hackThreadRatio.toPrecision(3)}`);

            ns.print(`${timestamp()} EXTRA GROW:${testExtraGrowThreads} WEAKEN:${extraWeakenThreads} HACK:${extraHackThreads} ${target.hostname} on ${runner}`);

        }
    }

    async function runDelayScript(scriptName: string, threadsNeeded: number, target: ServerInfo, runDelay: number, execId: number | string) {
        let MAX_RETRIES = 5;
        let runner = getFirstAvailableRunnerForScriptThreads(ns, scriptName, threadsNeeded);
        let retries = 0;
        while (!runner && retries < MAX_RETRIES) {
            ns.print(`waiting for a server to run ${scriptName} with ${threadsNeeded} threads`);
            await ns.sleep(1000);
            retries++;
        }

        if (runner) {
            ns.exec(scriptName, runner, threadsNeeded, target.hostname, runDelay, execId);
        } else if (retries >= MAX_RETRIES) {
            ns.print(`couldn't find a server in time!`);
        }

    }
}

function updateTaskList(ns: NS) {
    //first clear out any processes we know about that are no longer running
    for (let i = 0; i < taskList.length; i++) {
        let task = taskList[i];

        if (task.allocatedThreads && task.allocatedThreads.length > 0) {

            task.allocatedThreads = task.allocatedThreads.filter(allocThread => {
                return ns.isRunning(allocThread.pid, allocThread.hostname);
            });

        }

    }

    //next, record any processes we didn't already know about
    for (let i = 0; i < getAllHosts(ns).length; i++) {
        let host = getAllHosts(ns)[i];

        //look for WEAKEN_SCRIPT
        let weakenScriptInfo: RunningScript = ns.getRunningScript(WEAKEN_SCRIPT, host);
        if (weakenScriptInfo && weakenScriptInfo.threads > 0) {

            let weakenTarget = weakenScriptInfo.args[0];
            let weakenTask = taskList.find(t => t.hostname === weakenTarget);
            if (!weakenTask) {
                weakenTask = {
                    hostname: weakenTarget,
                    taskType: 'weaken',
                    threadsNeeded: getThreadsNeededToWeakenHost(ns, weakenTarget),
                    allocatedThreads: []
                };
            }
            if (!weakenTask.allocatedThreads.find(t => t.pid === weakenScriptInfo.pid)) {
                ns.print(`${host} was running ${WEAKEN_SCRIPT} and we didn't know about it! Logging it`, weakenScriptInfo);

                weakenTask.allocatedThreads.push({
                    hostname: weakenScriptInfo.server,
                    pid: weakenScriptInfo.pid,
                    threadCount: weakenScriptInfo.threads
                });
            }

        }

        //look for GROW_SCRIPT
        let growScriptInfo: RunningScript = ns.getRunningScript(GROW_SCRIPT, host);
        if (growScriptInfo && growScriptInfo.threads > 0) {

            let growTarget = growScriptInfo.args[0];
            let growTask = taskList.find(t => t.hostname === growTarget);
            if (!growTask) {
                growTask = {
                    hostname: growTarget,
                    taskType: 'grow',
                    threadsNeeded: getThreadsNeededToGrowHost(ns, growTarget),
                    allocatedThreads: []
                };
            }
            if (!growTask.allocatedThreads.find(t => t.pid === growScriptInfo.pid)) {
                ns.print(`${host} was running ${GROW_SCRIPT} and we didn't know about it! Logging it`, growScriptInfo);

                growTask.allocatedThreads.push({
                    hostname: growScriptInfo.server,
                    pid: growScriptInfo.pid,
                    threadCount: growScriptInfo.threads
                });
            }

        }

        //look for HACK_SCRIPT
        let hackScriptInfo: RunningScript = ns.getRunningScript(HACK_SCRIPT, host);
        if (hackScriptInfo && hackScriptInfo.threads > 0) {

            let hackTarget = hackScriptInfo.args[0];
            let hackTask = taskList.find(t => t.hostname === hackTarget);

            if (!hackTask) {
                hackTask = {
                    hostname: hackTarget,
                    taskType: 'hack',
                    threadsNeeded: getThreadsNeededToHackAllHost(ns, hackTarget),
                    allocatedThreads: []
                };
            }

            //if we don't already know about this process, log it
            if (!hackTask.allocatedThreads.find(t => t.pid === hackScriptInfo.pid)) {
                ns.print(`${host} was running ${HACK_SCRIPT} and we didn't know about it! Logging it`, hackScriptInfo);

                hackTask.allocatedThreads.push({
                    hostname: hackScriptInfo.server,
                    pid: hackScriptInfo.pid,
                    threadCount: hackScriptInfo.threads
                });
            }

        }
    }

}

function getNumRunningThreads(ns: NS, serverInfo: ServerInfo, type: TaskType): number {
    let threads = 0;

    let tasks = taskList.filter(t => t.hostname === serverInfo.hostname && t.taskType == type);

    tasks.forEach(t => {
        t.allocatedThreads.forEach(allocThread => {
            threads += allocThread.threadCount;
        });
    });

    return threads;
}

function getThreadsNeededForTask(ns: NS, serverInfo: ServerInfo, taskType: TaskType): number {
    if (taskType === 'grow') {
        return getThreadsNeededToGrow(ns, serverInfo);
    } else if (taskType === 'hack') {
        return getThreadsNeededToHack(ns, serverInfo, HACK_FRACTION_INITIAL);
    } else if (taskType === 'weaken') {
        return getThreadsNeededToWeaken(ns, serverInfo);
    } else {
        return 0;
    }
}

function getThreadsNeededToWeaken(ns: NS, serverInfo: ServerInfo): number {
    let secLevelToWeaken = (serverInfo.currSecurity ?? 0) - (serverInfo.minSecurity ?? 0);

    let threadsPerSecLevel = 1 / ns.weakenAnalyze(1);

    let totalThreadsNeeded = Math.ceil(secLevelToWeaken * threadsPerSecLevel);

    return totalThreadsNeeded;

}

function getThreadsNeededToGrow(ns: NS, target: ServerInfo): number {
    //example
    //max = 1000
    //curr = 250    
    //needed = 1000-250 = 750
    //growthMultiplier = (750/250)+1 = (3)+1 = 4

    let neededMoney = target.maxMoney - target.currMoney;

    let growthMultiplier = (neededMoney / (target.currMoney || 1)) + 1;

    let threadsNeeded = Math.ceil(ns.growthAnalyze(target.hostname, growthMultiplier));
    return threadsNeeded;
}

function getThreadsNeededToHack(ns: NS, serverInfo: ServerInfo, fractionDesired: number): number {

    let serverMoney = ns.getServerMoneyAvailable(serverInfo.hostname);

    let minMoneyThreshold = getMinMoneyThreshold(ns, serverInfo);

    let fractionForOneThread = ns.hackAnalyze(serverInfo.hostname);

    //example
    //fractionDesired = 0.1 //I want to take 10% of what it currently has
    //fractionForOneThread 0.0025 //hacking with one thread will take 0.25% of current money
    //threadsNeeded = 0.1 / 0.0025 = 40 threads needed

    let threadsNeeded = fractionDesired / fractionForOneThread;

    return Math.ceil(threadsNeeded);

}

function getMinMoneyThreshold(ns: NS, serverInfo: ServerInfo): number {
    let minMoneyThreshold = (MIN_MONEY * serverInfo.minSecurity);

    return minMoneyThreshold;
}

function getThreadsNeededToHackAll(ns: NS, serverInfo: ServerInfo): number {

    let serverMoney = ns.getServerMoneyAvailable(serverInfo.hostname);

    let minMoneyThreshold = getMinMoneyThreshold(ns, serverInfo);

    let totalThreadsNeeded = Math.ceil(ns.hackAnalyzeThreads(serverInfo.hostname, serverMoney - minMoneyThreshold));

    return totalThreadsNeeded;

}


