import {displayHeader} from '/lib/utils-player';
import {FlagSchema, IGlobalSettings} from '/types';
import {addScripts} from 'addScripts';
import {DebugLevel, HacknetMode, HashSpendOptions, TOAST_DURATION, TOAST_VARIANT} from 'lib/consts';
import {debugLog, formatBigNumber, formatCurrency, getAvailablePlayerMoney, getHacknetHashGain, getSettings, indent, round, timestamp} from 'lib/utils';
import {AutocompleteData, Hacknet, NodeStats, NS, Player} from 'NetscriptDefinitions';

export function autocomplete(data: AutocompleteData, args: any[]) {
    data.flags(flagSchema);

    return [
        //...data.servers,
        //...data.scripts,
        //...data.txts
    ]; //return what you want to have in autocomplete
}

const flagSchema: FlagSchema = [
    ['money', false],
    ['bbSkill', false]
];

enum HacknetUpgradeType {
    core = 'Core',
    ram = 'RAM',
    level = 'Level'
}

interface HacknetUpgrade {
    costBenefit: number;
    node: NodeStats;
    nodeIndex: number;
    upgradeBenefit: number;
    upgradeCost: number;
    upgradeType: HacknetUpgradeType;

}

export async function main(ns: NS) {
    ns.tail();
    ns.disableLog('ALL');

    let flags = ns.flags(flagSchema);

    let spendTarget: HashSpendOptions = HashSpendOptions.money;
    if (flags.bbSkill) {
        spendTarget = HashSpendOptions.bbSkill;
    }

    let controller = new HacknetController(ns, spendTarget);
    await controller.doRun();

}

class HacknetController {
    private readonly COST_THRESHOLD_TO_NOTIFY = 1e9;
    private readonly MAX_RAM = 8192;
    private readonly MONEY_PCT_TO_USE = 1;
    private readonly SLEEP_TIME = 100;
    private availableMoney: number = 0;
    private bestUpgrade: HacknetUpgrade | undefined;
    private hn: Hacknet;
    private hnNodeCount: number = 0;
    private newNodeCost: number = 0;
    private player!: Player;
    private settings!: IGlobalSettings;
    private upgradeData: HacknetUpgrade[] = [];

    constructor(private ns: NS, private spendTarget: HashSpendOptions) {
        this.hn = ns.hacknet;
    }

    public async doRun() {
        //const MAX_RAM = 4096;

        while (true) {

            this.ns.print(timestamp());

            this.updateData();
            this.displayInfo();

            this.spendHashes();

            let shouldBuyNode = false;
            if (this.settings.hacknetMode === HacknetMode.money) {
                shouldBuyNode = this.newNodeCost < (this.settings.maxHashCostBen ?? 0);
            } else if (this.settings.hacknetMode === HacknetMode.hacking) {
                shouldBuyNode = true;
            }

            if (shouldBuyNode && this.availableMoney > this.newNodeCost) {
                await this.buyNextNode();

            } else {

                //debugLog(ns, DebugLevel.info, `Hacknet Upgrades:`, this.upgradeData, this.settings.hacknetMode);

                if (this.bestUpgrade) {

                    if (this.availableMoney >= this.bestUpgrade.upgradeCost) {
                        this.buyUpgrade(this.bestUpgrade);
                        this.availableMoney -= this.bestUpgrade.upgradeCost;
                    }

                }

            }

            await this.ns.sleep(this.SLEEP_TIME);

        }
    }

    public updateData() {
        this.settings = getSettings(this.ns);
        this.player = this.ns.getPlayer();
        this.availableMoney = getAvailablePlayerMoney(this.ns, this.player, this.settings);
        this.upgradeData = this.getUpgradeData();
        if (this.upgradeData.length > 0) {
            this.upgradeData = this.upgradeData.filter(u => u.costBenefit < (this.settings.maxHashCostBen ?? 0));
            if (this.settings.hacknetMode === HacknetMode.hacking) {
                this.upgradeData = this.upgradeData.filter(u => u.upgradeType === HacknetUpgradeType.ram);
            }

            this.upgradeData.sort((a, b) => {
                return a.costBenefit - b.costBenefit;
            });
            this.bestUpgrade = this.upgradeData[0];
        }
        this.newNodeCost = this.hn.getPurchaseNodeCost();
        this.hnNodeCount = this.hn.numNodes();
    }

    private async buyNextNode() {
        //buy a node

        //this.ns.print(`${timestamp()}Purchasing new node number ${this.hn.numNodes() + 1}!`);
        let nodeNum = this.hn.purchaseNode();
        if (nodeNum > -1) {
            this.ns.toast(`Hacknet Node #${nodeNum} purchased for \$${formatBigNumber(this.newNodeCost)}`, TOAST_VARIANT.success, TOAST_DURATION);
            this.availableMoney -= this.newNodeCost;
            await addScripts(this.ns, this.ns.hacknet.getNodeStats(nodeNum).name, true);
        }
    }

