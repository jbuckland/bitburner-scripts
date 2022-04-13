import {DebugLevel} from 'lib/consts';
import {NS} from 'NetscriptDefinitions';
import {IDebugMessage} from 'types';
import {readDebugMessage, timestamp} from 'lib/utils';

export async function main(ns: NS) {
    const SLEEP_TIME = 2000;

    ns.tail();
    ns.disableLog('ALL');

    let flags = ns.flags([
        ['source', ''],
        ['level', '']
    ]);

    let sourceFilter: string | undefined;
    let levelFilter: DebugLevel | undefined;

    if (flags.source.length > 0) {
        sourceFilter = flags.source;
    }



    if (flags.level) {
        switch (flags.level.toString().toLowerCase()) {
            case 'info':
                levelFilter = DebugLevel.info;
            case 'warn':
                levelFilter = DebugLevel.warn;
            case 'error':
                levelFilter = DebugLevel.error;
            default:
                break;

        }
    }


    let prevInt = ns.getPlayer().intelligence;
    while (true) {

        ns.print(timestamp());

        let checkAgain = true;
        while (checkAgain) {
            let debugMsg = readDebugMessage(ns);
            if (debugMsg) {

                if (filtersMatch(debugMsg)) {
                    printMessage(debugMsg);
                }



            } else {
                checkAgain = false;
            }
            await ns.sleep(1);
        }


        await ns.sleep(SLEEP_TIME);
        let currInt = ns.getPlayer().intelligence;

        if (currInt > prevInt) {

            let diff = currInt - prevInt;

            ns.print(`INFO player intelligence increased by ${diff}! From ${prevInt} to ${currInt}`);

            prevInt = currInt;

        }
    }


    function filtersMatch(debugMsg: IDebugMessage): boolean {
        let shouldPrint = true;

        if (sourceFilter) {
            shouldPrint = shouldPrint && debugMsg.source.toLowerCase() === sourceFilter.toLowerCase();

        }

        if (levelFilter) {
            shouldPrint = shouldPrint && debugMsg.level == levelFilter;
        }

        return shouldPrint;
    }


    function printMessage(debugMsg: IDebugMessage) {

        let levelString = `${debugMsg.level.toUpperCase()}`;

        ns.print(`${timestamp(debugMsg.time)} ${levelString} [${debugMsg.source}] `, debugMsg.msg);
        if (debugMsg.extraData) {
            ns.print(`---`, debugMsg.extraData);
        }
    }


}
