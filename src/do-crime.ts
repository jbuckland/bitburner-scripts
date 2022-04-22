import {CRIME} from '/lib/crime-consts';
import {displayHeader} from '/lib/utils-player';
import {AutocompleteData, NS} from '/NetscriptDefinitions';
import {FlagSchema} from '/types';


export function autocomplete(data: AutocompleteData, args: any[]) {
    data.flags(flagSchema);
    let flagOptions: string[] = [];
    if (args && args.length >= 0) {
        if (args[0] === '--crime') {
            flagOptions = Object.keys(CRIME);
        }
    }

    let autoCompData = [
        ...flagOptions
        //...data.servers,
        //...data.scripts,
        //...data.txts
    ]; //return what you want to have in autocomplete

    console.log(`autocomplete()`, args, autoCompData);
    return autoCompData;
}

const flagSchema: FlagSchema = [
    ['crime', '']
];


export async function main(ns: NS) {

    let flags = ns.flags(flagSchema);

    let targetCrime: CRIME | undefined = flags.crime as CRIME;
    if (targetCrime) {
        let controller = new TemplateController(ns);
        await controller.doRun(targetCrime);

    } else {
        ns.tprint('Please provide `--crime`');
    }

}

class TemplateController {
    private SLEEP_TIME: number = 1000;
    private lastRunTime: number = 0;
    private runTime: number = 0;

    constructor(private ns: NS) {
        ns.tail();
        //ns.disableLog('ALL');

    }

    public async doRun(targetCrime: CRIME) {

        while (true) {
            this.updateData();
            this.displayInfo();



            let crimeTime = this.SLEEP_TIME;

            if (!this.ns.singularity.isBusy()) {
                crimeTime = this.ns.singularity.commitCrime(targetCrime);
            }



            this.runTime = new Date().getTime() - this.lastRunTime;
            await this.ns.sleep(crimeTime);
        }



    }

    private displayInfo() {
        //this.ns.clearLog();
        displayHeader(this.ns, this.runTime);
        //stuff here


    }

    private updateData() {
        this.lastRunTime = new Date().getTime();
    }
}
