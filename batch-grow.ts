import { EventType, PORTS } from './consts';
import { NS } from './NetscriptDefinitions';
import { ServerEvent } from './types';

export async function main(ns: NS) {
    let target = ns.args[0] as string;

    if (!target) {
        ns.print('ERROR! please specify a target!');
        ns.exit();
    }

    let delay = (ns.args[1] ?? 0) as number;

    let data: ServerEvent = {
        timestamp: new Date().getTime(),
        eventType: EventType.batchGrowStarted,
        hostname: ns.getHostname(),
        target: target,
        extra: JSON.stringify({ delay })
    };
    await ns.writePort(PORTS.batchStatus, JSON.stringify(data));

    await ns.sleep(delay);
    await ns.grow(target);

    data = {
        timestamp: new Date().getTime(),
        eventType: EventType.batchGrowComplete,
        hostname: ns.getHostname(),
        target: target
    };
    await ns.writePort(PORTS.batchStatus, JSON.stringify(data));

}