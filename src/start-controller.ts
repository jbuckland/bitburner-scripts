import { timestamp } from '/lib/utils';
import { NS } from '/NetscriptDefinitions';

export async function main(ns: NS) {

}

class StartController {
    private SLEEP_TIME: number = 1000;

    constructor(private ns: NS) {
        ns.tail();
        ns.disableLog('ALL)');

    }

    public doRun() {

        while (true) {

            this.updateData();

            this.displayInfo();

            this.ns.sleep(this.SLEEP_TIME);
        }

    }

    private displayInfo() {
        this.ns.clearLog();
        //stuff here

        //display running controllers
        //display needed ram for 'next' controller?


        this.ns.print(timestamp());
    }

    private updateData() {

    }
}
