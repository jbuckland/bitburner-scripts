import {SCRIPTS} from '/lib/consts';
import {useAvailableRunnersForWork} from '/lib/hack-utils';
import {formatBigNumber, formatCurrency, getAllRunners, getServerInfo, getThreadsAvailableForScript, indent, round, Timer, ValueGainAverage} from '/lib/utils';
import {getTargetWorkInfoForTargets} from '/lib/utils-controller';
import {displayHeader} from '/lib/utils-player';
import {NS, Player} from '/NetscriptDefinitions';
import {ServerInfo, TaskType} from '/types';

export async function main(ns: NS) {

    let controller = new TemplateController(ns);
    ns.atExit(controller.atExit);
    await controller.doRun();


}

class TemplateController {
    private SLEEP_TIME: number = 60;
    private lastRunTime: number = new Date().getTime();
    private runTime: number = 0;
    private target = 'joesguns';
    private targetInfo!: ServerInfo;
    private targetIsReady: boolean = false;
    private timer: Timer;
    private player!: Player;
    private expGain: ValueGainAverage;



    constructor(private ns: NS) {
        ns.tail();
        ns.disableLog('ALL');
        this.timer = new Timer(this);
        this.expGain = new ValueGainAverage();
    }

    public atExit() {

    }

    public async doRun() {


        while (true) {
            this.timer.startTimer('MainLoop');
            this.lastRunTime = new Date().getTime();
            this.updateData();
            this.displayInfo();

            if (this.targetIsReady) {
                this.doExpGain();

            } else {
                this.prepTarget();
            }

            this.timer.stopTimer('MainLoop');
            this.timer.printAll(this.ns);


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
            this.ns.print(`${indent()} Calculated EXP Gain: ${formatBigNumber(this.expGain.getAverage())}/s`);
        } else {
            let secString = `Sec: ${round(this.targetInfo.currSecurity, 2)}/${round(this.targetInfo.minSecurity, 1)}`;
            let moneyString = `Money: ${formatCurrency(this.targetInfo.currMoney, 2)}/${formatCurrency(this.targetInfo.maxMoney)}`;

            this.ns.print(`EXP Target [${this.target}] is not ready!! ${secString}, ${moneyString}`);
        }

        this.ns.print('');

    }

    private doExpGain() {
        this.timer.startTimer('MainLoop.runExpScripts');
        let runners = getAllRunners(this.ns);
        runners.forEach(runner => {

            let threadsAvailable = getThreadsAvailableForScript(this.ns, runner.hostname, SCRIPTS.expGain);
            if (threadsAvailable > 0) {
                this.timer.startTimer('MainLoop.runExpScripts.exec');
                this.ns.exec(SCRIPTS.expGain, runner.hostname, threadsAvailable, this.target);
                this.timer.stopTimer('MainLoop.runExpScripts.exec');
            }
        });
        this.timer.stopTimer('MainLoop.runExpScripts');
    }

    private prepTarget() {
        let targetInfo = getServerInfo(this.ns, this.target);
        let work = getTargetWorkInfoForTargets(this.ns, [targetInfo]);
        let targetWork = work.find(w => w.target.hostname === this.target);
        this.timer.startTimer('MainLoop.prep');
        if (targetWork) {
            useAvailableRunnersForWork(this.ns, this.target, SCRIPTS.weaken, targetWork.threadInfos[TaskType.weaken], 1);
            useAvailableRunnersForWork(this.ns, this.target, SCRIPTS.grow, targetWork.threadInfos[TaskType.grow], 1);
        }
        this.timer.stopTimer('MainLoop.prep');
    }

    private updateData() {
        this.targetInfo = getServerInfo(this.ns, this.target);
        this.targetIsReady = this.targetInfo.currSecurity === this.targetInfo.minSecurity && this.targetInfo.currMoney === this.targetInfo.maxMoney;
      

        this.player = this.ns.getPlayer();

        this.expGain.addEntry(this.player.hacking_exp);

    }
}
