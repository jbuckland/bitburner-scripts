import {NS} from 'NetscriptDefinitions';
import {timestamp} from 'lib/utils';

export async function main(ns: NS) {
    let svc = new CorpController(ns);
    await svc.doRun();
}

export class CorpController {
    private SLEEP_TIME: number = 1;

    public constructor(private ns: NS) {
        ns.tail();
        ns.disableLog('ALL');
    }

    public async doRun() {

        while (true) {

            this.displayInfo();

            await this.ns.sleep(this.SLEEP_TIME);
        }

    }

    private displayInfo() {
        this.ns.clearLog();
        this.ns.print(timestamp());
        let corp = this.ns.corporation.getCorporation();
    }
}

