import {CrimeMode, FragmentEffect, SCRIPTS, STANEK_PATTERNS} from '/lib/consts';
import {formatBigNumber, getAllRunners, runChargeFragment} from '/lib/utils';
import {displayHeader} from '/lib/utils-player';
import {ITableData, Table} from '/lib/utils-table';
import {ActiveFragment, AutocompleteData, Fragment, NS} from '/NetscriptDefinitions';
import {FlagSchema} from '/types';


export function autocomplete(data: AutocompleteData, args: any[]) {
    console.log(`autocomplete()`, args);
    data.flags(flagSchema);
    let flagOptions: string[] = [];
    if (args && args.length >= 0) {
        if (args[0] === '--example') {
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
    ['load', false],
    ['save', false],
    ['charge', false]
];

export async function main(ns: NS) {

    let controller = new StanekController(ns);
    let flags = ns.flags(flagSchema);

    let loadPattern = flags.load as boolean;
    let savePattern = flags.save as boolean;
    let chargeFragments = flags.charge as boolean;

    if (loadPattern) {
        await controller.loadPattern();
    } else if (savePattern) {
        await controller.saveCurrentPattern();
    } else {
        await controller.doRun();
    }



}

type MyFragmentInfo = ActiveFragment & Fragment & { startedChargeThreads: number }

const MAX_CHARGE = 20000;

class StanekController {
    private SLEEP_TIME: number = 1005;
    private lastRunTime: number = 0;

    private runTime: number = 0;
    private width: number = 0;
    private height: number = 0;
    private activeFragments: MyFragmentInfo[] = [];
    private chargeRam: number;
    private chargeMode: 'faction' | 'normal' = 'normal';


    constructor(private ns: NS) {

        ns.disableLog('ALL');
        //ns.enableLog('exec');
        this.chargeRam = ns.getScriptRam(SCRIPTS.chargeFragment);
    }

    public async doRun() {
        this.ns.tail();


        while (true) {
            this.updateData();


            this.doCharging();



            this.displayInfo();
            this.runTime = new Date().getTime() - this.lastRunTime;
            await this.ns.sleep(this.SLEEP_TIME);
        }

    }

    private displayInfo() {
        this.ns.clearLog();
        displayHeader(this.ns, this.runTime);
        //stuff here

        this.ns.print(`Charge Mode: ${this.chargeMode}`);
        this.ns.print(`Fragment Info:`);
        this.activeFragments.sort((a, b) => (b.numCharge * b.highestCharge) - (a.numCharge * a.highestCharge));

        let table = new Table(this.ns);

        let tableData: ITableData[] = [];

        this.activeFragments.forEach(frag => {

            let effectString = FragmentEffect[frag.id] ?? '!?Missing FragmentEffect entry?!';


            tableData.push({
                'Id': frag.id.toString(),
                'Effect': effectString,
                'Charge': formatBigNumber(frag.numCharge * frag.highestCharge, 3),
                'Power': frag.power.toString(),
                'Charge Threads': formatBigNumber(frag.startedChargeThreads),
                'Highest Charge': frag.highestCharge.toString()
            });

            //this.ns.print(`Id: ${frag.id}: ${FragmentEffect[frag.id]}`);
            //this.ns.print(`${indent()}Charge: ${round(frag.numCharge)}, Pow: ${frag.power.toString().padStart(3)}, Started Charge Threads: ${frag.startedChargeThreads} `);

        });
        table.setData(tableData);
        table.headerRow['Effect'].align = 'left';

        table.print();



    }

    private updateData() {
        this.chargeMode = 'faction';
        this.lastRunTime = new Date().getTime();

        this.width = this.ns.stanek.giftWidth();
        this.height = this.ns.stanek.giftHeight();

        let fragmentDefinitions = this.ns.stanek.fragmentDefinitions();

        this.activeFragments = this.ns.stanek.activeFragments().map(actFrag => {
            let fragDef = fragmentDefinitions.find(def => def.id === actFrag.id);
            if (fragDef) {
                return {
                    ...actFrag,
                    ...fragDef,
                    startedChargeThreads: 0

                };
            } else {
                throw new Error('Could not find a Fragment Definition for Active Fragment!');

            }
        });
        this.activeFragments = this.activeFragments.filter(f => FragmentEffect[f.id] !== 'Booster');
        this.activeFragments.sort((a, b) => a.numCharge - b.numCharge);


    }



    private doCharging() {
        //let fragmentsToCharge = this.activeFragments.filter(frag => frag.)


        if (this.activeFragments.length > 0) {

            let runners = getAllRunners(this.ns);
            runners.sort((a, b) => b.freeRam - a.freeRam);



            let currFragIndex = 0;
            this.activeFragments.sort((a, b) => (a.numCharge * a.highestCharge) - (b.numCharge * b.highestCharge));


            runners.forEach((runner, index) => {

                // let availThreads = getThreadsAvailableForScript(this.ns, runner.hostname, SCRIPTS.chargeFragment);
                let availThreads = Math.floor(runner.freeRam / this.chargeRam);

                if (availThreads > 0) {

                    let targetFrag = this.activeFragments.find(f => f.numCharge * f.highestCharge < MAX_CHARGE);

                    if (this.chargeMode === 'faction') {
                        targetFrag = this.activeFragments[0];
                    }

                    if (targetFrag) {
                        let threadsToUse = availThreads;
                        let pid = runChargeFragment(this.ns, runner.hostname, targetFrag, threadsToUse);
                        if (pid > 0) {
                            //this.ns.print(`success!`);
                            this.ns.print(`Charging Fragment ${targetFrag.id.toString().padStart(3)} with ${threadsToUse} threads!`);
                            targetFrag.startedChargeThreads += availThreads;
                            currFragIndex = (currFragIndex + 1) % this.activeFragments.length;
                        } else {
                            //error!
                            this.ns.print(`ERROR!`);
                        }
                    }


                }



            });

        }
    }

    public async loadPattern() {



        let selection = await this.ns.prompt('Select the pattern to load', {type: 'select', choices: Object.keys(STANEK_PATTERNS.x5y6)});

        if (selection) {
            let doLoad = await this.ns.prompt(`Are you sure you want to remove all fragments an load the [${selection}] pattern?`);

            if (doLoad) {
                this.ns.tail();
                this.ns.print(`Clearing gift and installing pattern [${selection}]`);

                this.ns.stanek.clearGift();

                let key = Object.keys(STANEK_PATTERNS.x5y6).find(k => k === selection);
                if (key) {
                    let pattern = STANEK_PATTERNS.x5y6[key];


                    let success = true;
                    for (const fragLoc of pattern) {
                        success = this.ns.stanek.placeFragment(fragLoc.x, fragLoc.y, fragLoc.rotation, fragLoc.id);
                        if (!success) {
                            this.ns.print(`ERROR! Could not install Fragment #${fragLoc.id}!!`, fragLoc);
                            break;
                        }
                    }
                    if (success) {
                        this.ns.print(`Pattern [${selection}] installation successful!`);
                    }
                } else {
                    this.ns.print(`ERROR! Could not find pattern [${selection}]`);
                }


            } else {

            }
        }


    }

    public async saveCurrentPattern() {
        this.ns.tail();
        let activeFrags = this.ns.stanek.activeFragments().map(frag => {
            return {
                x: frag.x,
                y: frag.y,
                id: frag.id,
                rotation: frag.rotation
            };
        });

        let patternString = JSON.stringify(activeFrags);


        await this.ns.write('stanek-patterns.txt', patternString, 'a');

        this.ns.print(`pattern string to save:`);


        let lines = activeFrags.map(frag => '  ' + JSON.stringify(frag)).join(',\n');
        patternString = `[\n${lines}\n]`;
        this.ns.print(patternString);



    }
}
