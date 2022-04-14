import { timestamp } from '/lib/utils';
import { NS } from '/NetscriptDefinitions';

export async function main(ns: NS) {

    let controller = new TemplateController(ns);
    await controller.doRun();

}

class TemplateController {
    private SLEEP_TIME: number = 1000;

    constructor(private ns: NS) {
        ns.tail();
        ns.disableLog('ALL');

    }

    public async doRun() {

        while (true) {

            this.updateData();

            this.displayInfo();

            await this.ns.sleep(this.SLEEP_TIME);
        }

    }

    private displayInfo() {
        this.ns.clearLog();
        //stuff here
        this.ns.print(timestamp());

    }

    private updateData() {

    }
}
