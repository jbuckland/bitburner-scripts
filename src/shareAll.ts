import {SCRIPTS} from '/lib/consts';
import {getAllRunners, getThreadsAvailableForScript} from '/lib/utils';
import {displayHeader} from '/lib/utils-player';
import {NS} from '/NetscriptDefinitions';

export async function main(ns: NS) {

    let controller = new ShareController(ns);
    await controller.doRun();

}

class ShareController {
    private SLEEP_TIME: number = 1000;
    private lastRunTime: number = 0;
    private runTime: number = 0;
    private shareThreadsStarted: number = 0;

    constructor(private ns: NS) {
        ns.tail();
        ns.disableLog('ALL');

    }

    public async doRun() {

        while (true) {
            this.lastRunTime = new Date().getTime();
            this.updateData();


            let runners = getAllRunners(this.ns);

            this.shareThreadsStarted = 0;
            runners.forEach(runner => {

                let threadsAvailable = getThreadsAvailableForScript(this.ns, runner.hostname, SCRIPTS.myShare);
                if (threadsAvailable > 0) {
                    let pid = this.ns.exec(SCRIPTS.myShare, runner.hostname, threadsAvailable);
                    if (pid > 0) {
                        this.shareThreadsStarted += threadsAvailable;
                    }

                }
            });


            this.displayInfo();
            this.runTime = new Date().getTime() - this.lastRunTime;
            await this.ns.sleep(this.SLEEP_TIME);
        }

    }

    private displayInfo() {
        this.ns.clearLog();
        displayHeader(this.ns, this.runTime);
        this.ns.print(`Share threads started this pass: ${this.shareThreadsStarted}`);

        //stuff here


    }

    private updateData() {

    }
}
