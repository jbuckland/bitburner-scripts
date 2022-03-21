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

    let remainingCompAugs: string[] = [];

    factionsToCheck.forEach(f => {
        let augs = getRemainingFactionAugmentations(ns, COMPANY_FACTIONS.kuai.name);

        augs.forEach(a => {
            if (!remainingCompAugs.includes(a)) {
                remainingCompAugs.push(a);
            }
        });
    });

    remainingCompAugs.forEach(a => {
        ns.print(a);
        let stats = ns.getAugmentationStats(a);
        //ns.print(JSON.stringify(stats, null, 4));
        //ns.print('');
    });

}



