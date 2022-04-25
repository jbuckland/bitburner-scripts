import {IRamUsage} from '/old-controllers/home-controller';
import {
    CITY_FACTIONS,
    COMPANY_FACTIONS,
    CrimeMode,
    CYCLES_PER_SECOND,
    DARK_DATA,
    DebugLevel,
    DEFAULT_RAM_BUFFER,
    DEFAULT_TARGET_HACK_PERCENT,
    HACK_FACTIONS,
    HacknetMode,
    HOME,
    HOSTS,
    MIN_MONEY,
    NULL_PORT_DATA,
    playerControllers,
    PORTS,
    SCRIPTS,
    THE_RED_PILL
} from 'lib/consts';
import {ActiveFragment, NS, Player} from 'NetscriptDefinitions';
import {IDebugMessage, IFaction, IGlobalSettings, IServerNode, ITargetWorkInfo, RunnerInfo, ServerInfo} from 'types';

export function timerStart(ns: NS, label: string) {
    let settings = getSettings(ns);
    if (settings.debug) {
        console.time(label);
    }

}

export function timerEnd(ns: NS, label: string) {
    let settings = getSettings(ns);
    if (settings.debug) {
        console.timeEnd(label);
    }

}

export function debug(ns: NS, msg: string, ...data: any[]) {
    let settings = getSettings(ns);

    if (settings.debug) {
        ns.print(`${timestamp()} !DEBUG! ${msg}`, ...data);
    }
}

export function debugLog(ns: NS, debugLevel: DebugLevel, msg: string, ...data: any[]) {
    let debugMsg: IDebugMessage = {
        time: new Date().getTime(),
        source: ns.getScriptName(),
        msg: msg,
        level: debugLevel
    };
    if (data && data.length > 0) {
        debugMsg.extraData = data;
    }

    let blue = '#133854';
    let infoStyle = `color: #fff; background-color: ${blue}; padding: 2px 4px; border-radius: 2px`;
    let green = '#135702';
    let successStyle = `color: #fff; background-color: ${green}; padding: 2px 4px; border-radius: 2px`;

    let levelString = `${debugMsg.level.toUpperCase()}`;
    let consoleMsg = `${timestamp(debugMsg.time)} ${levelString} [${debugMsg.source}] `;
    if (debugLevel === DebugLevel.error) {
        console.error(consoleMsg, debugMsg.msg, data);
        console.trace();
    } else if (debugLevel === DebugLevel.warn) {
        console.warn(consoleMsg, debugMsg.msg, data);
        console.trace(consoleMsg, debugMsg.msg, data);
    } else if (debugLevel === DebugLevel.info) {
        console.info(`%c${consoleMsg} ${debugMsg.msg}`, infoStyle, data);
    } else {
        console.log(`%c${consoleMsg} ${debugMsg.msg}`, successStyle, data);
    }

    writeDebugMessage(ns, debugMsg);

}

export function longConnect(ns: NS, target: string) {
    let serverTree = getServerTree(ns);

    let targetNode = findServerNodeRecursive(serverTree, target);

    if (targetNode) {
        let path = getPathToServerNode(targetNode);

        //need Source 4 to run ns.singularity.connect()
        for (let i = 0; i < path.length; i++) {
            ns.singularity.connect(path[i]);
        }

    } else {
        debugLog(ns, DebugLevel.error, `could not find ${target}!`);
    }

}

export function getPathToServerNode(serverNode: IServerNode): string[] {

    //trace the parent's back until we get to HOME

    let currentNode: IServerNode | undefined = serverNode;
    let path: string[] = [];

    while (currentNode != undefined) {
        //add them to the front, so they wind up in the correct order
        path.unshift(currentNode.hostname);
        currentNode = currentNode.parent;
    }

    return path;
}

export function findServerNodeRecursive(currentNode: IServerNode, targetHostname: string): IServerNode | undefined {

    let targetNode: IServerNode | undefined = undefined;

    if (currentNode.hostname.toLowerCase() === targetHostname.toLowerCase()) {
        targetNode = currentNode;
    } else {

        for (let i = 0; i < currentNode.children.length; i++) {
            let childNode = currentNode.children[i];
            targetNode = findServerNodeRecursive(childNode, targetHostname);
            if (targetNode) {
                break;
            }
        }

    }

    return targetNode;

}

/**
 * gets the server node tree starting with HOME
 */
