import { SCRIPTS } from '/lib/consts';
import { prepAllTargets, singleHack } from '/lib/hack-utils';
import { formatBigRam, formatPercent, getAllRamUsage, getSettings, indent, timestamp } from '/lib/utils';
import { getAllTargetWorkInfo, isReadyForBatch } from '/lib/utils-controller';
import { NS } from '/NetscriptDefinitions';
import { IGlobalSettings, IRamUsageSettings, ITargetWorkInfo } from '/types';

export async function main(ns: NS) {

    let controller = new MegaController(ns);
    await controller.doRun();

}

class MegaController {
    private SLEEP_TIME: number = 1000;
    private settings: IGlobalSettings = {};
    private lastStartTime: number = new Date().getTime();
    private scriptRunTime: number = 0;
    private readonly DEFAULT_RAM_USAGE_SETTINGS: IRamUsageSettings = { batchPct: .40, prepPct: .40, sharePct: .10, expPct: .10 };
    private adjustedPrepPct: number = 0;
    private targetWorkInfos: ITargetWorkInfo[] = [];
    private workReadyForBatch: ITargetWorkInfo[] = [];

    constructor(private ns: NS) {
        ns.tail();
        ns.disableLog('ALL');

    }

    public async doRun() {

        this.runInitialScripts();

        while (true) {

            this.updateData();

            this.displayInfo();

            this.doHacking();

            this.updateRunTime();
            await this.ns.sleep(this.SLEEP_TIME);
        }

    }

    private displayHackingInfo() {
        this.ns.print(`Hacking:`);
        this.ns.print(`${indent()} Prep RAM Percent: ${formatPercent(this.adjustedPrepPct)}`);
        this.ns.print(`${indent()} Num. Ready for Batch: ${this.workReadyForBatch.length}`);
        this.ns.print('');
    }

    private displayHeader() {
        this.ns.print(`${timestamp()} Run Time: ${this.scriptRunTime}ms, RAM Used: ${formatBigRam(this.ns.getScriptRam(this.ns.getScriptName()))}`);
        this.ns.print('');
    }

    private displayInfo() {
        this.ns.clearLog();
        this.displayHeader();

        this.displayHackingInfo();

        this.displayRamUsage();

    }

    private displayRamUsage() {
        let usage = getAllRamUsage(this.ns);
        let pad1: number = 7;
        let pad2: number = 5;
        this.ns.print(`Total RAM Usage:  (${formatBigRam(usage.totalMax)})`);
        this.ns.print(`${indent()}Batch: ${formatBigRam(usage.batchRam).padStart(pad1)}, ${formatPercent(usage.batchRam / usage.totalMax, 1).padStart(pad2)}`);
        this.ns.print(`${indent()}Prep:  ${formatBigRam(usage.prepRam).padStart(pad1)}, ${formatPercent(usage.prepRam / usage.totalMax, 1).padStart(pad2)}`);
        this.ns.print(`${indent()}Share: ${formatBigRam(usage.shareRam).padStart(pad1)}, ${formatPercent(usage.shareRam / usage.totalMax, 1).padStart(pad2)}`);
        this.ns.print(`${indent()}EXP:   ${formatBigRam(usage.expRam).padStart(pad1)}, ${formatPercent(usage.expRam / usage.totalMax, 1).padStart(pad2)}`);
        this.ns.print(`${indent()}Other: ${formatBigRam(usage.otherRam).padStart(pad1)}, ${formatPercent(usage.otherRam / usage.totalMax, 1).padStart(pad2)}`);
        this.ns.print(`${indent()}Total: ${formatBigRam(usage.totalUsed).padStart(pad1)}, ${formatPercent(
            usage.totalUsed / usage.totalMax,
            1
        ).padStart(pad2)}`);

        //this._ns.print(usage);
        this.ns.print('');

    }

    private doHacking() {

        if (this.workReadyForBatch.length === 0) {
            let minHackTarget = this.targetWorkInfos.find(w => !isReadyForBatch(w));
            if (minHackTarget) {
                singleHack(this.ns, minHackTarget.target.hostname);
            }
        }

        prepAllTargets(this.ns, this.targetWorkInfos, this.adjustedPrepPct);

    }

    private runInitialScripts() {
        this.ns.run(SCRIPTS.addScripts);
        this.ns.run(SCRIPTS.autoNuke);
    }

    private updateData() {
        this.lastStartTime = new Date().getTime();
        this.settings = getSettings(this.ns);

        this.targetWorkInfos = getAllTargetWorkInfo(this.ns);
        this.workReadyForBatch = this.targetWorkInfos.filter(w => isReadyForBatch(w));

        if (this.workReadyForBatch.length === 0) {
            //if we have nothing ready for batch, let prep use all the ram
            this.adjustedPrepPct *= 1.1;
            this.adjustedPrepPct = Math.min(1.00, this.adjustedPrepPct);
        } else {
            this.adjustedPrepPct = this.DEFAULT_RAM_USAGE_SETTINGS.prepPct;
        }

    }

    private updateRunTime() {
        this.scriptRunTime = new Date().getTime() - this.lastStartTime;
    }
}
