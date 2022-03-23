import { COMPANY_FACTIONS } from './consts';
import { NS } from './NetscriptDefinitions';
import { ServerInfo } from './types';
import { getRemainingFactionAugmentations } from './utils';

interface TempInfos extends ServerInfo {
    hackExp?: number;
    hackExpPerSec?: number;
}

export async function main(ns: NS) {
    ns.tail();
    ns.clearLog();

    /*
        let servers: TempInfos[] = getAllServerInfo(ns);
    
        let player = ns.getPlayer();
    
        servers.forEach(s => {
    
            let nsServer = ns.getServer(s.hostname);
    
            s.hackExp = ns.formulas.hacking.hackExp(nsServer, player);
            s.hackExpPerSec = s.hackExp / s.hackTime;
    
        });
    
        servers.sort((a, b) => {
            return (a.hackExpPerSec ?? 0) - (b.hackExpPerSec ?? 0);
        });
    
        servers.forEach(i => {
            ns.print(`${i.hostname},hack exp:${Math.round(i.hackExp ?? 0)} time:${Math.round(i.hackTime)},  ${i.hackExpPerSec?.toPrecision(3)} hackExp/sec`);
        });
    */
    //ns.getAugmentationsFromFaction('MegaCorp');

    let factionsToCheck = [
        ...Object.values(COMPANY_FACTIONS).map(c => c.name)
    ];

    let remainingCompAugs: { name: string, factions: string[] }[] = [];
    let remainingAugsComp: { faction: string, augs: string[] }[] = [];

    factionsToCheck.forEach(f => {
        let augs = getRemainingFactionAugmentations(ns, f);

        augs.forEach(a => {

            let compAugs = remainingCompAugs.find(item => item.name === a);

            if (!compAugs) {
                compAugs = { name: a, factions: [] };
                remainingCompAugs.push(compAugs);
            }
            compAugs.factions.push(f);

            let augComps = remainingAugsComp.find(item => item.faction === f);
            if (!augComps) {
                augComps = { faction: f, augs: [] };
                remainingAugsComp.push(augComps);
            }
            augComps.augs.push(a);

        });

    });

    //show augmentations and which companies sell it
    /*
    remainingCompAugs.forEach(a => {
        ns.print(a);
        let stats = ns.getAugmentationStats(a.name);
        ns.print('---', stats);

    });
*/
    //show companies, and which augs they sell
    remainingAugsComp.forEach(c => {
        ns.print(c.faction);
        ns.print('---', c.augs);

    });

}