export function getServerTree(ns: NS): IServerNode {
    let rootNode: IServerNode = {hostname: HOME, children: []};
    rootNode.children = getChildrenRecursive(rootNode);

    return rootNode;

    function getChildrenRecursive(currNode: IServerNode): IServerNode[] {
        let childrenNodes: IServerNode[] = [];

        let childrenNames = ns.scan(currNode.hostname);

        for (let i = 0; i < childrenNames.length; i++) {
            let childName = childrenNames[i];

            if (childName !== currNode.parent?.hostname) {
                let childNode: IServerNode = {
                    hostname: childName,
                    parent: currNode,
                    children: []
                };

                childNode.children = getChildrenRecursive(childNode);

                childrenNodes.push(childNode);
            }

        }

        return childrenNodes;

    }

}

export function getPlayerControllerScript2(ns: NS): string | undefined {

    for (const controller of playerControllers) {
        controller.ramReq = ns.getScriptRam(controller.scriptName);
    }

    playerControllers.sort((a, b) => {
        return b.ramReq - a.ramReq;
    });

    //find the first one that's runnable based on home computer ram
    let homeRam = ns.getServerMaxRam(HOME);

    let buffer = getSettings(ns).ramBuffer ?? 0;

    let controllerScript = playerControllers.find(c => c.ramReq + buffer < homeRam)?.scriptName;

    if (!controllerScript) {
        debugLog(ns, DebugLevel.error, `Could not determine which player-controller script to use!`);
    }

    return controllerScript;

}

export function getReservedHomeRam(ns: NS) {
    //which player controller 'could' we run?

    let ramForController = 0;

    //let controller = getPlayerControllerScript(ns);
    //if (controller) {
    //    let isRunning = ns.isRunning(controller, HOME);
    //    if (!isRunning) {
    //        ramForController = ns.getScriptRam(controller);
    //    }
    //}

    //reserve enough for that, plus some amount
    let buffer = getSettings(ns).ramBuffer ?? 0;
    return ramForController + buffer;
}

export function getFirstRunnerWithFreeRam(ns: NS, amountFree: number): string | undefined {
    let availableRunnerName: string | undefined;

    let runners: RunnerInfo[] = getAllRunners(ns);

    runners.sort((a, b) => {
        return b.freeRam - a.freeRam;
    });

    for (let i = 0; i < runners.length; i++) {
        let runner = runners[i];

        if (runner.freeRam >= amountFree) {
            availableRunnerName = runner.hostname;
        }
    }

    return availableRunnerName;

}

export function filterFirstAvailableRunnerForScriptThreads(ns: NS, runners: RunnerInfo[], scriptName: string, threadCount: number): RunnerInfo | undefined {

    threadCount = Math.ceil(threadCount);

    let availableRunner = undefined;

    runners.sort((a, b) => {
        return b.freeRam - a.freeRam;
    });

    /*
    let simpleRunnerInfo = runners.map(r => {        return {name: r.hostname, freeRam: r.freeRam};    });
    debugLog(ns, DebugLevel.info, `Runner List:`, simpleRunnerInfo);
*/
    for (let i = 0; i < runners.length; i++) {
        let runner = runners[i];

        let ramNeeded = ns.getScriptRam(scriptName, runner.hostname) * threadCount;

        if (ramNeeded > 0) {
            if (runner.freeRam >= ramNeeded) {
                availableRunner = runner;
                break;
            } else {

            }
        } else {
            debugLog(ns, DebugLevel.error, `ns.getScriptRam('${scriptName}', '${runner.hostname}') returned 0!`);
        }

    }
    return availableRunner;
}

/**
 * Returns the first host that can run at least one instance of the script
 * @param ns
 * @param scriptName
 */
export function getFirstAvailableRunnerForScript(ns: NS, scriptName: string): string | undefined {
    let runners: RunnerInfo[] = getAllRunners(ns);
    return filterFirstAvailableRunnerForScriptThreads(ns, runners, scriptName, 1)?.hostname;
}

export function getFirstAvailableRunnerForScriptNoPurchased(ns: NS, scriptName: string): string | undefined {
    let runners: RunnerInfo[] = getAllRunnersNoPurchased(ns);
    return filterFirstAvailableRunnerForScriptThreads(ns, runners, scriptName, 1)?.hostname;
}

export function indent(count: number = 1): string {
    return ' '.repeat(count) + '* ';
}

