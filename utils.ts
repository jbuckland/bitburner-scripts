import {
    CITY_FACTIONS,
    COMPANY_FACTIONS,
    DARK_DATA,
    DebugLevel,
    DEFAULT_RAM_BUFFER,
    DEFAULT_TARGET_HACK_PERCENT,
    HACK_FACTIONS,
    HOME,
    HOSTS,
    MIN_MONEY,
    NULL_PORT_DATA,
    PORTS,
    SCRIPTS,
    THE_RED_PILL
} from './consts';
import {NS} from './NetscriptDefinitions';
import {IDebugMessage, IFaction, IGlobalSettings, IServerNode, ITargetWorkInfo, RunnerInfo, ServerInfo} from './types';


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


    writeDebugMessage(ns, debugMsg);

}

export function longConnect(ns: NS, target: string) {
    let serverTree = getServerTree(ns);

    let targetNode = findServerNodeRecursive(serverTree, target);

    if (targetNode) {
        let path = getPathToServerNode(targetNode);

        //need Source 4 to run ns.connect()
        for (let i = 0; i < path.length; i++) {
            ns.connect(path[i]);
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

export function getNextPlayerControllerScript(ns: NS): string | undefined {

    let nextScript: string | undefined;


    let currScript = getPlayerControllerScript(ns);


    return nextScript;
}

export function getPlayerControllerScript(ns: NS): string | undefined {


    let playerControllers: { name: string, ramReq: number, isRunning: boolean }[] = [
        {name: SCRIPTS.playerController, ramReq: 0, isRunning: false},
        {name: SCRIPTS.playerController0, ramReq: 0, isRunning: false},
        {name: SCRIPTS.playerController1, ramReq: 0, isRunning: false},
        {name: SCRIPTS.playerController2, ramReq: 0, isRunning: false}
    ];

    for (let i = 0; i < playerControllers.length; i++) {
        const controller = playerControllers[i];
        controller.ramReq = ns.getScriptRam(controller.name);
        controller.isRunning = ns.isRunning(controller.name, HOME);
    }

    playerControllers.sort((a, b) => {
        return b.ramReq - a.ramReq;
    });

    //find the first one that's runnable based on home computer ram
    let homeRam = ns.getServerMaxRam(HOME);

    let buffer = getSettings(ns).ramBuffer ?? 0;


    let controllerScript = playerControllers.find(c => c.ramReq + buffer < homeRam)?.name;

    if (!controllerScript) {
        debugLog(ns, DebugLevel.error, `Could not determine which player-controller script to use!`);
    }

    return controllerScript;

}

export function getReservedHomeRam(ns: NS) {
    //which player controller 'could' we run?

    let controller = getPlayerControllerScript(ns);

    let ramForController = 0;

    if (controller) {
        let isRunning = ns.isRunning(controller, HOME);
        if (!isRunning) {
            ramForController = ns.getScriptRam(controller);
        }
    }

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

/**
 * Returns the first host that can run the script with the thread count
 * @param ns
 * @param scriptName
 * @param threadCount will round up to next integer
 */
export function getFirstAvailableRunnerForScriptThreads(ns: NS, scriptName: string, threadCount: number): string | undefined {

    threadCount = Math.ceil(threadCount);

    let availableHost = undefined;

    let runners: RunnerInfo[] = getAllRunners(ns);

    runners.sort((a, b) => {
        return b.freeRam - a.freeRam;
    });

    for (let i = 0; i < runners.length; i++) {
        let runner = runners[i];

        let ramNeeded = ns.getScriptRam(scriptName, runner.hostname) * threadCount;

        if (ramNeeded > 0) {
            if (runner.freeRam >= ramNeeded) {
                availableHost = runner;
                break;
            } else {

            }
        } else {
            debugLog(ns, DebugLevel.error, `ns.getScriptRam('${scriptName}', '${runner.hostname}') returned 0!`);
        }

    }
    if (availableHost) {
        return availableHost.hostname;
    } else {
        return undefined;

    }

}

/**
 * Returns the first host that can run at least one instance of the script
 * @param ns
 * @param scriptName
 */
export function getFirstAvailableRunnerForScript(ns: NS, scriptName: string): string | undefined {
    return getFirstAvailableRunnerForScriptThreads(ns, scriptName, 1);
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

export function getAllRunnerNames(ns: NS): string[] {
    let runnerNames: string[] = [];

    let hosts = getAllHosts(ns);

    for (let i = 0; i < hosts.length; i++) {
        let host = hosts[i];

        if (ns.hasRootAccess(host) && ns.getServerMaxRam(host) > 0) {
            runnerNames.push(host);
        }

    }
    return runnerNames;
}

export function getAllRunners(ns: NS): RunnerInfo[] {
    let runners: RunnerInfo[] = [];

    let hosts = getAllRunnerNames(ns);

    for (let i = 0; i < hosts.length; i++) {
        let hostname = hosts[i];

        let runner = {
            hostname: hostname,
            freeRam: getServerFreeRam(ns, hostname)
        }
        if (runner.hostname === HOME) {
            let adjustedFreeRam = Math.max(0, (runner.freeRam - getReservedHomeRam(ns)))
            runner.freeRam = adjustedFreeRam
        }

        runners.push(runner);

    }
    return runners;
}

export function getAllServerInfo(ns: NS): ServerInfo[] {
    let serverInfo = [];

    for (let i = 0; i < getAllHosts(ns).length; i++) {
        let host = getAllHosts(ns)[i];
        serverInfo.push(getServerInfo(ns, host));
    }

    return serverInfo;
}

export function getRandomId(): number {
    return Math.floor(Math.random() * 100000);
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

export function hasRemainingAugmentionsToBuy(ns: NS) {
    let hasMoreAugs = false;

    let allFactions = getAllFactions();

    for (let i = 0; i < allFactions.length; i++) {
        let faction = allFactions[i];

        if (getRemainingFactionAugmentations(ns, faction.name).length > 0) {
            hasMoreAugs = true;
            break;
        }
    }
    return hasMoreAugs;
}

export function getRemainingFactionAugmentations(ns: NS, factionName: string) {
    let factionAugments = ns.getAugmentationsFromFaction(factionName);
    let myAugments = ns.getOwnedAugmentations(true);

    let remainingFactionAugments = factionAugments.filter(a => !myAugments.includes(a));
    return remainingFactionAugments;
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

export function formatBigTime(value: number): string {
    let scaledValue = value / 1000;
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

    return `${scaledValue}${letter}`;
}

export function myFormatCurrency(value: number) {
    return `\$${formatBigNumber(value)}`;
}

export function getPriorityServers(ns: NS, serverList: ServerInfo[]): ServerInfo[] {
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

export function runHack(ns: NS, runner: string, target: string, numThreads: number) {
    debug(ns, `HACK [${target}] with [${runner}] using ${numThreads} threads`);
    return ns.exec(SCRIPTS.hack, runner, numThreads, target, getRandomId());
}

export function runBatchHack(ns: NS, runner: string, target: string, numThreads: number, batchId: number, delayMs: number) {
    return ns.exec(SCRIPTS.batchHack, runner, numThreads, target, delayMs, batchId);
}

export function runWeaken(ns: NS, runner: string, target: string, numThreads: number) {
    debug(ns, `WEAKEN [${target}] with [${runner}] using ${numThreads} threads`);
    return ns.exec(SCRIPTS.weaken, runner, numThreads, target, getRandomId());
}

export function runBatchWeaken(ns: NS, runner: string, target: string, numThreads: number, batchId: number, delayMs: number) {
    return ns.exec(SCRIPTS.batchWeaken, runner, numThreads, target, delayMs, batchId);
}

export function runGrow(ns: NS, runner: string, target: string, numThreads: number) {
    debug(ns, `GROW [${target}] with [${runner}] using ${numThreads} threads`);
    return ns.exec(SCRIPTS.grow, runner, numThreads, target, getRandomId());
}

export function runBatchGrow(ns: NS, runner: string, target: string, numThreads: number, batchId: number, delayMs: number) {
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
    return ns.getOwnedAugmentations().includes(THE_RED_PILL);
}


export function getAllHosts(ns: NS): string[] {

    let hosts = HOSTS;
    let purchasedServers: string[] = ns.getPurchasedServers();

    return [...purchasedServers, ...hosts];

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
        debug: false,
        hackPercent: DEFAULT_TARGET_HACK_PERCENT,
        ramBuffer: DEFAULT_RAM_BUFFER,
        expGain: false,
        share: true
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

    let settingsPort = ns.getPortHandle(PORTS.settings);
    settingsPort.clear();
    settingsPort.write(JSON.stringify(updatedSettings));

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
