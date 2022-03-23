import { EventType, PORTS } from './consts';
import { NS } from './NetscriptDefinitions';
import { ServerEvent } from './types';
import { round } from './utils';

export async function main(ns: NS) {
    let target = ns.args[0] as string;

    let flags = ns.flags([['loop', false]]);

    if (!target) {
        ns.print('ERROR! please specify a target!');
        ns.exit();
    }

    do {
        let results = await ns.weaken(target);

        let extraString = `security weakened by ${round(results, 2)}`;

        let data: ServerEvent = {
            timestamp: new Date().getTime(),
            eventType: EventType.weakenComplete,
            hostname: ns.getHostname(),
            target: target,
            extra: extraString
        };

        let bumpedData = await ns.writePort(PORTS.scriptCom, JSON.stringify(data));
        if (bumpedData) {
            ns.print(`${ns.getScriptName()} did writePort(SCRIPT_COMM_PORT), but bumped data!`, bumpedData);
        }

    } while (flags.loop);

}