export function timestamp(time: number = 0): string {

    let date = new Date();
    if (time > 0) {
        date.setTime(time);
    }

    let hourString = date.getHours().toString().padStart(2, '0');
    let minString = date.getMinutes().toString().padStart(2, '0');
    let secString = date.getSeconds().toString().padStart(2, '0');
    let msString = date.getMilliseconds().toString().padStart(3, '0');

    let timeString = `|${hourString}:${minString}:${secString}:${msString}|`;
    return timeString;

}

export function getServerInfo(ns: NS, host: string) {
    let hasRoot = ns.hasRootAccess(host);
    let growthParam = ns.getServerGrowth(host);
    let minSecurity = ns.getServerMinSecurityLevel(host);
    let currSecurity = ns.getServerSecurityLevel(host);
    let currMoney = ns.getServerMoneyAvailable(host);
    let weakenTime = ns.getWeakenTime(host);
    let maxMoney = ns.getServerMaxMoney(host);
    let reqHackSkill = ns.getServerRequiredHackingLevel(host);
    let hackTime = ns.getHackTime(host);
    let growTime = ns.getGrowTime(host);

    let info: ServerInfo = {
        hostname: host,
        hasRoot,
        growthParam,
        minSecurity,
        currSecurity,
        currMoney,
        weakenTime,
        maxMoney: maxMoney,
        reqHackSkill,
        hackTime,
        growTime,
        targetValue: 0
    };

    info.targetValue = getTargetValue(ns, info);

    return info;
}

export function getAllRunnerNamesNoPurchased(ns: NS): string[] {
    return getRunnerNames(ns, HOSTS);
}

export function getAllRunnerNames(ns: NS): string[] {
    let hosts = getAllHosts(ns);
    return getRunnerNames(ns, hosts);
}

export function getRunnerNames(ns: NS, hostnames: string[]) {
    let runnerNames: string[] = [];

    for (let host of hostnames) {
        if (ns.hasRootAccess(host) && ns.getServerMaxRam(host) > 0) {
            runnerNames.push(host);
        }
    }
    return runnerNames;
}

export function getAllRunnersNoPurchased(ns: NS): RunnerInfo[] {
    let hosts = getAllRunnerNamesNoPurchased(ns);
    return filterRunners(ns, hosts);
}

export function getAllRunners(ns: NS): RunnerInfo[] {
    let hostnames = getAllRunnerNames(ns);
    return filterRunners(ns, hostnames);
}

export function getHacknetRunners(ns: NS): RunnerInfo[] {
    ns.hacknet.numNodes();

    return [];
}

export function filterRunners(ns: NS, hostNames: string[]) {
    let runners: RunnerInfo[] = [];
    for (let i = 0; i < hostNames.length; i++) {
        let hostname = hostNames[i];

        let runner = {
            hostname: hostname,
            freeRam: getServerFreeRam(ns, hostname)
        };
        if (runner.hostname === HOME) {
            let adjustedFreeRam = Math.max(0, (runner.freeRam - getReservedHomeRam(ns)));
            runner.freeRam = adjustedFreeRam;
        }

        runners.push(runner);

    }
    return runners;
}

export function makeServerInfo(ns: NS, hostNames: string[]): ServerInfo[] {
    let serverInfo = [];

    for (let hostName of hostNames) {
        serverInfo.push(getServerInfo(ns, hostName));
    }
    return serverInfo;
}

export function getAllServerInfo(ns: NS): ServerInfo[] {
    return makeServerInfo(ns, getAllHosts(ns));
}

export function getAllTargetInfo(ns: NS): ServerInfo[] {
    return makeServerInfo(ns, HOSTS);
}

export function getRandomId(): string {
    return Math.floor(Math.random() * 10000000).toString(36);
}

export function getServerFreeRam(ns: NS, hostname: string) {
    return ns.getServerMaxRam(hostname) - ns.getServerUsedRam(hostname);
}

export function getThreadsNeededToGrowHost(ns: NS, hostname: string): number {
    //example
    //max = 1000
    //curr = 250
    //needed = 1000-250 = 750
    //growthMultiplier = (750/250)+1 = (3)+1 = 4

    let currMoney = ns.getServerMoneyAvailable(hostname);

    let neededMoney = ns.getServerMaxMoney(hostname) - currMoney;

    let growthMultiplier = (neededMoney / (currMoney)) + 1;
    growthMultiplier = Math.min(growthMultiplier, 9999999);

    //console.log(`getThreadsNeededToGrow()`, growthMultiplier);
    let threadsNeeded = Math.ceil(ns.growthAnalyze(hostname, growthMultiplier));
    return threadsNeeded;
}

