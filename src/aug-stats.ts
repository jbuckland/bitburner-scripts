import { AugmentationStats, NS } from '/NetscriptDefinitions';
import { IFaction } from '/types';
import { CITY_FACTIONS, COMPANY_FACTIONS, GANG_FACTIONS, HACK_FACTIONS, NON_HACKING_AUGMENTS, OTHER_FACTIONS } from '/utils/consts';
import { formatBigNumber, formatCurrency, formatPercent, getUnownedFactionAugmentations } from '/utils/utils';
import { Table } from '/utils/utils-table';

export async function main(ns: NS) {
    ns.tail();
    ns.disableLog('ALL');
    ns.clearLog();

    let allFactions: IFaction[] = [
        ...Object.values(CITY_FACTIONS),
        ...Object.values(HACK_FACTIONS),
        ...Object.values(COMPANY_FACTIONS),
        ...Object.values(GANG_FACTIONS),
        OTHER_FACTIONS.netburner

    ];

    let allAugNamesList = [];

    let augData: {
        name: string,
        faction: string,
        stats: AugmentationStats,
        moneyCost: number,
        repCost: number,
        addRepCost: number

    }[] = [];

    allFactions.forEach(faction => {
        let factionAugs = getUnownedFactionAugmentations(ns, faction.name);
        factionAugs = factionAugs.filter(aug => !NON_HACKING_AUGMENTS.includes(aug));
        if (factionAugs.length > 0) {

            factionAugs.forEach(aug => {
                let stats = ns.getAugmentationStats(aug);

                let repCost = ns.getAugmentationRepReq(aug);
                let addRepCost = repCost - ns.getFactionRep(faction.name);

                augData.push({
                    name: aug,
                    faction: faction.name,
                    moneyCost: ns.getAugmentationPrice(aug),
                    repCost,
                    addRepCost,
                    stats
                });

            });
        }

    });
    augData.sort((a, b) => a.addRepCost - b.addRepCost);

    let table = new Table(ns);

    let tableData = augData.map(aug => {
        return {
            'Faction': aug.faction,
            'Augment': aug.name,
            'Rep. Cost': formatBigNumber(aug.repCost),
            'AddlRepCost:': formatBigNumber(aug.addRepCost),
            '$ Cost': formatCurrency(aug.moneyCost),
            '+Hack': (formatPercent((aug.stats.hacking_mult ?? 1) - 1)).toString(),
            '+H-Chance': (formatPercent((aug.stats.hacking_chance_mult ?? 1) - 1)).toString(),
            '+H-Exp': (formatPercent((aug.stats.hacking_exp_mult ?? 1) - 1)).toString(),
            '+H-Grow': (formatPercent((aug.stats.hacking_grow_mult ?? 1) - 1)).toString(),
            '+H-Money': (formatPercent((aug.stats.hacking_money_mult ?? 1) - 1)).toString(),
            '+H-Speed': (formatPercent((aug.stats.hacking_speed_mult ?? 1) - 1)).toString(),
            '+FactionRep': (formatPercent((aug.stats.faction_rep_mult ?? 1) - 1)).toString()

            //'Stats': JSON.stringify(aug.stats)

        };
    });

    table.setData(tableData);

    table.print();

}
