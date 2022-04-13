import {NS} from 'NetscriptDefinitions';
import {buyNFGs} from 'lib/utils-player';

export async function main(ns: NS) {
    ns.tail();

    ns.disableLog('ALL');
    ns.clearLog();

    buyNFGs(ns);

}
