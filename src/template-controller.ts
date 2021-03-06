import {CrimeMode} from '/lib/consts';
import {displayHeader} from '/lib/utils-player';
import {AutocompleteData, NS} from '/NetscriptDefinitions';
import {FlagSchema} from '/types';


export function autocomplete(data: AutocompleteData, args: any[]) {
    console.log(`autocomplete()`, args);
    data.flags(flagSchema);
    let flagOptions: string[] = [];
    if (args && args.length >= 0) {
        if (args[0] === '--crimeMode') {
            flagOptions = Object.values(CrimeMode);
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
    ['debug', '']

];

export async function main(ns: NS) {

    let controller = new TemplateController(ns);
    let flags = ns.flags(flagSchema);
    await controller.doRun();

}

class TemplateController {
    private SLEEP_TIME: number = 1000;
    private lastRunTime: number = 0;
    private runTime: number = 0;

    constructor(private ns: NS) {
        ns.tail();
        ns.disableLog('ALL');

    }

    public async doRun() {

        while (true) {
            this.updateData();
            this.displayInfo();

            this.runTime = new Date().getTime() - this.lastRunTime;
            await this.ns.sleep(this.SLEEP_TIME);
        }

    }

    private displayInfo() {
        this.ns.clearLog();
        displayHeader(this.ns, this.runTime);
        //stuff here


    }

    private updateData() {
        this.lastRunTime = new Date().getTime();
    }
}
