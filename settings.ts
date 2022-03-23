import { NS } from './NetscriptDefinitions';
import { getSettings, setSettings, timestamp } from './utils';

let SLEEP_TIME = 1000;

export async function main(ns: NS) {

    let flags = ns.flags([
        ['watch', false],
        ['isDebug', ''],
        ['isdebug', '']
    ]);
    let watch = flags.watch;

    let debugString = ((flags.isDebug || flags.isdebug) as string).toLowerCase();
    ns.print(debugString);
    if (debugString === 'true') {
        setSettings(ns, { isDebug: true });
    } else if (debugString === 'false') {
        setSettings(ns, { isDebug: false });
    }

    //default is to read the settings out

    while (watch) {
        ns.tail();
        let currSettings = getSettings(ns);
        ns.clearLog();
        ns.print(`${timestamp()}`);
        ns.print(`Global Settings:`);
        ns.print(JSON.stringify(currSettings, null, 4));

        await ns.sleep(SLEEP_TIME);
    }

}
