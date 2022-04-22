import {HOME, playerControllers} from 'lib/consts';
import {formatBigRam, formatPercent, getAllRamUsage, indent, round, timerEnd, timerStart, timestamp} from 'lib/utils';
import {NS} from 'NetscriptDefinitions';

export async function main(ns: NS) {
    let controller = new HomeController(ns);
    await controller.doRun();
}

export interface IRamUsage {
    totalUsed: number,
    totalMax: number,

    batchRam: number,
    hackRam: number,
    prepRam: number,
    expRam: number,
    shareRam: number,
    stanekRam: number,
    otherRam: number,
    otherNames: string[]
}

export class HomeController {
    private SLEEP_TIME: number = 1000;

    public constructor(private _ns: NS) {
        _ns.disableLog('ALL');
        _ns.tail();

    }

    public async doRun() {
        while (true) {
            timerStart(this._ns, `home-controller.run()`);
            this.displayInfo();

            timerEnd(this._ns, `home-controller.run()`);
            await this._ns.sleep(this.SLEEP_TIME);
        }

    }

    private displayControllerInfo() {
        this._ns.print('Controllers:');

        playerControllers.find(c => this._ns.scriptRunning(c.scriptName, HOME));

    }

    private displayHomeRamUsage() {
        let usedRam = this._ns.getServerUsedRam(HOME);
        let maxRam = this._ns.getServerMaxRam(HOME);

        this._ns.print('Home RAM Usage:');
        this._ns.print(`${indent()}${formatBigRam(usedRam)}/${formatBigRam(maxRam)}, ${round(usedRam / maxRam * 100)}%`);

    }

    private displayInfo() {
        this._ns.clearLog();
        this._ns.print(timestamp());
        this._ns.print(`Home Status:`);
        this._ns.print('');

        this.displayHomeRamUsage();
        this._ns.print('');
        this.displayRamUsage();
        this._ns.print('');
    }

    private displayRamUsage() {
        let usage = getAllRamUsage(this._ns);
        let pad1: number = 7;
        let pad2: number = 5;
        this._ns.print(`Total RAM Usage:  (${formatBigRam(usage.totalMax)})`);
        this._ns.print(`${indent()}Batch: ${formatBigRam(usage.batchRam).padStart(pad1)}, ${formatPercent(usage.batchRam / usage.totalMax, 1).padStart(pad2)}`);
        this._ns.print(`${indent()}Prep:  ${formatBigRam(usage.prepRam).padStart(pad1)}, ${formatPercent(usage.prepRam / usage.totalMax, 1).padStart(pad2)}`);
        this._ns.print(`${indent()}Share: ${formatBigRam(usage.shareRam).padStart(pad1)}, ${formatPercent(usage.shareRam / usage.totalMax, 1).padStart(pad2)}`);
        this._ns.print(`${indent()}EXP:   ${formatBigRam(usage.expRam).padStart(pad1)}, ${formatPercent(usage.expRam / usage.totalMax, 1).padStart(pad2)}`);
        this._ns.print(`${indent()}Other: ${formatBigRam(usage.otherRam).padStart(pad1)}, ${formatPercent(usage.otherRam / usage.totalMax, 1).padStart(pad2)}`);
        this._ns.print(`${indent()}Total: ${formatBigRam(usage.totalUsed).padStart(pad1)}, ${formatPercent(usage.totalUsed / usage.totalMax, 1).padStart(pad2)}`);

        //this._ns.print(usage);

    }

}