export function getThreadsNeededToHackAllHost(ns: NS, hostname: string): number {

    let serverMoney = ns.getServerMoneyAvailable(hostname);

    let minMoneyThreshold = getMinMoneyThresholdHost(ns, hostname);

    let totalThreadsNeeded = Math.ceil(ns.hackAnalyzeThreads(hostname, serverMoney - minMoneyThreshold));

    ns.print(`${hostname} has \$${serverMoney}, Threads needed to hack all=${totalThreadsNeeded}`);

    return totalThreadsNeeded;

}

export function getMinMoneyThresholdHost(ns: NS, hostname: string): number {
    let minSec = ns.getServerMinSecurityLevel(hostname);
    let minMoneyThreshold = (MIN_MONEY * minSec);

    return minMoneyThreshold;
}

export function getAllFactions(): IFaction[] {

    let factions = [
        ...Object.values(CITY_FACTIONS),
        ...Object.values(HACK_FACTIONS),
        COMPANY_FACTIONS.nwo

    ];

    return factions;
}



export function getUnownedFactionAugmentations(ns: NS, factionName: string): string[] {
    let factionAugments = ns.singularity.getAugmentationsFromFaction(factionName);
    let myAugments = ns.singularity.getOwnedAugmentations(true);

    let remainingFactionAugments = factionAugments.filter(a => !myAugments.includes(a));
    return remainingFactionAugments;
}


export function getThreadsAvailableForRamUse(ns: NS, hostname: string, scriptRamUsage: number) {

    let hostFreeRam = getServerFreeRam(ns, hostname);

    //Hack to reserve some free ram on HOME
    if (hostname === HOME) {
        hostFreeRam = Math.max(0, hostFreeRam - getReservedHomeRam(ns));
    }


    return Math.floor(hostFreeRam / scriptRamUsage);

}

export function getThreadsAvailableForScript(ns: NS, hostname: string, scriptName: string) {

    let hostFreeRam = getServerFreeRam(ns, hostname);

    //Hack to reserve some free ram on HOME
    if (hostname === HOME) {
        hostFreeRam = Math.max(0, hostFreeRam - getReservedHomeRam(ns));
    }

    let scriptRamUsage = ns.getScriptRam(scriptName);

    return Math.floor(hostFreeRam / scriptRamUsage);

}

export function getThreadsNeededToWeakenHost(ns: NS, hostname: string): number {
    let currSec = ns.getServerSecurityLevel(hostname);
    let minSec = ns.getServerMinSecurityLevel(hostname);

    let secLevelToWeaken = (currSec ?? 0) - (minSec ?? 0);

    let threadsPerSecLevel = 1 / ns.weakenAnalyze(1);

    let totalThreadsNeeded = Math.ceil(secLevelToWeaken * threadsPerSecLevel);

    debug(ns, `${hostname} needs ${secLevelToWeaken} security weakened. Threads needed=${totalThreadsNeeded}`);

    return totalThreadsNeeded;

}

export function round(num: number, places: number = 0): number {

    let placeMultiplier = Math.pow(10, places);

    return Math.round(num * placeMultiplier) / placeMultiplier;
}

export function formatPercent(value: number, roundPlaces = 0): string {

    return `${round(value * 100, roundPlaces).toFixed(roundPlaces)}%`;

}

export function formatBigRam(value: number): string {
    let scaledValue = value;
    let letter = '';
    if (value > 1e6) {
        //display $x.ym
        letter = 'pb';
        scaledValue = scaledValue / 1e6;

    } else if (value > 1e3) {
        //display $x.yk
        letter = 'tb';
        scaledValue = scaledValue / 1e3;
    } else {
        letter = 'gb';
    }

    scaledValue = round(scaledValue, 1);

    return `${scaledValue}${letter}`;
}

export function formatBigTime(msecs: number): string {
    let scaledValue = msecs / 1000;
    let letter = '';
    if (scaledValue > 86400) {
        //display $x.ym
        letter = 'd';
        scaledValue = scaledValue / 86400;

    } else if (scaledValue > 3600) {
        //display $x.ym
        letter = 'h';
        scaledValue = scaledValue / 3600;

    } else if (scaledValue > 60) {
        //display $x.yk
        letter = 'm';
        scaledValue = scaledValue / 60;
    } else {
        letter = 's';

    }

    scaledValue = round(scaledValue, 1);

    return `${scaledValue}${letter}`;
}

