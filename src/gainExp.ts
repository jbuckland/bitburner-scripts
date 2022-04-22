import {SCRIPTS} from '/lib/consts';
import {formatBigNumber, formatCurrency, getAllRunners, getServerInfo, getThreadsAvailableForScript, indent, round} from '/lib/utils';
import {displayHeader} from '/lib/utils-player';
import {NS} from '/NetscriptDefinitions';
import {ServerInfo} from '/types';

export async function main(ns: NS) {

    let controller = new TemplateController(ns);
    await controller.doRun();

}

class TemplateController {
    private SLEEP_TIME: number = 60;
    private runTime: number = 0;
    private lastRunTime: number = new Date().getTime();
    private target = 'joesguns';
    private targetIsReady: boolean = false;
    private targetInfo!: ServerInfo;

    constructor(private ns: NS) {
        ns.tail();
        ns.disableLog('ALL');

    }

    public async doRun() {



        while (true) {

            this.lastRunTime = new Date().getTime();
            this.updateData();
            this.displayInfo();


            if (this.targetIsReady) {
                let runners = getAllRunners(this.ns);

                runners.forEach(runner => {

                    let threadsAvailable = getThreadsAvailableForScript(this.ns, runner.hostname, SCRIPTS.expGain);
                    if (threadsAvailable > 0) {
                        this.ns.exec(SCRIPTS.expGain, runner.hostname, threadsAvailable, this.target);
                    }
                });



            }

            this.runTime = new Date().getTime() - this.lastRunTime;
            await this.ns.sleep(Math.max(0, this.SLEEP_TIME - this.runTime));
        }

    }

    private displayInfo() {
        this.ns.clearLog();
        //stuff here
        displayHeader(this.ns, this.runTime);


        if (this.targetIsReady) {
            this.ns.print(`Using ALL ram from EVERY server to gain exp!`);
            let expGain = this.ns.getScriptExpGain();
            this.ns.print(`${indent()} EXP Gain: ${formatBigNumber(expGain)}/s`);
        } else {
            let secString = `Sec: ${round(this.targetInfo.currSecurity, 1)}/${round(this.targetInfo.minSecurity, 1)}`;
            let moneyString = `Money: ${formatCurrency(this.targetInfo.currMoney)}/${formatCurrency(this.targetInfo.maxMoney)}`;

            this.ns.print(`EXP Target [${this.target}] is not ready!! ${secString}, ${moneyString}`);
        }


        this.ns.print('');

    }

    private updateData() {
        this.targetInfo = getServerInfo(this.ns, this.target);

        this.targetIsReady = this.targetInfo.currSecurity === this.targetInfo.minSecurity && this.targetInfo.currMoney === this.targetInfo.maxMoney;


    }
}
