import {CrimeMode, HacknetMode, HashSpendOptions} from '/lib/consts';
import {convertBool, getSettings, setSettings, timestamp} from 'lib/utils';
import {AutocompleteData, NS} from 'NetscriptDefinitions';
import {FlagSchema, IGlobalSettings} from 'types';

let SLEEP_TIME = 1000;

export function autocomplete(data: AutocompleteData, args: any[]) {
    data.flags(buildFlagSchema(myFlags));
    let flagOptions: string[] = [];
    if (args && args.length >= 0) {

        if (args[0].startsWith('--')) {
            let flagName = args[0].substring(2);

            let flagData = myFlags.find(f => f.name === flagName);
            if (flagData) {
                flagOptions = flagData.options ?? [];
            }
        }
    }

    return [
        ...flagOptions
        //...data.servers,
        //...data.scripts,
        //...data.txts
    ]; //return what you want to have in autocomplete
}


export enum FlagType {
    enum = 'enum',
    float = 'float',
    bool = 'bool'
}

export interface IFlagData {
    options?: string[];
    name: string,
    flagType: FlagType,
    defaultValue: string | number | boolean
}

function buildFlagSchema(flagData: IFlagData[]): FlagSchema {

    let flagSchema: FlagSchema = flagData.map(flagData => {

        return [flagData.name, flagData.defaultValue];
    });

    return flagSchema;
}



const myFlags: IFlagData[] = [
    {name: 'debug', defaultValue: '', flagType: FlagType.bool, options: ['true', 'false']},
    {name: 'autoStartWork', defaultValue: '', flagType: FlagType.bool, options: ['true', 'false']},
    {name: 'forceSwitchWork', defaultValue: '', flagType: FlagType.bool, options: ['true', 'false']},
    {name: 'doRunnerWork', defaultValue: '', flagType: FlagType.bool, options: ['true', 'false']},
    {name: 'doHackingWork', defaultValue: '', flagType: FlagType.bool, options: ['true', 'false']},
    {name: 'hashUse', defaultValue: '', flagType: FlagType.enum, options: Object.values(HashSpendOptions)},
    {name: 'crimeMode', defaultValue: '', flagType: FlagType.enum, options: Object.values(CrimeMode)},
    {name: 'hacknetMode', defaultValue: '', flagType: FlagType.enum, options: Object.values(HacknetMode)},
    {name: 'ramBuffer', defaultValue: -1, flagType: FlagType.float},
    {name: 'hackPercent', defaultValue: -1, flagType: FlagType.float},
    {name: 'moneyBuffer', defaultValue: -1, flagType: FlagType.float},
    {name: 'maxHashCostBen', defaultValue: -1, flagType: FlagType.float}
];


export async function main(ns: NS) {

    let flags = ns.flags(buildFlagSchema(myFlags));

    let watch = flags.watch;

    /*
    let settingName = ns.args[0] as string;
    let settingValue = ns.args[1] as string;
    ns.tprint(`settingName: ${settingName}, settingValue: ${settingValue}`);

    if (settingName) {
        ns.tprint(`flags[settingName]: '${flags[settingName]}'`);
        flags[settingName] = settingValue.toString();
    }
*/
    ns.tprint(`flags:`, flags);

    myFlags.forEach(flagData => {
        switch (flagData.flagType) {
            case FlagType.enum:
                setEnumSetting(flagData.name as any);
                break;
            case FlagType.float:
                setFloatSetting(flagData.name as any);
                break;
            case FlagType.bool:
                setBoolSetting(flagData.name as any);
                break;

        }

    });



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

    function setFloatSetting(settingsKey: keyof IGlobalSettings) {
        let floatFlag = flags[settingsKey] as string;
        let floatValue = parseFloat(floatFlag);
        if (floatValue > -1) {
            ns.tprint(`setFloatSetting()`, {settingsKey, floatValue});
            let newSettings: IGlobalSettings = {};
            newSettings[settingsKey] = floatValue as any;
            setSettings(ns, newSettings);
        }
    }

    function setBoolSetting(settingsKey: keyof IGlobalSettings) {
        let boolFlag = flags[settingsKey] as string;
        let boolValue = convertBool(boolFlag);
        if (boolValue != undefined) {
            ns.tprint(`setBoolSetting()`, {settingsKey, boolValue});

            let newSettings: IGlobalSettings = {};
            newSettings[settingsKey] = boolValue as any;
            setSettings(ns, newSettings);
        }
    }

    function setEnumSetting<T>(settingsKey: keyof IGlobalSettings) {
        let enumValue = flags[settingsKey] as string;
        if (enumValue != undefined && enumValue.length > 0) {
            ns.tprint(`setEnumSetting()`, {settingsKey, enumValue});

            let newSettings: IGlobalSettings = {};
            newSettings[settingsKey] = enumValue as any;

            setSettings(ns, newSettings);
        }
    }


}

