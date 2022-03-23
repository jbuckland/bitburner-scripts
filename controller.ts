import { COMPANY_FACTIONS, HACK_FACTIONS, HOME, SCRIPTS, TOAST_DURATION, TOAST_VARIANT } from './consts';
import { NS } from './NetscriptDefinitions';
import { RunMode, ServerInfo, Task, TaskType } from './types';
import {
    formatBigNumber, getAllHosts, getAllServerInfo, getFirstAvailableRunnerForScript, getPriorityServers, getRandomId, getServerFreeRam,
    getThreadsAvailableForScript, getThreadsNeededToWeakenHost, hasJoinedDaedalus, hasRedPillInstalled, runGrow, runWeaken, timestamp
} from './utils';
import { getNumRunningThreads, getThreadsNeededForTask, updateTaskList } from './utils-controller';

const MIN_THREADS_TO_RUN = 5;

const MIN_MONEY_BEFORE_HACK: number = 0.8; //what percent of max money does a server need before we start hacking it?
const GROW_THRESHOLD: number = 0.9; //what percent of max to stop growing

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
            ns.scriptKill(SCRIPTS.share, hostname);
        }
    }

    while (true) {
        //await doPlayerAction(ns);

        if (hasRedPillInstalled(ns)) {

            if (ns.getPurchasedServers().length < ns.getPurchasedServerLimit()) {
                tryPurchaseServer();
                await normalMode();
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
                await normalMode();
            }

        } else {
            await normalMode();
        }

        /* if (ns.getPurchasedServers().length < ns.getPurchasedServerLimit()) {
             tryPurchaseServer();
             await normalMode();
         } else {
             await doGainHackExp();
         }
 */
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
                ns.toast(`${formatBigNumber(maxRam)}ram server purchased!`, TOAST_VARIANT.info, TOAST_DURATION);
                ns.run(SCRIPTS.addScripts);
            }

        }
    }

    async function doGainHackExp() {

        tryPurchaseServer();

        let target = 'joesguns'; //this is the best server I've found for pure exp
        /*
                    let growThreads = getThreadsNeededToGrowHost(ns, target);
                    growThreads = Math.min(growThreads, getThreadsAvailableForScript(ns, HOME, SCRIPTS.grow));
                    if (growThreads > 0) {
        
                        ns.print(`growing [${target}] with ${growThreads} threads using ${HOME}`);
                        runMyGrow(ns, HOME, target, growThreads);
                    }
        */
        let weakenThreads = getThreadsNeededToWeakenHost(ns, target);
        weakenThreads = Math.min(weakenThreads, getThreadsAvailableForScript(ns, HOME, SCRIPTS.weaken));
        if (weakenThreads > 0) {
            ns.print(`weakening [[${target}]] with ${weakenThreads} threads using ${HOME}`);
            runWeaken(ns, HOME, target, weakenThreads);
        }

        let hosts = getAllHosts(ns);
        for (let i = 0; i < hosts.length; i++) {
            let runner = hosts[i];

            let numThreads = getThreadsAvailableForScript(ns, runner, SCRIPTS.grow);
            numThreads = Math.min(numThreads, getThreadsAvailableForScript(ns, runner, SCRIPTS.grow));
            if (numThreads > 0) {
                ns.print(`growing [${target}] with ${numThreads} threads using ${runner}`);
                runGrow(ns, runner, target, numThreads);
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

                ns.scriptKill(SCRIPTS.hack, hostname);
                ns.scriptKill(SCRIPTS.weaken, hostname);
                ns.scriptKill(SCRIPTS.grow, hostname);

            } else {

                for (let j = 0; j < runningScripts.length; j++) {
                    let script = runningScripts[j];

                    if (script.filename !== SCRIPTS.share) {
                        ns.scriptKill(script.filename, hostname);

                    }

                }
            }

            let numThreads = getThreadsAvailableForScript(ns, hostname, SCRIPTS.share);

            if (numThreads > 0) {
                ns.exec(SCRIPTS.share, hostname, numThreads);
            }

            runningScripts.forEach(s => {
                if (s.filename === SCRIPTS.share) {
                    totalThreads += s.threads;
                }
            });

        }

        ns.print(`${timestamp()} Sharing ALL available server power!! (${totalThreads} threads)`);
        await ns.sleep(10000);
    }

    async function normalMode() {
        if (restart) {
            servers = getPriorityServers(ns, getAllServerInfo(ns));

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
        updateTaskList(ns, taskList);

        // starting with the easiest...    

        let target: ServerInfo = servers.pop()!;
        if (target) {
            if (debug) ns.print(`target is [${target.hostname}]`);

            //does it need to be weakened?
            if (target.currSecurity > target.minSecurity) {
                restart = await doTask(target, TaskType.weaken);

                // } else if (target.currMoney > (target.maxMoney * MIN_MONEY_BEFORE_HACK)) {
                //     restart = await doTask(target, 'hack');

            } else if (target.currMoney < target.maxMoney) {
                restart = await doTask(target, TaskType.grow);

            } else {
                restart = await doTask(target, TaskType.hack);
            }
        } else {

            if (extraTarget) {
                await doExtra(extraTarget);
            }

        }
    }

    async function doTask(target: ServerInfo, taskType: TaskType): Promise<boolean> {
        if (debug) ns.print(`doing task ${taskType}`);
        let actionPerformed = true;

        let taskScript = '';
        if (taskType === 'weaken') taskScript = SCRIPTS.weaken;
        else if (taskType === 'grow') taskScript = SCRIPTS.grow;
        else if (taskType === 'hack') taskScript = SCRIPTS.hack;

        let neededTaskThreads = getThreadsNeededForTask(ns, target, taskType);
        let currentTaskThreads = getNumRunningThreads(ns, taskList, target, taskType);

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

    //for when we run out of normal stuff to do, do SOMETHING!
    async function doExtra(target: ServerInfo) {
        if (debug) ns.print(`doing extra work!`);
        //if we ran out of servers to do stuff to, let's just grow the biggest server again

        let runner = getFirstAvailableRunnerForScript(ns, SCRIPTS.hack);

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
            let maxScriptRamCost = Math.max(
                ns.getScriptRam(SCRIPTS.hack, runner),
                ns.getScriptRam(SCRIPTS.weaken, runner),
                ns.getScriptRam(SCRIPTS.grow, runner)
            );

            //how many total threads could we run at that script cost?
            let freeRam = getServerFreeRam(ns, runner);

            let availableThreads = freeRam / maxScriptRamCost;

            let extraHackThreads = Math.floor(availableThreads * hackThreadRatio);
            let extraWeakenThreads = Math.floor(availableThreads * weakenThreadRatio);
            let extraGrowThreads = Math.floor(availableThreads * growThreadRatio);

            if (extraGrowThreads > 0) {
                ns.exec(SCRIPTS.grow, runner, extraGrowThreads, target.hostname, getRandomId());
            }

            if (extraWeakenThreads > 0) {
                ns.exec(SCRIPTS.weaken, runner, extraWeakenThreads, target.hostname, getRandomId());
            }

            if (extraHackThreads > 0) {
                ns.exec(SCRIPTS.hack, runner, extraWeakenThreads, target.hostname, getRandomId());
            }

            if (debug)
                ns.print(`${timestamp()} Runner: ${runner}, freeRam: ${Math.round(freeRam)}, availableThreads:${Math.round(availableThreads)}. Ratios: Grow:${growThreadRatio.toPrecision(
                    3)}, Weaken:${weakenThreadRatio.toPrecision(3)}, Hack:${hackThreadRatio.toPrecision(3)}`);

            ns.print(`${timestamp()} EXTRA GROW:${testExtraGrowThreads} WEAKEN:${extraWeakenThreads} HACK:${extraHackThreads} ${target.hostname} on ${runner}`);

        }
    }

}

