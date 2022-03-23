import { HOME } from './consts';
import { NS } from './NetscriptDefinitions';
import { ITargetWorkInfo, TaskType } from './types';
import { formatBigNumber, formatBigTime, getTargetValue, myFormatCurrency, readTargetStats, round, timestamp } from './utils';

export async function main(ns: NS) {
    const SLEEP_TIME = 1000;

    ns.tail();
    ns.disableLog('ALL');

    while (true) {
        ns.clearLog();

        let serverInfo: ITargetWorkInfo[] = readTargetStats(ns);

        let maxHostLength: number = Math.max(...serverInfo.map(s => s.target.hostname.length)); //find length of longest string

        for (let i = 0; i < serverInfo.length; i++) {
            const s = serverInfo[i];

            let weakenSeconds = Math.round((s.target.weakenTime ?? 0) / 1000);
            let weakenString = `WeakTime: ${weakenSeconds.toString().padStart(4)}s`;

            let growthParamString = `GrowP: ${s.target.growthParam.toString().padStart(2)}`;
            let growTimeString = `GTime: ${formatBigTime(s.target.growTime).toString().padStart(5)}`;
            let valueString = `Value: ${round(getTargetValue(s.target), 2).toString().padEnd(4, '0')}`;

            let currSecString = round(s.target.currSecurity, 1).toString().padStart(4);
            let minSecString = (s.target.minSecurity ?? 0).toString().padStart(2);
            let secString = `Sec: ${currSecString}/${minSecString}`;
            let moneyString = `${myFormatCurrency(s.target.currMoney).padStart(7)} / ${myFormatCurrency(s.target.maxMoney).padStart(7)}`;

            let taskPad = 5;
            let weaken = s.threadInfos[TaskType.weaken];
            let weakenStatsString = `${formatBigNumber(weaken.inProgress).padStart(taskPad)}/${formatBigNumber(weaken.total).padStart(taskPad)}`;

            let grow = s.threadInfos[TaskType.grow];
            let growStatsString = `${formatBigNumber(grow.inProgress).padStart(taskPad)}/${formatBigNumber(grow.total).padStart(taskPad)}`;

            let prepWorkString = `Prep: W:${weakenStatsString}, G:${growStatsString}`;

            let batchWeaken = s.threadInfos[TaskType.batchWeaken];
            let batchWeakenStatsString = `${formatBigNumber(batchWeaken.inProgress).padStart(taskPad)}`;

            let batchGrow = s.threadInfos[TaskType.batchGrow];
            let batchGrowStatsString = `${formatBigNumber(batchGrow.inProgress).padStart(taskPad)}`;

            let batchHack = s.threadInfos[TaskType.batchHack];
            let batchHackStatsString = `${formatBigNumber(batchHack.inProgress).padStart(taskPad)}`;

            let batchWorkString = `Batch: W:${batchWeakenStatsString}, G:${batchGrowStatsString}, H:${batchHackStatsString}`;

            ns.print(`${s.target.hostname.padEnd(maxHostLength)} ${secString}, ${moneyString}, ${valueString}, ${prepWorkString}, ${batchWorkString}`);

        }
        ns.print(timestamp());
        let income = ns.getScriptIncome();

        let exp = ns.getScriptExpGain('controller.js', HOME);
        if (ns.isRunning('basic-controller.js', HOME)) {
            exp = ns.getScriptExpGain('basic-controller.js', HOME);
        }

        ns.print(`Stats: ${myFormatCurrency(income[0])}/s, ${formatBigNumber(exp)} xp/s`);

        await ns.sleep(SLEEP_TIME);
    }
}