    private buyUpgrade(upgrade: HacknetUpgrade): boolean {
        let success = false;

        let msg = '';
        if (upgrade.upgradeType === HacknetUpgradeType.level) {
            msg = `Upgrading LEVEL of ${upgrade.node.name} from ${upgrade.node.level} to ${upgrade.node.level + 1}`;
            success = this.hn.upgradeLevel(upgrade.nodeIndex, 1);

        } else if (upgrade.upgradeType === HacknetUpgradeType.core) {
            msg = `Upgrading CORES of ${upgrade.node.name} from ${upgrade.node.cores} to ${upgrade.node.cores + 1}`;
            success = this.hn.upgradeCore(upgrade.nodeIndex, 1);

        } else if (upgrade.upgradeType === HacknetUpgradeType.ram) {
            msg = `Upgrading RAM of ${upgrade.node.name} from ${upgrade.node.ram} to ${upgrade.node.ram * 2}`;
            success = this.hn.upgradeRam(upgrade.nodeIndex, 1);
        } else {
            debugLog(this.ns, DebugLevel.error, `Unknown HacknetUpgradeType! ${upgrade.upgradeType}`);
        }

        if (msg.length > 0) {

            if (true || upgrade.upgradeCost > this.COST_THRESHOLD_TO_NOTIFY) {

                this.ns.toast(`${msg} for ${formatCurrency(upgrade.upgradeCost)}`, TOAST_VARIANT.success, TOAST_DURATION);

            }
        }

        return success;
    }

    private displayInfo() {
        this.ns.clearLog();
        displayHeader(this.ns);

        this.ns.print('Hacknet Info:');
        this.ns.print(`${indent()}Node Count: ${this.hnNodeCount}, Next Cost: ${formatCurrency(this.newNodeCost)}`);
        this.ns.print(`${indent()}Hashes: ${round(this.ns.hacknet.numHashes(), 1)}, ${round(getHacknetHashGain(this.ns), 3).toFixed(3)}/sec`);
        this.ns.print(`${indent()}Using Hashes to '${this.spendTarget}'`);
        this.ns.print('');

        this.ns.print(`Upgrades:`);
        this.ns.print(`${indent()}Max Cost/Ben: ${formatCurrency(this.settings.maxHashCostBen ?? 0)}`);
        if (this.bestUpgrade) {
            let name = this.bestUpgrade.node.name;
            let type = this.bestUpgrade.upgradeType;
            let cost = `\$${formatBigNumber(this.bestUpgrade.upgradeCost)}`;
            let costBen = formatCurrency(this.bestUpgrade.costBenefit);
            this.ns.print(`${indent()}Next: [${name}] +${type}`);
            this.ns.print(`${indent()}Cost: ${cost}, Benefit: ${round(this.bestUpgrade.upgradeBenefit, 3).toFixed(3)}, Cost/Ben: ${costBen}`);
        }

        this.ns.print('');

    }

    private getUpgradeData(): HacknetUpgrade[] {
        let upgradeList: HacknetUpgrade[] = [];

        let multipliers = this.ns.getHacknetMultipliers();
        for (let i = 0; i < this.hnNodeCount; i++) {

            let node = this.hn.getNodeStats(i);
            let levelUpgrade = this.makeHacknetUpgradeInfo(node, i, HacknetUpgradeType.level, this.player, multipliers.production);
            upgradeList.push(levelUpgrade);

            if (node.ram < this.MAX_RAM) {
                let ramUpgrade = this.makeHacknetUpgradeInfo(node, i, HacknetUpgradeType.ram, this.player, multipliers.production);
                upgradeList.push(ramUpgrade);
            }

            let coreUpgrade = this.makeHacknetUpgradeInfo(node, i, HacknetUpgradeType.core, this.player, multipliers.production);
            upgradeList.push(coreUpgrade);

        }

        return upgradeList;
    }

    private makeHacknetUpgradeInfo(
        node: NodeStats,
        nodeIndex: number,
        upgradeType: HacknetUpgradeType,
        player: Player,
        prodMultiplier: number
    ): HacknetUpgrade {

        node = this.hn.getNodeStats(nodeIndex);
        let upgradeCost = 0;
        let afterLevel = node.level;
        let afterRam = node.ram;
        let afterCores = node.cores;

        if (upgradeType === HacknetUpgradeType.level) {
            upgradeCost = this.ns.formulas.hacknetServers.levelUpgradeCost(node.level, 1, player.hacknet_node_level_cost_mult);
            afterLevel += 1;
        } else if (upgradeType === HacknetUpgradeType.ram) {
            upgradeCost = this.ns.formulas.hacknetServers.ramUpgradeCost(node.ram, 1, player.hacknet_node_ram_cost_mult);
            afterRam *= 2;

        } else if (upgradeType === HacknetUpgradeType.core) {
            upgradeCost = this.ns.formulas.hacknetServers.coreUpgradeCost(node.cores, 1, player.hacknet_node_core_cost_mult);
            afterCores += 1;
        }

        let upgradedGainRate = this.ns.formulas.hacknetServers.hashGainRate(afterLevel, 0, afterRam, afterCores, prodMultiplier);

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

    private spendHashes() {
        let upgradeCost = this.hn.hashCost(this.spendTarget);

        if (this.spendTarget === HashSpendOptions.money) {
            let soldCount = 0;

            while (this.hn.numHashes() > upgradeCost) {
                if (this.hn.spendHashes(HashSpendOptions.money)) {
                    soldCount++;
                }
            }
            if (soldCount > 0) {
                this.ns.print(`${timestamp()}Sold ${upgradeCost * soldCount} hashes for \$${soldCount}m!!`);
            }
        } else if (this.spendTarget === HashSpendOptions.bbSkill) {

            if (this.hn.spendHashes(HashSpendOptions.bbSkill)) {
                this.ns.print(`${timestamp()}Exchanged ${upgradeCost} hashes for Blade Burner SP!!`);
            }

        }

    }
}