export function formatCurrency(value: number, roundPlace: number = 0): string {

    return `\$${formatBigNumber(value, roundPlace)}`;
}

export function formatBigNumber(value: number, roundPlaces: number = 1): string {

    let scaledValue = value;
    let letter = '';
    if (value > (1e12)) {
        //display $x.ym
        letter = 'T';
        scaledValue = scaledValue / (1e12);

    } else if (value > (1e9)) {
        //display $x.ym
        letter = 'B';
        scaledValue = scaledValue / (1e9);

    } else if (value > 1e6) {
        //display $x.ym
        letter = 'M';
        scaledValue = scaledValue / 1e6;

    } else if (value > 1e3) {
        //display $x.yk
        letter = 'K';
        scaledValue = scaledValue / 1e3;
    } else {
        letter = '';

    }

    scaledValue = round(scaledValue, roundPlaces);

    return `${scaledValue.toFixed(roundPlaces)}${letter}`;
}

export function myFormatCurrency(value: number) {
    return `\$${formatBigNumber(value)}`;
}

export function makePriorityTargetList(ns: NS, serverList: ServerInfo[]): ServerInfo[] {
    let priorityList: ServerInfo[] = [...serverList];

    const player = ns.getPlayer();

    //remove servers we can't hack, or don't care about
    priorityList = priorityList.filter(serv => {
        return serv.hostname !== HOME &&
            serv.hasRoot &&
            serv.reqHackSkill <= player.hacking && serv.maxMoney > 0;
        //&&            serv.hackTime > 3000;
    });

    let tools = getPlayerTools(ns);
    if (tools.brute && tools.ftp && tools.http && tools.smtp) {
        priorityList = priorityList.filter(s => s.hostname !== 'n00dles');
    }

    priorityList.sort((a, b) => {
        return b.targetValue - a.targetValue; //this is directly proportional to weakenTime
    });

    return priorityList;
}

export function runChargeFragment(ns: NS, runner: string, fragment: ActiveFragment, numThreads: number) {
    return ns.exec(SCRIPTS.chargeFragment, runner, numThreads, fragment.x, fragment.y, getRandomId());
}

export function runHack(ns: NS, runner: string, target: string, numThreads: number): number {
    debug(ns, `HACK [${target}] with [${runner}] using ${numThreads} threads`);
    return ns.exec(SCRIPTS.hack, runner, numThreads, target, getRandomId());
}

export function runBatchHack(ns: NS, runner: string, target: string, numThreads: number, batchId: string, delayMs: number) {
    return ns.exec(SCRIPTS.batchHack, runner, numThreads, target, delayMs, batchId);
}

export function runWeaken(ns: NS, runner: string, target: string, numThreads: number) {
    debug(ns, `WEAKEN [${target}] with [${runner}] using ${numThreads} threads`);
    return ns.exec(SCRIPTS.weaken, runner, numThreads, target, getRandomId());
}

export function runBatchWeaken(ns: NS, runner: string, target: string, numThreads: number, batchId: string, delayMs: number) {
    return ns.exec(SCRIPTS.batchWeaken, runner, numThreads, target, delayMs, batchId);
}

export function runGrow(ns: NS, runner: string, target: string, numThreads: number) {
    debug(ns, `GROW [${target}] with [${runner}] using ${numThreads} threads`);
    return ns.exec(SCRIPTS.grow, runner, numThreads, target, getRandomId());
}

export function runBatchGrow(ns: NS, runner: string, target: string, numThreads: number, batchId: string, delayMs: number) {
    return ns.exec(SCRIPTS.batchGrow, runner, numThreads, target, delayMs, batchId);
}

export function hasAllPlayerTools(ns: NS) {

    let tools = getPlayerTools(ns);

    return tools.sql && tools.brute;

}

export function getPlayerTools(ns: NS) {
    let playersTools = {
        brute: ns.fileExists(DARK_DATA.tools.brute.name, HOME),
        ftp: ns.fileExists(DARK_DATA.tools.ftp.name, HOME),
        smtp: ns.fileExists(DARK_DATA.tools.smtp.name, HOME),
        http: ns.fileExists(DARK_DATA.tools.http.name, HOME),
        sql: ns.fileExists(DARK_DATA.tools.sql.name, HOME),
        alink: ns.fileExists(DARK_DATA.tools.alink.name, HOME),
        scan1: ns.fileExists(DARK_DATA.tools.scan1.name, HOME),
        scan2: ns.fileExists(DARK_DATA.tools.scan2.name, HOME),
        prof: ns.fileExists(DARK_DATA.tools.prof.name, HOME)
    };

    return playersTools;
}

