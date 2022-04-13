import { NULL_PORT_DATA, PORTS } from 'lib/consts';
import { NS } from 'NetscriptDefinitions';
import { ServerEvent } from 'types';
import { timestamp } from 'lib/utils';

export async function main(ns: NS) {

    ns.disableLog('sleep');
    ns.tail();

    let port = ns.getPortHandle(PORTS.scriptCom);

    port.clear();

    while (true) {
        let dataString = port.read();

        if (dataString !== NULL_PORT_DATA) {

            let event: ServerEvent = JSON.parse(dataString as string);

            ns.print(timestamp(), event);
        }

        await ns.sleep(10);
    }

}
