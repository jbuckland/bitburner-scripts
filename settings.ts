import {AutocompleteData, NS} from './NetscriptDefinitions';
import {getSettings, setSettings, timestamp} from './utils';
import {FlagSchema} from './types';

let SLEEP_TIME = 1000;

export function autocomplete(data: AutocompleteData, args: any[]) {
    data.flags(flagSchema);
    return [
        //...data.servers,
        //...data.scripts,
        //...data.txts,
    ]; //return what you want to have in autocomplete
}

const flagSchema: FlagSchema = [
    ['watch', false],
    ['clearAll', false],

    ['debug', ''],
    ['hackPercent', -1],
    ['ramBuffer', -1],
    ['doShare', ''],
    ['doExp', '']

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

    let debugValue = convertBool(flags.debug);
    if (debugValue != undefined) {
        setSettings(ns, {debug: debugValue});
    }

    let shareValue = convertBool(flags.doShare);
    if (shareValue != undefined) {
        setSettings(ns, {doShare: shareValue});
    }

    let expGainValue = convertBool(flags.doExp);
    if (expGainValue != undefined) {
        setSettings(ns, {doExp: expGainValue});
    }

    let value = parseFloat(flags.hackPercent);
    if (value > 0) {
        setSettings(ns, {hackPercent: value});
    }

    value = parseFloat(flags.ramBuffer);
    if (value > 0) {
        setSettings(ns, {ramBuffer: value});
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
        ns.tprint(`\nGlobal Settings:\n`, JSON.stringify(currSettings, null, 4));

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
