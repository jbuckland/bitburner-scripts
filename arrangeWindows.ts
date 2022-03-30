import { SCRIPTS } from './consts';
import { NS } from './NetscriptDefinitions';

export async function main(ns: NS) {
    //ns.disableLog('ALL');
    ns.clearLog();

    let doc = document;

    let scriptName = SCRIPTS.playerController;
    let desiredWidth = 950;
    let desiredHeight = 200;

    let windowElement = doc.querySelector(`[title="${scriptName} "]`)?.parentElement?.parentElement?.parentElement?.parentElement;

    if (windowElement) {
        ns.print(`we found the window for ${scriptName}!`);

        windowElement.style.width = `${desiredWidth}px`;
        //windowElement.style.height = `${desiredHeight}px`;

        //window.

    }

}