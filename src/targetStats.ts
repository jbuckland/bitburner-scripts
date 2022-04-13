import { NS } from 'NetscriptDefinitions';
import { ITargetWorkInfo, TaskType } from 'types';
import { formatBigNumber, formatBigTime, getTargetValue, myFormatCurrency, round, timestamp } from 'lib/utils';
import { getAllTargetWorkInfo } from 'lib/utils-controller';
import { ITableData, Table } from 'lib/utils-table';

export async function main(ns: NS) {
    const SLEEP_TIME = 1000;

    ns.tail();
    ns.disableLog('ALL');

    let table = new Table(ns);
    table.SHOW_FOOTER = true;
    let tableData: ITableData[] = [];

    while (true) {
        tableData = [];
        ns.clearLog();

        let serverInfo = getAllTargetWorkInfo(ns);

        let MAX_ROWS_TO_SHOW = 30;
        if (serverInfo.length > MAX_ROWS_TO_SHOW) {
            serverInfo = serverInfo.slice(0, MAX_ROWS_TO_SHOW);
        }

        for (let i = 0; i < serverInfo.length; i++) {
            const s = serverInfo[i];

            let weakenSeconds = Math.round((s.target.weakenTime ?? 0) / 1000);
            let weakenString = `WeakTime: ${weakenSeconds.toString().padStart(4)}s`;

            let growthParamString = `GrowP: ${s.target.growthParam.toString().padStart(2)}`;
            let growTimeString = `GTime: ${formatBigTime(s.target.growTime).toString().padStart(5)}`;
            let valueString = `Value: ${round(getTargetValue(ns, s.target), 2).toString().padEnd(4, '0')}`;

            let currSecString = round(s.target.currSecurity, 1).toString().padStart(4);
            let minSecString = round(s.target.minSecurity ?? 0, 1).toString().padStart(2);
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

            //ns.print(`${s.target.hostname.padEnd(maxHostLength)} ${secString}, ${moneyString}, ${valueString}, ${prepWorkString}, ${batchWorkString}`);

            let readyForBatch = isReadyForBatch(s);

            let row: ITableData = {
                'Target Name': s.target.hostname,
                'Security': `${currSecString}/${minSecString}`,
                'Current $': myFormatCurrency(s.target.currMoney),
                'Max $': myFormatCurrency(s.target.maxMoney),
                '$/G-sec': '$' + round(getTargetValue(ns, s.target), 2).toString(),
                'W Curr': readyForBatch ? '-' : formatBigNumber(weaken.inProgress),
                'W Need': readyForBatch ? '-' : formatBigNumber(weaken.total),
                'G Curr': readyForBatch ? '-' : formatBigNumber(grow.inProgress),
                'G Need': readyForBatch ? '-' : formatBigNumber(grow.total),
                'Batch': '',
                'W': formatBigNumber(batchWeaken.inProgress),
                'G': formatBigNumber(batchGrow.inProgress),
                'H': formatBigNumber(batchHack.inProgress)
            };

            tableData.push(row);

        }
        table.setData(tableData);
        table.print();

        ns.print(timestamp());

        await ns.sleep(SLEEP_TIME);
    }

    function isReadyForBatch(workItem: ITargetWorkInfo): boolean {

        return workItem.threadInfos[TaskType.weaken].inProgress === 0 &&
            workItem.threadInfos[TaskType.weaken].total === 0 &&
            workItem.threadInfos[TaskType.grow].inProgress === 0 &&
            workItem.threadInfos[TaskType.grow].total === 0;
    }
}
