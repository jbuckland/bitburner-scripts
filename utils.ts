import {
    CITY_FACTIONS, COMPANY_FACTIONS, DARK_DATA, GROW_SCRIPT, HACK_FACTIONS, HACK_SCRIPT, HOME, HOME_RESERVED_RAM, HOSTS, MIN_MONEY, THE_RED_PILL, WEAKEN_SCRIPT
} from './consts';
import { NS } from './NetscriptDefinitions';
import { IFaction, IServerNode, RunnerInfo, ServerInfo } from './types';

export function debug(ns: NS, msg: string) {
    ns.print(`${timestamp()} ${msg}`);
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
        ns.print(`ERROR! could not find ${target}!`);
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
    let rootNode: IServerNode = { hostname: HOME, children: [] };
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

/**
 * Returns the first host that can run the script with the thread count
 * @param ns
 * @param scriptName
 * @param threadCount will round up to next integer
 */
export function getFirstAvailableRunnerForScriptThreads(ns: NS, scriptName: string, threadCount: number): string | undefined {

    threadCount = Math.ceil(threadCount);

    let availableHost = undefined;

    let runners: RunnerInfo[] = [];

    for (let i = 0; i < getAllHosts(ns).length; i++) {
        let host = getAllHosts(ns)[i];
        runners.push({
            hostname: host,
            freeRam: getServerFreeRam(ns, host)
        });
    }

    runners.sort((a, b) => {
        return b.freeRam - a.freeRam;
    });

    for (let i = 0; i < runners.length; i++) {
        let runner = runners[i];
        if (ns.hasRootAccess(runner.hostname)) {

            let ramNeeded = ns.getScriptRam(scriptName, runner.hostname) * threadCount;

            //hack to reserve some ram on home
            if (runner.hostname == HOME) {
                runner.freeRam = Math.max(0, runner.freeRam -= HOME_RESERVED_RAM);
            }

            if (ramNeeded > 0) {
                if (runner.freeRam >= ramNeeded) {
                    availableHost = runner;
                    break;
                } else {

                }
            } else {
                ns.print(`ERROR! '${scriptName}' does not exist on ${runner.hostname}`);
            }

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

export function timestamp(): string {

    let time = new Date();

    let hourString = time.getHours().toString().padStart(2, '0');
    let minString = time.getMinutes().toString().padStart(2, '0');
    let secString = time.getSeconds().toString().padStart(2, '0');
    let msString = time.getMilliseconds().toString().padStart(3, '0');

    let timeString = `[${hourString}:${minString}:${secString}:${msString}]`;
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
        hackTime
    };
    return info;
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
        hostFreeRam = Math.max(0, hostFreeRam - HOME_RESERVED_RAM);
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

    ns.print(`${hostname} needs ${secLevelToWeaken} security weakened. Threads needed=${totalThreadsNeeded}`);

    return totalThreadsNeeded;

}

export function round(num: number, places: number): number {

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

export function formatBigNumber(value: number): string {

    let scaledValue = value;
    let letter = '';
    if (value > (1e9)) {
        //display $x.ym
        letter = 'B';
        scaledValue = scaledValue / (1e9);

    } else if (value > 1e6) {
        //display $x.ym
        letter = 'M';
        scaledValue = scaledValue / 1e6;

    } else {
        //display $x.yk
        letter = 'K';
        scaledValue = scaledValue / 1e3;
    }

    scaledValue = round(scaledValue, 1);

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
            serv.reqHackSkill <= player.hacking &&
            serv.maxMoney > 0 &&
            serv.hackTime > 3000;
    });

    if (player.hacking > 100) {
        priorityList = priorityList.filter(s => s.hostname !== 'n00dles');
    }

    priorityList.sort((a, b) => {
        return b.currSecurity - a.currSecurity; //this is directly proportional to weakenTime
    });
    /*
        if (player.hacking >= 3500) {
            priorityList = priorityList.filter(serv => {
                return serv.maxMoney > 1e10; //remove anything with less
            });
        } else if (player.hacking >= 3000) {
            priorityList = priorityList.filter(serv => {
                return serv.maxMoney > 1e9; //remove anything with less
            });
        } else if (player.hacking >= 2500) {
            priorityList = priorityList.filter(serv => {
                return serv.maxMoney > 1e8; //remove anything with less
            });
    
        }
    */
    return priorityList;
}

export function runMyHack(ns: NS, runner: string, target: string, numThreads: number) {
    return ns.exec(HACK_SCRIPT, runner, numThreads, target, getRandomId());
}

export function runMyWeaken(ns: NS, runner: string, target: string, numThreads: number) {
    return ns.exec(WEAKEN_SCRIPT, runner, numThreads, target, getRandomId());
}

export function runMyGrow(ns: NS, runner: string, target: string, numThreads: number) {
    return ns.exec(GROW_SCRIPT, runner, numThreads, target, getRandomId());
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

    return [...HOSTS, ...ns.getPurchasedServers()];

}



