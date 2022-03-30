import {NS} from './NetscriptDefinitions';

export async function main(ns: NS) {
    let target = ns.args[0] as string;

    let flags = ns.flags([['loop', false]]);

    if (!target) {
        ns.print('ERROR! please specify a target!');
        ns.exit();
    }
    do {
        let results = await ns.hack(target);

        /*     let extraString = `hacked ${myFormatCurrency(results)}`;

             let data: ServerEvent = {
                 timestamp: new Date().getTime(),
                 eventType: EventType.hackComplete,
                 hostname: ns.getHostname(),
                 target: target,
                 extra: extraString
             };

             let bumpedData = await ns.writePort(PORTS.scriptCom, JSON.stringify(data));
             if (bumpedData) {
                 //ns.print(`${ns.getScriptName()} did writePort(SCRIPT_COMM_PORT), but bumped data!`, bumpedData);
             }*/

    } while (flags.loop);

}