export function getDonationNeededForReputation(ns: NS, desiredRep: number) {

    let donationNeeded = (1000000 * desiredRep) / ns.getPlayer().faction_rep_mult;

    return donationNeeded;
}

export function hasJoinedDaedalus(ns: NS): boolean {
    return ns.getPlayer().factions.includes(HACK_FACTIONS.daedalus.name);
}

export function hasRedPillInstalled(ns: NS): boolean {
    return ns.singularity.getOwnedAugmentations().includes(THE_RED_PILL);
}

export function getAllHosts(ns: NS): string[] {

    let hosts = HOSTS;
    let purchasedServers: string[] = ns.getPurchasedServers();

    let hacknetSevers = [];
    if (getSettings(ns).hacknetMode === HacknetMode.hacking) {
        let numNodes = ns.hacknet.numNodes();
        for (let i = 0; i < numNodes; i++) {
            hacknetSevers.push(ns.hacknet.getNodeStats(i).name);
        }

    }

    return [...hacknetSevers, ...purchasedServers, ...hosts];

}

export function calcTargetValue(ns: NS, hostname: string, currMoney: number, growTime: number) {
    let value = -1;

    //value = target.growthParam / (target.growTime / 1000);

    let moneyPerGrowThread = (currMoney * 0.1) / (ns.growthAnalyze(hostname, 1.1));
    let moneyPerGrowSecond = moneyPerGrowThread / growTime;
    value = moneyPerGrowSecond;

    return value;
}

export function getTargetValue(ns: NS, target: ServerInfo): number {
    let value = -1;

    //value = target.growthParam / (target.growTime / 1000);

    let moneyPerGrowThread = (target.currMoney * 0.1) / (ns.growthAnalyze(target.hostname, 1.1));
    let moneyPerGrowSecond = moneyPerGrowThread / target.growTime;
    value = moneyPerGrowSecond;

    return value;

}

export function getSettings(ns: NS): IGlobalSettings {
    //default settings

    let settings: IGlobalSettings = {
        autoStartWork: true,
        forceSwitchWork: true,
        debug: false,
        doRunnerWork: true,
        hackPercent: DEFAULT_TARGET_HACK_PERCENT,
        ramBuffer: DEFAULT_RAM_BUFFER,
        crimeMode: CrimeMode.money,
        hacknetMode: HacknetMode.money,
        maxHashCostBen: 2e9,
        moneyBuffer: 0
    };

    let settingsPort = ns.getPortHandle(PORTS.settings);

    let portData = settingsPort.peek();
    if (portData === NULL_PORT_DATA) {
        settingsPort.write(JSON.stringify(settings));
    } else {
        let storedSettings = JSON.parse(portData as string);
        settings = Object.assign(settings, storedSettings);
    }

    return settings;

}

export function setSettings(ns: NS, newSettings: IGlobalSettings): IGlobalSettings {

    let currSettings = getSettings(ns);

    let updatedSettings = Object.assign(currSettings, newSettings);

    //store in port
    let settingsPort = ns.getPortHandle(PORTS.settings);
    settingsPort.clear();
    settingsPort.write(JSON.stringify(updatedSettings));

    //store in file

    return updatedSettings;
}

export function readDebugMessage(ns: NS): IDebugMessage | undefined {
    let msg: IDebugMessage | undefined = undefined;

    let debugPort = ns.getPortHandle(PORTS.debug);
    let rawData = debugPort.read() as string;
    if (rawData && rawData !== NULL_PORT_DATA) {
        try {
            msg = JSON.parse(rawData) as IDebugMessage;
        } catch (error) {
            ns.print('ERROR! trying to read JSON data from debug port!', error, rawData);
        }

    }

    return msg;
}

export function writeDebugMessage(ns: NS, msg: IDebugMessage): any {
    let debugPort = ns.getPortHandle(PORTS.debug);
    let json = JSON.stringify(msg);
    return debugPort.write(json);
}

