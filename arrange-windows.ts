import {SCRIPTS} from './consts';
import {NS} from './NetscriptDefinitions';
import {resizeScriptWindow} from './utils';

export async function main(ns: NS) {
    //ns.disableLog('ALL');
    ns.clearLog();

    resizeScriptWindow(ns, SCRIPTS.homeController, [], 250, 350);

    resizeScriptWindow(ns, SCRIPTS.targetStats, [], 1500, 200);

    resizeScriptWindow(ns, SCRIPTS.hackController, [], 500, 200);

    resizeScriptWindow(ns, SCRIPTS.batchController, [], 500, 200);

    resizeScriptWindow(ns, SCRIPTS.playerController2, [], 600, 350);
    resizeScriptWindow(ns, SCRIPTS.playerController, [], 700, 580);

}