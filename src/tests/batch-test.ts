import { doBatchFromRequestMultiRunner, makeBatchRequest } from '/old-controllers/batch';
import { NetscriptPort, NS } from 'NetscriptDefinitions';
import { ServerEvent } from 'types';
import { NULL_PORT_DATA, PORTS } from 'lib/consts';
import { formatBigRam, setSettings, timestamp } from 'lib/utils';

export async function main(ns: NS) {

    let controller = new BatchTest(ns);
    await controller.doRun();
}

export class BatchTest {
    private batchStatusPort: NetscriptPort;
    private SLEEP_TIME: number = 100;
    private targetHostname: string = 'n00dles';

    constructor(private ns: NS) {
        ns.tail();
        ns.disableLog('ALL');
        ns.enableLog('exec');

        this.batchStatusPort = ns.getPortHandle(PORTS.batchStatus);

    }

    public async doRun() {
        this.ns.print(timestamp());
        setSettings(this.ns, { hackPercent: 0.35 });
        let batchRequest = makeBatchRequest(this.ns, this.targetHostname);
        //debugLog(this.ns, DebugLevel.info, `Batch Request created!`, batchRequest);
        this.ns.print(`Total Ram needed for batch: ${formatBigRam(batchRequest.totalRamNeeded)}`);
        let success = await doBatchFromRequestMultiRunner(this.ns, batchRequest);

        if (success) {

        } else {
            this.ns.print('ERROR! batch failed!');

        }

        while (true) {
            this.readBatchStatusPort();
            await this.ns.sleep(this.SLEEP_TIME);
        }

    }

    private readBatchStatusPort() {
        let dataString = this.batchStatusPort.read();

        if (dataString !== NULL_PORT_DATA) {

            let event: ServerEvent = JSON.parse(dataString as string);

            let extra = JSON.parse(event.extra ?? '{}');

            this.ns.print(`${timestamp(event.timestamp)} Id: ${extra.batchId}, ${event.eventType} Target: ${event.target}, Runner: ${event.hostname}`);
        }

    }
}
