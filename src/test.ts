import {HACK_FACTIONS} from '/lib/consts';
import {getFactionWorkRepGain} from '/lib/utils-source-code';
import {timestamp} from 'lib/utils';
import {NS} from 'NetscriptDefinitions';
import {INetscriptExtra} from 'types';

export async function main(ns: NS & INetscriptExtra) {
    ns.tail();

    //ns.disableLog('ALL');
    ns.clearLog();

    /*  let targets = getAllTargetInfo(ns);

      type foo = ServerInfo & { hackExp: number }

      let updatedTargets: foo[] = targets.map(t => {
              let server = ns.getServer(t.hostname);
              return {
                  ...t,
                  hackExp: ns.formulas.hacking.hackExp(server, player)
              };
          }
      );
      updatedTargets = updatedTargets.filter(t => t.reqHackSkill <= player.hacking);

      updatedTargets.sort((a, b) => b.growthParam - a.growthParam);

      updatedTargets.forEach(t => {
          ns.print(`${t.hostname}, growthP: ${t.growthParam}, reqHackSkill: ${t.reqHackSkill}, hackExp: ${t.hackExp}`);
      });

  */

    //ns.print(JSON.stringify(ns.singularity.getCrimeStats(crimes.homicide.name), null, 4));
    ns.disableLog('ALL');
    ns.print(timestamp());


    //get all remaining augments
    let player = ns.getPlayer();

    /*
        let augs: any[] = [];
    
    
        let joinedGangFactions = Object.values(GANG_FACTIONS).filter(gangFac => player.factions.includes(gangFac.name));
    
        let allFactions: IFaction[] = [
            ...Object.values(CITY_FACTIONS),
            ...Object.values(HACK_FACTIONS),
            ...Object.values(COMPANY_FACTIONS),
            ...joinedGangFactions
        ];
    
        allFactions = filterUnavailableCityFactions(ns, allFactions);
    
        if (player.factions.includes(OTHER_FACTIONS.netburner.name)) {
            allFactions.push(OTHER_FACTIONS.netburner);
        }
    
        //if we have a Gang, remove it's faction because we can't 'work' for them directly
        if (ns.gang.inGang()) {
            let gangFaction = ns.gang.getGangInformation().faction;
            allFactions = allFactions.filter(f => f.name !== gangFaction);
        }
    
    
    
        allFactions.forEach(faction => {
    
            let factionAugs = getUnownedFactionAugmentations(ns, faction.name)
                .filter(aName => !NON_HACKING_AUGMENTS.includes(aName))
                //.filter(aName => !augs.some(a => a.name === aName))
                .map(aName => {
                    return {
                        faction: faction.name,
                        duplicate: augs.some(a => a.name === aName),
                        name: aName
                    };
                });
    
            augs.push(...factionAugs);
    
    
        });
    
        //augs.sort((a, b) => a.faction.localeCompare(b.faction));
    
    
        augs.forEach(aug => {
            ns.print(aug);
        });
    
    */

    while (true) {
        player = ns.getPlayer();
        let factionName = HACK_FACTIONS.blackHand.name;
        let factionWorkGainRate = getFactionWorkRepGain(ns, player.currentWorkFactionName);

        ns.print(`${factionName} rep gain: ${factionWorkGainRate}/s`);

        await ns.sleep(1000);
    }

}
