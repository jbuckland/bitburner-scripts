import {SCRIPTS, SCRIPTS_OLD_CONTROLLERS} from 'lib/consts';
import {resizeScriptWindow} from 'lib/utils-ui';
import {NS} from 'NetscriptDefinitions';

export async function main(ns: NS) {
    //ns.disableLog('ALL');
    ns.clearLog();

    arrangeWindows(ns);
}


export function arrangeWindows(ns: NS) {
    resizeScriptWindow(ns, SCRIPTS_OLD_CONTROLLERS.homeController, [], 250, 350);
    resizeScriptWindow(ns, SCRIPTS_OLD_CONTROLLERS.crimeController1, [], 650, 700);
    resizeScriptWindow(ns, SCRIPTS_OLD_CONTROLLERS.hackController, [], 500, 200);
    resizeScriptWindow(ns, SCRIPTS_OLD_CONTROLLERS.batchController, [], 500, 200);
    resizeScriptWindow(ns, SCRIPTS_OLD_CONTROLLERS.playerController2, [], 600, 350);
    resizeScriptWindow(ns, SCRIPTS_OLD_CONTROLLERS.playerController, [], 700, 580);
    resizeScriptWindow(ns, SCRIPTS_OLD_CONTROLLERS.hacknet, [], 1000, 200);
    resizeScriptWindow(ns, SCRIPTS_OLD_CONTROLLERS.crimeController1, [], 1400, 700);

    resizeScriptWindow(ns, SCRIPTS.targetStats, [], 1500, 200);
    resizeScriptWindow(ns, SCRIPTS.startController, [], 600, 300);
}