export function readTargetStats(ns: NS): ITargetWorkInfo[] {
    let rawData = ns.peek(PORTS.targetStats) as string;

    if (rawData !== NULL_PORT_DATA) {
        return JSON.parse(rawData) as ITargetWorkInfo[];
    } else {
        return [];
    }

}

export function writeTargetStats(ns: NS, currentWork: ITargetWorkInfo[]) {
    //ns.clearPort(PORTS.targetStats);
    let port = ns.getPortHandle(PORTS.targetStats);
    port.clear();
    port.write(JSON.stringify(currentWork));

}

export function runReset(ns: NS, force: boolean): number {
    let procId = -1;

    let runner = getFirstAvailableRunnerForScript(ns, SCRIPTS.reset);
    if (runner) {

        if (force) {
            procId = ns.exec(SCRIPTS.reset, runner, 1, 'force');
        } else {
            procId = ns.exec(SCRIPTS.reset, runner, 1);
        }

    }
    return procId;
}

export function runDonate(ns: NS, faction: string, amount: number) {
    let procId = -1;

    let scriptName = SCRIPTS.donate;

    let runner = getFirstAvailableRunnerForScript(ns, scriptName);
    if (runner) {
        procId = ns.exec(scriptName, runner, 1, faction, amount);
    }
    return procId;

}

export function getAllRamUsage(ns: NS): IRamUsage {
    let batchScripts: string[] = [
        SCRIPTS.batchWeaken,
        SCRIPTS.batchGrow,
        SCRIPTS.batchHack
    ];
    let hackScripts: string[] = [SCRIPTS.hack];
    let prepScripts: string[] = [
        SCRIPTS.grow,
        SCRIPTS.hack,
        SCRIPTS.weaken

    ];
    let shareScripts: string[] = [SCRIPTS.myShare];
    let expScripts: string[] = [SCRIPTS.expGain];
    let stanekScripts: string[] = [SCRIPTS.chargeFragment];

    let usage: IRamUsage = {
        batchRam: 0,
        hackRam: 0,
        expRam: 0,
        prepRam: 0,
        shareRam: 0,
        stanekRam: 0,
        totalMax: 0,
        totalUsed: 0,
        otherRam: 0,
        otherNames: []
    };

    let runners = getAllRunnerNames(ns);

    for (const runner of runners) {
        let currRunnerMaxRam = ns.getServerMaxRam(runner);
        let currRunnerUsedRam = 0;

        let procs = ns.ps(runner);

        procs.forEach(p => {
            let ramUse = ns.getScriptRam(p.filename, runner) * p.threads;
            currRunnerUsedRam += ramUse;

            if (batchScripts.includes(p.filename)) {
                usage.batchRam += ramUse;
            } else if (hackScripts.includes(p.filename)) {
                usage.hackRam += ramUse;
            } else if (expScripts.includes(p.filename)) {
                usage.expRam += ramUse;
            } else if (prepScripts.includes(p.filename)) {
                usage.prepRam += ramUse;
            } else if (shareScripts.includes(p.filename)) {
                usage.shareRam += ramUse;
            } else if (stanekScripts.includes(p.filename)) {
                usage.stanekRam += ramUse;
            } else {
                usage.otherRam += ramUse;
                usage.otherNames.push(p.filename);
            }

        });

        usage.totalMax += currRunnerMaxRam;
        usage.totalUsed += currRunnerUsedRam;

    }

    return usage;
}

export function logBase(base: number, value: number) {
    return Math.log(value) / Math.log(base);
}

export function getHacknetHashGain(ns: NS) {
    let numHacknetNodes = ns.hacknet.numNodes();
    let totalHashGain = 0;
    for (let i = 0; i < numHacknetNodes; i++) {
        let nodeInfo = ns.hacknet.getNodeStats(i);
        totalHashGain += nodeInfo.production;
    }
    return totalHashGain;
}

export function getHacknetIncome(ns: NS) {
    //you get $1m for 4 hashes
    return (getHacknetHashGain(ns) / 4) * 1e6;
}

export function myGetScriptIncome(ns: NS) {
    let scriptMoney = ns.getScriptIncome();
    return scriptMoney[0];

}

export function getTotalIncome(ns: NS): number {
    return getGangIncome(ns) + myGetScriptIncome(ns) + getHacknetIncome(ns);
}

export function getGangIncome(ns: NS) {
    if (ns.gang.inGang()) {
        return ns.gang.getGangInformation().moneyGainRate * CYCLES_PER_SECOND;
    } else {
        return 0;
    }

}

