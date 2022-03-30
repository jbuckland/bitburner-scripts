import {HOME, SCRIPTS} from './consts';
import {NS} from './NetscriptDefinitions';
import {ServerInfo} from './types';
import {
    formatBigNumber,
    formatBigTime,
    getAllServerInfo,
    getFirstAvailableRunnerForScriptThreads,
    getRandomId,
    getThreadsNeededToWeakenHost,
    round,
    timestamp
} from './utils';
import {buyNFGs} from './utils-player';
import {ITableData, Table} from './utils-table';


export async function main(ns: NS) {
    ns.tail();

    ns.disableLog('ALL');
    ns.clearLog();


    buyNFGs(ns);

}