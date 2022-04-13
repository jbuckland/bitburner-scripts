import { doBatchFromRequestMultiRunner, makeBatchRequest } from '/old-controllers/batch';
import { NS } from 'NetscriptDefinitions';
import { ITargetWorkInfo } from 'types';
import { INDENT_STRING } from 'lib/consts';
import { singleHack } from 'lib/hack-utils';
import { formatPercent, getAllRamUsage, getSettings, round, setSettings, timestamp } from 'lib/utils';
import { getAllTargetWorkInfo, isReadyForBatch } from 'lib/utils-controller';

export async function main(ns: NS) {
    let cont = new BatchController(ns);
    await cont.doRun();

}

export class BatchController {

    private readonly BATCH_PERCENT = 0.5;
    private SLEEP_TIME: number = 2000;

    private readonly HACK_PCT_MIN = 0.005;
    private readonly HACK_PCT_MAX = 1;
    private readonly HACK_PCT_SCALAR = 0.1;

    public constructor(private ns: NS) {
        ns.tail();
        ns.disableLog('ALL');

    }

    public async doRun() {
        while (true) {
            let targetWorkInfos = getAllTargetWorkInfo(this.ns);
            let batchSuccesses = 0;
            if (targetWorkInfos.length > 0) {
                let workReadyForBatch = targetWorkInfos.filter(w => isReadyForBatch(w));

                if (workReadyForBatch.length > 0) {

                    batchSuccesses = await this.doMaxBatches(workReadyForBatch, this.BATCH_PERCENT);
                    this.ns.print(`${timestamp()} Batches started: ${batchSuccesses}`);

                    if (batchSuccesses === 0) {
                        //decrease the hack percent
                        let settings = getSettings(this.ns);

                        let newHackPercent = (settings.hackPercent ?? 0) * (1 - this.HACK_PCT_SCALAR);
                        newHackPercent = Math.max(round(newHackPercent, 3), this.HACK_PCT_MIN);

                        if (newHackPercent !== settings.hackPercent) {
                            setSettings(this.ns, { hackPercent: newHackPercent });
                            this.ns.print(`${timestamp()} Lowering 'hackPercent' to ${formatPercent(newHackPercent, 1)}`);
                        }
                    } else if (batchSuccesses >= workReadyForBatch.length) {
                        let settings = getSettings(this.ns);

                        let newHackPercent = (settings.hackPercent ?? 0) * (1 + this.HACK_PCT_SCALAR);
                        newHackPercent = Math.min(round(newHackPercent, 3), this.HACK_PCT_MAX);

                        if (newHackPercent !== settings.hackPercent) {
                            setSettings(this.ns, { hackPercent: newHackPercent });
                            this.ns.print(`${timestamp()} Raising 'hackPercent' to ${formatPercent(newHackPercent, 1)}`);
                        }

                    }

                } else {
                    this.ns.print(`${timestamp()}No targets are ready for batches!`);
                    let minHackTarget = targetWorkInfos.find(w => !isReadyForBatch(w));
                    if (minHackTarget) {
                        singleHack(this.ns, minHackTarget.target.hostname);
                    }

                }

            }

            await this.ns.sleep(this.SLEEP_TIME);
        }
    }

    private async doMaxBatches(targetWork: ITargetWorkInfo[], ramPercentLimit: number): Promise<number> {
        //this.ns.print(`${timestamp()} Running batches!`);
        const MAX_PASSES = 5;

        let totalSuccessfulBatchCount = 0;
        let totalBatchRamUsed = 0;

        let successfulBatchesThisRun = 0;

        let batchPassCount = 0;

        let batchRunThisPass = false;

        let usage = getAllRamUsage(this.ns);
        let maxBatchRamToUse = ramPercentLimit * usage.totalMax;
        let batchRamUsed = usage.batchRam;
        let batchUsagePercent = batchRamUsed / usage.totalMax;

        while (batchRamUsed < maxBatchRamToUse && batchPassCount < MAX_PASSES) {
            batchPassCount++;
            batchRunThisPass = false;
            successfulBatchesThisRun = 0;

            for (let i = 0; i < targetWork.length; i++) {
                const work = targetWork[i];

                if (isReadyForBatch(work)) {

                    let batchRequest = makeBatchRequest(this.ns, work.target.hostname);
                    //debugLog(this.ns, DebugLevel.info, `Batch Request created!`, batchRequest);
                    let success = await doBatchFromRequestMultiRunner(this.ns, batchRequest);
                    if (success) {
                        totalSuccessfulBatchCount++;
                        successfulBatchesThisRun++;
                        totalBatchRamUsed += batchRequest.totalRamNeeded;
                        batchRamUsed += batchRequest.totalRamNeeded;
                        batchRunThisPass = true;
                    } else {
                        //this.ns.print(`${timestamp()}Failed to run batch on ${batchRequest.target}, needed ${formatBigRam(batchRequest.totalRamNeeded)}`);
                    }
                }

            }
            if (successfulBatchesThisRun > 0) {
                this.ns.print(`${timestamp()}${INDENT_STRING}Batch Pass #${batchPassCount}: Started: ${successfulBatchesThisRun}`);
            }

            await this.ns.sleep(500);

        }

        return totalSuccessfulBatchCount;
    }
}