export function getAvailablePlayerMoney(ns: NS, player: Player, settings: IGlobalSettings) {
    return Math.max(0, player.money - (settings.moneyBuffer ?? 0));
}

export interface IFactionInfo {
    name: string,
    reputation: number,
    favor: number
}

export function getPlayerFactionInfo(ns: NS): IFactionInfo[] {
    let player = ns.getPlayer();

    let playerFactions: IFactionInfo[] = [];
    player.factions.forEach(factionName => {

        let info: IFactionInfo = {
            name: factionName,
            reputation: ns.singularity.getFactionRep(factionName),
            favor: ns.singularity.getFactionFavor(factionName)
        };

        playerFactions.push(info);

    });

    return playerFactions;
}

export function myIsBusy(ns: NS): boolean {

    let defaultIsBusy = ns.singularity.isBusy();

    let bbIsBusy = false;

    let NAME_OF_THAT_ONE_AUGMENT = 'banana';
    let playerHasThatOneAugment = ns.singularity.getOwnedAugmentations().includes(NAME_OF_THAT_ONE_AUGMENT);

    //if we don't have that one augment, then we need to check if the player is doing a BB action
    if (!playerHasThatOneAugment) {
        bbIsBusy = ns.bladeburner.getCurrentAction().type !== 'idle';
    }

    return defaultIsBusy || bbIsBusy;
}



export interface ITiming {
    name: string;
    start: number;
    end: number;
    duration: number;
    runCount: number;

}


export class Timer {
    constructor(private parent: any) {
    }

    public timings: { [key: string]: ITiming } = {};

    /**
     * Starts a timer. If a timer with the same name already exists, it will reset the start time.
     * @param name
     */
    public startTimer(name: string) {
        let timer = this.timings[name];
        if (!timer) {
            timer = {
                name: name,
                start: 0,
                end: 0,
                duration: 0,
                runCount: 0
            };
            this.timings[name] = timer;
        }
        timer.start = new Date().getTime();


    }

    public stopTimer(name: string) {
        let timer = this.timings[name];
        if (timer) {
            timer.end = new Date().getTime();
            timer.duration += timer.end - timer.start;

            timer.runCount++;
            timer.start = 0;
        }

    }

    public getTimer(name: string): ITiming | undefined {
        return this.timings[name];
    }



    public logAll() {
        console.log(`Timers for: ${this.parent.constructor.name}`);
        Object.values(this.timings).forEach(timing => {
            if (timing.runCount > 1) {
                console.log(`[${timing.name}]: Avg: ${timing.duration / timing.runCount}ms, Total: ${timing.duration}ms, Count: ${timing.runCount}`);
            } else {
                console.log(`[${timing.name}]: ${timing.duration}ms`);
            }

        });
    }

    public printAll(ns: NS) {
        ns.print(`Timer Info:`);
        Object.values(this.timings).forEach(timing => {
            if (timing.runCount > 1) {
                ns.print(`[${timing.name}]: Avg: ${round(timing.duration / timing.runCount, 2)}ms, Total: ${round(timing.duration, 2)}ms, Count: ${timing.runCount}`);
            } else {
                ns.print(`[${timing.name}]: ${round(timing.duration, 2)}ms`);
            }

        });
    }


    public resetAll() {
        this.timings = {};
    }


}


export function convertBool(value: string): boolean | undefined {

    if (value === 'true') {
        return true;
    } else if (value === 'false') {
        return false;
    } else {
        return undefined;
    }
}


export class ValueGainAverage {
    private expEntries: { time: number, value: number }[] = [];

    public averageDuration: number = 120000;

    public addEntry(value: number) {
        this.expEntries.push({time: new Date().getTime(), value: value});
    }

    public getAverage(): number {
        let avgValueGain = 0;

        let now = new Date().getTime();
        this.expEntries = this.expEntries.filter(e => now - e.time < this.averageDuration);
        this.expEntries.sort((a, b) => a.time - b.time);


        if (this.expEntries.length > 1) {
            let longestAgo = this.expEntries[0];
            let mostRecent = this.expEntries[this.expEntries.length - 1];

            let duration = (mostRecent.time - longestAgo.time) / 1000.0;
            let valueGain = mostRecent.value - longestAgo.value;
            avgValueGain = valueGain / duration;
        }

        return avgValueGain;

    }

}
