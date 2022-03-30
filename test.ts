import {NS} from './NetscriptDefinitions';
import {doBatchFromRequestMultiRunner} from "./batch";
import {IBatchRequest} from "./types";

export async function main(ns: NS) {
    ns.tail();

    ns.disableLog('ALL');
    ns.clearLog();


    let request: IBatchRequest = {
        batchId: 1234567,
        hackThreadCount: 222,
        weakenThreadsNeededFromHack: 233,
        growThreadsNeeded: 244,
        weakenThreadsNeededFromGrow: 255,
        weakenTime: 0,
        totalRamNeeded: 0,
        hackTime: 0,
        growTime: 0,
        target: 'BananaTarget',
        delayUntilHack: 122,
        delayUntilWeakenHack: 133,
        delayUntilGrow: 144,
        delayUntilWeakenGrow: 155
    }

    doBatchFromRequestMultiRunner(ns, request);


    //ns.print(timestamp());


}






