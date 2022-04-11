import { addScripts } from './addScripts';
import { DebugLevel, HacknetMode, TOAST_DURATION, TOAST_VARIANT } from './consts';
import { Hacknet, NodeStats, NS, Player } from './NetscriptDefinitions';
import { debugLog, formatBigNumber, getSettings, round, timestamp } from './utils';

enum HacknetUpgradeType {
    core = 'Core',
    ram = 'RAM',
    level = 'Level'
}

interface HacknetUpgrade {
    nodeIndex: number;
    node: NodeStats;
    upgradeType: HacknetUpgradeType;
    upgradeCost: number;
    upgradeBenefit: number;
    costBenefit: number;

}

export async function main(ns: NS) {

    const ALL_PARAM = (ns.args[0] ?? '' as string) == 'all';

    //const MAX_COST_BEN = 5e9; //billion

    const MAX_LEVEL_TO_BUY = ALL_PARAM ? Number.MAX_VALUE : 143;
    const MAX_CORES_TO_BUY = ALL_PARAM ? Number.MAX_VALUE : 50;
    const MAX_NODES_TO_BUY = ALL_PARAM ? Number.MAX_VALUE : 16;

    let MONEY_PCT_TO_USE = 1;
    const MAX_RAM = 8192;
    //const MAX_RAM = 4096;

    const hn: Hacknet = ns.hacknet;
    ns.tail();
    ns.disableLog('ALL');

    while (true) {
        let SLEEP_TIME = 1000;
        let settings = getSettings(ns);
        ns.print(timestamp());

        spendHashes();

        let upgradeData = getUpgradeData();

        let newNodeCost = Number.MAX_VALUE;
        if (hn.numNodes() < MAX_NODES_TO_BUY) {
            newNodeCost = hn.getPurchaseNodeCost();
        }

        let player = ns.getPlayer();

        let availableMoney = player.money * MONEY_PCT_TO_USE;//only spend up to 75% of current money

        let shouldBuyNode = false;
        if (settings.hacknetMode === HacknetMode.money) {
            shouldBuyNode = newNodeCost < (settings.maxHashCostBen ?? 0);
        } else if (settings.hacknetMode === HacknetMode.hacking) {
            shouldBuyNode = true;
        }

        if (shouldBuyNode && availableMoney > newNodeCost) {
            //buy a node

            ns.print(`${timestamp()}Purchasing new node number ${hn.numNodes() + 1}!`);
            let nodeNum = hn.purchaseNode();
            if (nodeNum > -1) {
                ns.toast(`Hacknet Node #${nodeNum} purchased for \$${formatBigNumber(newNodeCost)}`, TOAST_VARIANT.success, TOAST_DURATION);
                await addScripts(ns, ns.hacknet.getNodeStats(nodeNum).name, true);
            }

        } else {

            if (settings.hacknetMode === HacknetMode.money) {

                upgradeData = upgradeData.filter(u => u.costBenefit < (settings.maxHashCostBen ?? 0));

            } else if (settings.hacknetMode === HacknetMode.hacking) {
                upgradeData = upgradeData.filter(u => u.upgradeType === HacknetUpgradeType.ram);

            }

            upgradeData.sort((a, b) => {
                return a.costBenefit - b.costBenefit;
            });
            //debugLog(ns, DebugLevel.info, `Hacknet Upgrades:`, upgradeData, settings.hacknetMode);

            if (upgradeData.length > 0) {
                let bestUpgrade = upgradeData[0];

                let name = bestUpgrade.node.name;
                let type = bestUpgrade.upgradeType;
                let cost = `\$${formatBigNumber(bestUpgrade.upgradeCost)}`;
                let costBen = formatBigNumber(bestUpgrade.costBenefit);
                ns.print(`${timestamp()}Best Upgrade: ${name} ${type}, Cost: ${cost}, Benefit: ${round(bestUpgrade.upgradeBenefit, 6)}, Cost/Ben: ${costBen}`);

                if (availableMoney >= bestUpgrade.upgradeCost) {
                    buyUpgrade(bestUpgrade);

                }

            }

        }

        await ns.sleep(SLEEP_TIME);

    }

    function buyUpgrade(upgrade: HacknetUpgrade): boolean {
        let success = false;

        if (upgrade.upgradeType === HacknetUpgradeType.level) {
            ns.print(`${timestamp()}Upgrading LEVEL of ${upgrade.node.name} from ${upgrade.node.level} to ${upgrade.node.level + 1}`);
            success = hn.upgradeLevel(upgrade.nodeIndex, 1);

        } else if (upgrade.upgradeType === HacknetUpgradeType.core) {
            ns.print(`${timestamp()}Upgrading CORES of ${upgrade.node.name} from ${upgrade.node.cores} to ${upgrade.node.cores + 1}`);
            success = hn.upgradeCore(upgrade.nodeIndex, 1);

        } else if (upgrade.upgradeType === HacknetUpgradeType.ram) {
            ns.print(`${timestamp()}Upgrading RAM of ${upgrade.node.name} from ${upgrade.node.ram} to ${upgrade.node.ram * 2}`);
            success = hn.upgradeRam(upgrade.nodeIndex, 1);
        } else {
            debugLog(ns, DebugLevel.error, `Unknown HacknetUpgradeType! ${upgrade.upgradeType}`);
        }

        return success;
    }

    function getUpgradeData(): HacknetUpgrade[] {
        let upgradeList: HacknetUpgrade[] = [];

        let player = ns.getPlayer();
        let nodeCount = ns.hacknet.numNodes();
        let multipliers = ns.getHacknetMultipliers();
        for (let i = 0; i < nodeCount; i++) {

            let node = ns.hacknet.getNodeStats(i);
            if (node.level < MAX_LEVEL_TO_BUY) {
                let levelUpgrade = makeHacknetUpgradeInfo(node, i, HacknetUpgradeType.level, player, multipliers.production);
                upgradeList.push(levelUpgrade);
            }

            if (node.ram < MAX_RAM) {
                let ramUpgrade = makeHacknetUpgradeInfo(node, i, HacknetUpgradeType.ram, player, multipliers.production);
                upgradeList.push(ramUpgrade);
            }

            if (node.cores < MAX_CORES_TO_BUY) {
                let coreUpgrade = makeHacknetUpgradeInfo(node, i, HacknetUpgradeType.core, player, multipliers.production);
                upgradeList.push(coreUpgrade);
            }

        }

        return upgradeList;
    }

    function makeHacknetUpgradeInfo(node: NodeStats, nodeIndex: number, upgradeType: HacknetUpgradeType, player: Player, prodMultiplier: number): HacknetUpgrade {

        node = ns.hacknet.getNodeStats(nodeIndex);
        let upgradeCost = 0;
        let afterLevel = node.level;
        let afterRam = node.ram;
        let afterCores = node.cores;

        if (upgradeType === HacknetUpgradeType.level) {
            upgradeCost = ns.formulas.hacknetServers.levelUpgradeCost(node.level, 1, player.hacknet_node_level_cost_mult);
            afterLevel += 1;
        } else if (upgradeType === HacknetUpgradeType.ram) {
            upgradeCost = ns.formulas.hacknetServers.ramUpgradeCost(node.ram, 1, player.hacknet_node_ram_cost_mult);
            afterRam *= 2;

        } else if (upgradeType === HacknetUpgradeType.core) {
            upgradeCost = ns.formulas.hacknetServers.coreUpgradeCost(node.cores, 1, player.hacknet_node_core_cost_mult);
            afterCores += 1;
        }

        let upgradedGainRate = ns.formulas.hacknetServers.hashGainRate(afterLevel, 0, afterRam, afterCores, prodMultiplier);

        let upgradeBenefit = upgradedGainRate - node.production;
        //ns.print(`#${nodeIndex}, ${upgradeType.padStart(5)}: node.production:${round(node.production, 6)}, upgradedGainRate:${round(upgradedGainRate, 6)}, upgradeBenefit:${round(upgradeBenefit, 6)}`);

        let upgrade: HacknetUpgrade = {
            nodeIndex: nodeIndex,
            node: node,
            upgradeType: upgradeType,
            upgradeCost: upgradeCost,
            upgradeBenefit: upgradeBenefit,
            costBenefit: 0
        };
        upgrade.costBenefit = upgrade.upgradeCost / upgrade.upgradeBenefit;
        return upgrade;
    }

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

