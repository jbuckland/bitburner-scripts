import { AutocompleteData, NS } from 'NetscriptDefinitions';
import { getThreadsAvailableForScript } from 'lib/utils';

export function autocomplete(data: AutocompleteData, args: any[]) {

    //return what you want to have in autocomplete
    //data.flags(flagSchema);
    return [
        //...data.servers
        ...data.scripts
        //...data.txts,
    ];
}

export async function main(ns: NS) {
    ns.disableLog('ALL');
    let scriptName = ns.args.shift() as string;
    let runner = ns.getCurrentServer();

    if (scriptName) {
        let maxThreads = getThreadsAvailableForScript(ns, runner, scriptName);
        if (maxThreads > 0) {

            ns.exec(scriptName, runner, maxThreads, ...ns.args);

        } else {
            ns.tprint(`No available threads to run ${scriptName}`);
        }

    } else {
        ns.tprint(`Please provide a script name!`);
    }

}
