import { SCRIPT_COMM_PORT } from './consts';
import { NS } from './NetscriptDefinitions';
import { ServerEvent } from './types';

export async function main(ns: NS) {
    let target = ns.args[0] as string;

    let flags = ns.flags([['loop', false]]);
    let formatter = Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'

        // These options are needed to round to whole numbers if that's what you want.
        //minimumFractionDigits: 0, // (this suffices for whole numbers, but will print 2500.10 as $2,500.1)
        //maximumFractionDigits: 0, // (causes 2500.99 to be printed as $2,501)
    });

    if (!target) {
        ns.print('ERROR! please specify a target!');
        ns.exit();
    }
    do {
        let results = await ns.hack(target);

        let extraString = `hacked ${formatter.format(results)}`;

        let data: ServerEvent = {
            eventType: 'hackComplete',
            hostname: ns.getHostname(),
            target: target,
            extra: extraString
        };

        let bumpedData = await ns.writePort(SCRIPT_COMM_PORT, JSON.stringify(data));
        if (bumpedData) {
            ns.print(`${ns.getScriptName()} did writePort(SCRIPT_COMM_PORT), but bumped data!`, bumpedData);
        }

    } while (flags.loop);

}
     