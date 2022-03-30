import {NS} from './NetscriptDefinitions';
import {round} from './utils';
import {doInstallReset} from './utils-player';

export async function main(ns: NS) {

    let flags = ns.flags([['force', false]]);

    let reset = false;

    if (flags.force) {
        reset = true;
    } else {
        reset = await ns.prompt('Are you sure you want to reset?');
    }


    if (reset) {
        ns.tail();
        let countDown = 10;

        let countDownRefresh = 100;
        while (countDown > 0) {
            ns.clearLog();
            ns.print(`Resetting in ${round(countDown, 2)}`);
            ns.print('(Kill process to cancel)');
            await ns.sleep(countDownRefresh);
            countDown -= (countDownRefresh / 1000.0);
        }


        doInstallReset(ns);
    }

}
