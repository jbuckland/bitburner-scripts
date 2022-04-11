import { crimes } from './crime_consts';
import { NS } from './NetscriptDefinitions';
import { INetscriptExtra } from './types';

export async function main(ns: NS & INetscriptExtra) {
    ns.tail();

    //ns.disableLog('ALL');
    ns.clearLog();
    let player = ns.getPlayer();

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
    ns.print(JSON.stringify(ns.getCrimeStats(crimes.homicide.name), null, 4));

}






