import { NULL_PORT_DATA, SETTINGS_PORT } from './consts';
import { NS } from './NetscriptDefinitions';
import { IGlobalSettings } from './types';

export async function main(ns: NS) {

    let flags = ns.flags([
        ['mode', '']
    ]);

    //default is to read the settings out

    let settingsPort = ns.getPortHandle(SETTINGS_PORT);

    let portData = settingsPort.peek();
    if (portData === NULL_PORT_DATA) {
        let settings: IGlobalSettings = {
            mode: 'normal'
        };

        settingsPort.write(JSON.stringify(settings));
    }

    //ns.print('globalSettings:', settings);

}
