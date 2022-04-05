import {NS} from './NetscriptDefinitions';
import {formatBigRam, formatPercent, getAllRamUsage, round, timerEnd, timerStart, timestamp} from './utils';
import {HOME, INDENT_STRING, playerControllers} from './consts';

export async function main(ns: NS) {
    let controller = new HomeController(ns);
    await controller.doRun();
}

export interface IRamUsage {
    totalUsed: number,
    totalMax: number,

    batchRam: number,
    prepRam: number,
    expRam: number,
    shareRam: number,
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

    private displayHomeRamUsage() {
        let usedRam = this._ns.getServerUsedRam(HOME);
        let maxRam = this._ns.getServerMaxRam(HOME);

        this._ns.print('Home RAM Usage:');
        this._ns.print(`${INDENT_STRING}${formatBigRam(usedRam)}/${formatBigRam(maxRam)}, ${round(usedRam / maxRam * 100)}%`);

    }

    private displayControllerInfo() {
        this._ns.print('Controllers:');

        playerControllers.find(c => this._ns.scriptRunning(c.scriptName, HOME));

    }

    private displayRamUsage() {
        let usage = getAllRamUsage(this._ns);
        let pad1: number = 7;
        let pad2: number = 5;
        this._ns.print(`Total RAM Usage:  (${formatBigRam(usage.totalMax)})`);
        this._ns.print(`${INDENT_STRING}Batch: ${formatBigRam(usage.batchRam).padStart(pad1)}, ${formatPercent(usage.batchRam / usage.totalMax, 1).padStart(pad2)}`);
        this._ns.print(`${INDENT_STRING}Prep:  ${formatBigRam(usage.prepRam).padStart(pad1)}, ${formatPercent(usage.prepRam / usage.totalMax, 1).padStart(pad2)}`);
        this._ns.print(`${INDENT_STRING}Share: ${formatBigRam(usage.shareRam).padStart(pad1)}, ${formatPercent(usage.shareRam / usage.totalMax, 1).padStart(pad2)}`);
        this._ns.print(`${INDENT_STRING}EXP:   ${formatBigRam(usage.expRam).padStart(pad1)}, ${formatPercent(usage.expRam / usage.totalMax, 1).padStart(pad2)}`);
        this._ns.print(`${INDENT_STRING}Other: ${formatBigRam(usage.otherRam).padStart(pad1)}, ${formatPercent(usage.otherRam / usage.totalMax, 1).padStart(pad2)}`);
        this._ns.print(`${INDENT_STRING}Total: ${formatBigRam(usage.totalUsed).padStart(pad1)}, ${formatPercent(usage.totalUsed / usage.totalMax, 1).padStart(pad2)}`);

        //this._ns.print(usage);

    }

}
