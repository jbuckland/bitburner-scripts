import { Hacknet, NS } from './NetscriptDefinitions';
import { formatBigNumber, round, timestamp } from './utils';

enum HacknetUpgradeType {
    core = 'Core',
    ram = 'RAM',
    level = 'Level'
}

interface HacknetUpgrade {
    nodeId: number;
    upgradeType: HacknetUpgradeType;
    upgradeCost: number;
    upgradeBenefit: number;
    costBenefit: number;

}

export async function main(ns: NS) {

    const ALL_PARAM = (ns.args[0] ?? '' as string) == 'all';

    const MAX_LEVEL_TO_BUY = 143;
    const MAX_CORES_TO_BUY = 50;
    const MAX_NODES_TO_BUY = 16;
    let MONEY_PCT_TO_USE = .80;
    let SLEEP_TIME = 0;
    const MAX_RAM = 64;

    const hn: Hacknet = ns.hacknet;
    ns.tail();
    ns.disableLog('ALL');
    while (true) {
        let SLEEP_TIME = 2000;

        let minLevelIndex = 0;
        let minRamIndex = 0;
        let minCoreIndex = 0;

        let minLevelCost = Number.MAX_VALUE;
        let minRamCost = Number.MAX_VALUE;
        let minCoreCost = Number.MAX_VALUE;

        ns.print(timestamp());

        spendHashes();

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

        let availableMoney = player.money * MONEY_PCT_TO_USE;//only spend up to 75% of current money

        if (minLevelCost <= minRamCost && minLevelCost <= minCoreCost && minLevelCost <= newNodeCost) {
            let minNode = hn.getNodeStats(minLevelIndex);
            if (minLevelCost < availableMoney) {
                ns.print(`${timestamp()}Upgrading LEVEL of ${minNode.name} from ${minNode.level} to ${minNode.level + 1}`);
                hn.upgradeLevel(minLevelIndex, 1);
            }

        } else if (minRamCost <= minLevelCost && minRamCost <= minCoreCost && minRamCost <= newNodeCost) {
            let minNode = hn.getNodeStats(minRamIndex);
            if (minRamCost < availableMoney) {
                ns.print(`${timestamp()}Upgrading RAM of ${minNode.name} from ${minNode.ram} to ${minNode.ram * 2}`);
                hn.upgradeRam(minRamIndex, 1);

            }

        } else if (minCoreCost <= minLevelCost && minCoreCost <= minRamCost && minCoreCost <= newNodeCost) {
            let minNode = hn.getNodeStats(minCoreIndex);
            if (minCoreCost < availableMoney) {
                ns.print(`${timestamp()}Upgrading CORE of ${minNode.name} from ${minNode.cores}`);
                hn.upgradeCore(minCoreIndex, 1);
            }
        } else if (newNodeCost <= minCoreCost && newNodeCost <= minLevelCost && newNodeCost <= minRamCost) {

            if (newNodeCost < availableMoney) {
                ns.print(`${timestamp()}Purchasing new node number ${hn.numNodes() + 1}!`);
                hn.purchaseNode();
            }

        } else {
            ns.print('ERROR! ???');
        }

        await ns.sleep(SLEEP_TIME);

        function spendHashes() {

            let SELL_COST = 4;
            let hashesSoldCount = 0;

            while (ns.hacknet.numHashes() > SELL_COST) {
                ns.hacknet.spendHashes('Sell for Money');
                hashesSoldCount++;
            }
            if (hashesSoldCount > 0) {
                ns.print(`${timestamp()}Selling hashes for \$${hashesSoldCount}m!!`);
            }

        }
    }

}

