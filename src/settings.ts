import { CrimeMode, HacknetMode } from 'utils/consts';
import { AutocompleteData, NS } from 'NetscriptDefinitions';
import { FlagSchema } from 'types';
import { getSettings, setSettings, timestamp } from 'utils/utils';

let SLEEP_TIME = 1000;

export function autocomplete(data: AutocompleteData, args: any[]) {
    console.log(`autocomplete()`, args);
    data.flags(flagSchema);
    let flagOptions: string[] = [];
    if (args && args.length >= 0) {
        if (args[0] === '--crimeMode') {
            flagOptions = Object.values(CrimeMode);
        } else if (args[0] === '--hacknetMode') {
            flagOptions = Object.values(HacknetMode);
        }
    }

    return [
        ...flagOptions
        //...data.servers,
        //...data.scripts,
        //...data.txts
    ]; //return what you want to have in autocomplete
}

const flagSchema: FlagSchema = [
    ['crimeMode', ''],
    ['debug', ''],
    ['hackPercent', -1],
    ['hacknetMode', ''],
    ['maxHashCostBen', -1],
    ['ramBuffer', -1]

];

export async function main(ns: NS) {

    let flags = ns.flags(flagSchema);
    let watch = flags.watch;

    let settingName = ns.args[0] as string;
    let settingValue = ns.args[1] as string;
    ns.tprint(`settingName: ${settingName}, settingValue: ${settingValue}`);

    if (settingName) {
        ns.tprint(`flags[settingName]: '${flags[settingName]}'`);
        flags[settingName] = settingValue.toString();
    }

    ns.tprint(`flags:`, flags);

    let maxHashCostBen = parseFloat(flags.maxHashCostBen);
    if (maxHashCostBen > 0) {
        setSettings(ns, { maxHashCostBen: maxHashCostBen });
    }

    let hacknetMode = flags.hacknetMode as HacknetMode;
    if (hacknetMode != undefined && hacknetMode.length > 0) {
        setSettings(ns, { hacknetMode: hacknetMode });
    }

    let crimeMode = flags.crimeMode as CrimeMode;
    if (crimeMode != undefined && crimeMode.length > 0) {
        setSettings(ns, { crimeMode: crimeMode });
    }

    let debugValue = convertBool(flags.debug);
    if (debugValue != undefined) {
        setSettings(ns, { debug: debugValue });
    }

    let value = parseFloat(flags.hackPercent);
    if (value > 0) {
        setSettings(ns, { hackPercent: value });
    }

    value = parseFloat(flags.ramBuffer);
    if (value > 0) {
        setSettings(ns, { ramBuffer: value });
    }

    if (watch) {
        //if watch flag is set,
        // display settings in an auto-refreshing window
        while (true) {
            ns.tail();
            let currSettings = getSettings(ns);
            ns.clearLog();
            ns.print(`${timestamp()}`);
            ns.print(`Global Settings:`);
            ns.print(JSON.stringify(currSettings, null, 4));

            await ns.sleep(SLEEP_TIME);
        }

    } else {
        //default is to print settings to console
        let currSettings = getSettings(ns);
        let replacer = (key: string, value: any) => {
            if (key === 'maxHashCostBen') {
                return value.toExponential(); //formatBigNumber(value);
            } else {
                return value;
            }
        };
        ns.tprint(`\nGlobal Settings:\n`, JSON.stringify(currSettings, replacer, 4));

    }

}

function convertBool(value: string): boolean | undefined {

    if (value === 'true') {
        return true;
    } else if (value === 'false') {
        return false;
    } else {
        return undefined;
    }
}
