import {NS} from './NetscriptDefinitions';

export async function main(ns: NS) {
    ns.tail();

    ns.disableLog('ALL');

    while (true) {
        ns.clearLog();

        ns.print(JSON.stringify(ns.getPlayer(), null, 4));
        await ns.sleep(500);
    }


}



