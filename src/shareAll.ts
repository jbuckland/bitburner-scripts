import {SCRIPTS} from '/lib/consts';
import {formatPercent, getAllRunners, getThreadsAvailableForRamUse, Timer} from '/lib/utils';
import {displayHeader} from '/lib/utils-player';
import {NS} from '/NetscriptDefinitions';

export async function main(ns: NS) {

    let controller = new ShareController(ns);
    await controller.doRun();

}



class ShareController {
    private SLEEP_TIME: number = 10010;
    private lastRunTime: number = 0;
    private runTime: number = 0;
    private shareThreadsStarted: number = 0;
    private shareBonus: number = 0;
    private timer: Timer;

    constructor(private ns: NS) {
        ns.tail();
        ns.disableLog('ALL');
        this.timer = new Timer(this);
    }

    public async doRun() {



        let runners = getAllRunners(this.ns);
        let shareRamUse = this.ns.getScriptRam(SCRIPTS.myShare);

        while (true) {
            this.timer.startTimer('headerStuff');
            this.lastRunTime = new Date().getTime();
            this.updateData();
            this.displayInfo();
            this.timer.stopTimer('headerStuff');


            this.timer.startTimer('sharing');
            this.shareThreadsStarted = 0;
            runners.forEach(runner => {


                let threadsAvailable = getThreadsAvailableForRamUse(this.ns, runner.hostname, shareRamUse);
                if (threadsAvailable > 0) {
                    this.timer.startTimer('sharing:exec');
                    let pid = this.ns.exec(SCRIPTS.myShare, runner.hostname, threadsAvailable);
                    this.timer.stopTimer('sharing:exec');
                    if (pid > 0) {
                        this.shareThreadsStarted += threadsAvailable;
                    }

                }
            });
            this.timer.stopTimer('sharing');


            this.runTime = new Date().getTime() - this.lastRunTime;

            this.timer.printAll(this.ns);
            this.timer.resetAll();

            await this.ns.sleep(this.SLEEP_TIME);
        }

    }

    private displayInfo() {
        this.ns.clearLog();
        displayHeader(this.ns, this.runTime);
        this.ns.print(`Share threads started this pass: ${this.shareThreadsStarted}`);

        this.ns.print(`Share bonus: +${formatPercent(this.shareBonus)}%`);


        //stuff here


    }

    private updateData() {
        this.shareBonus = this.ns.getSharePower() - 1;
    }
}
