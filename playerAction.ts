import { COMPANY_FACTIONS, HACK_FACTIONS } from './consts';
import { NS } from './NetscriptDefinitions';
import { buyDarkwebTools, installBackdoors, joinFactions, purchaseAvailableAugmentations, upgradeHomeComputer } from './utils-player';

export async function doPlayerAction(ns: NS, debug: boolean = false) {

    if (debug) ns.print('doPlayerAction()');

    buyDarkwebTools(ns);

    upgradeHomeComputer(ns);

    let playerWasFocusing = ns.isFocused();
    //claimedEarnedFactionRep(ns, 1000);

    //workOnFactionRep(ns, );

    await installBackdoors(ns);

    joinFactions(ns, [
            ...Object.values(HACK_FACTIONS),
            ...Object.values(COMPANY_FACTIONS)
        ]
    );

    purchaseAvailableAugmentations(ns);

}
