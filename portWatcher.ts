import { NULL_PORT_DATA, PORTS } from './consts';
import { NS } from './NetscriptDefinitions';
import { ServerEvent } from './types';
import { timestamp } from './utils';

export async function main(ns: NS) {

    ns.disableLog('sleep');
    ns.tail();

    let flags = ns.flags([['port', PORTS.scriptCom]]);

    const PORT_NUM = flags.port;

    ns.print(`portWatcher, flags:${flags}, PORT_NUM:${PORT_NUM}`);

    let port = ns.getPortHandle(PORT_NUM);

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