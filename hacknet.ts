import { Hacknet, NS } from './NetscriptDefinitions';

export async function main(ns: NS) {

    const ALL_PARAM = (ns.args[0] ?? '' as string) == 'all';

    const MAX_LEVEL_TO_BUY = 143;
    const MAX_CORES_TO_BUY = 5;
    const MAX_NODES_TO_BUY = 16;

    ns.tail();
    const hn: Hacknet = ns.hacknet;
    let SLEEP_TIME = 0;
    const MAX_RAM = 64;

    while (true) {
        let SLEEP_TIME = 10;

        let minLevelIndex = 0;
        let minRamIndex = 0;
        let minCoreIndex = 0;

        let minLevelCost = Number.MAX_VALUE;
        let minRamCost = Number.MAX_VALUE;
        let minCoreCost = Number.MAX_VALUE;

        if (hn.numNodes() > 0) {
            for (let i = 0; i < hn.numNodes(); i++) {
                let node = hn.getNodeStats(i);

                if (node.level < MAX_LEVEL_TO_BUY || ALL_PARAM) {
                    let levelCost = hn.getLevelUpgradeCost(i, 1);
                    if (levelCost < minLevelCost) {
                        minLevelIndex = i;
                        minLevelCost = levelCost;
                    }
                }

                let ramCost = Number.MAX_VALUE;
                if (node.ram < MAX_RAM) {
                    ramCost = hn.getRamUpgradeCost(i, 1);

                }
                if (ramCost < minRamCost) {
                    minRamIndex = i;
                    minRamCost = ramCost;
                }

                if (!ALL_PARAM && node.cores < MAX_CORES_TO_BUY || ALL_PARAM) {

                    let coreCost = hn.getCoreUpgradeCost(i, 1);
                    if (coreCost < minCoreCost) {
                        minCoreIndex = i;
                        minCoreCost = coreCost;
                    }
                }
            }
        }

        let newNodeCost = Number.MAX_VALUE;
        if (hn.numNodes() < MAX_NODES_TO_BUY || ALL_PARAM) {
            newNodeCost = hn.getPurchaseNodeCost();

        }

        let player = ns.getPlayer();

        if (minLevelCost <= minRamCost && minLevelCost <= minCoreCost && minLevelCost <= newNodeCost) {
            let minNode = hn.getNodeStats(minLevelIndex);
            if (minLevelCost < player.money) {
                ns.print(`Upgrading LEVEL of ${minNode.name} from ${minNode.level}`);
                hn.upgradeLevel(minLevelIndex, 1);
            } else {
                SLEEP_TIME = 10000;
            }

        } else if (minRamCost <= minLevelCost && minRamCost <= minCoreCost && minRamCost <= newNodeCost) {
            let minNode = hn.getNodeStats(minRamIndex);
            if (minRamCost < player.money) {
                ns.print(`Upgrading RAM of ${minNode.name} from ${minNode.ram}`);
                hn.upgradeRam(minRamIndex, 1);

            } else {
                SLEEP_TIME = 10000;
            }

        } else if (minCoreCost <= minLevelCost && minCoreCost <= minRamCost && minCoreCost <= newNodeCost) {
            let minNode = hn.getNodeStats(minCoreIndex);
            if (minCoreCost < player.money) {
                ns.print(`Upgrading CORE of ${minNode.name} from ${minNode.cores}`);
                hn.upgradeCore(minCoreIndex, 1);
            } else {
                SLEEP_TIME = 10000;
            }
        } else if (newNodeCost <= minCoreCost && newNodeCost <= minLevelCost && newNodeCost <= minRamCost) {

            if (newNodeCost < player.money) {
                ns.print(`Purchasing new node number ${hn.numNodes() + 1}!`);
                hn.purchaseNode();
            } else {
                SLEEP_TIME = 10000;
            }

        } else {
            ns.print('ERROR! ???');
        }

        await ns.sleep(SLEEP_TIME);
    }

}

