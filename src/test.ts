import { timestamp }from 'lib/utils';
import { NOTES, SoundPlayer }from 'lib/utils-sound';
import { NS } from 'NetscriptDefinitions';
import { INetscriptExtra } from 'types';

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

    //ns.print(JSON.stringify(ns.getCrimeStats(crimes.homicide.name), null, 4));
    ns.disableLog('ALL');
    ns.print(timestamp());

    //await playNote(NOTES.D5);
    playNote(NOTES.A4, 300);
    playNote(NOTES.D5, 300);
    await ns.sleep(300);
    playNote(NOTES.B4, 300);
    playNote(NOTES.E5, 300);

    function playNote(freq: number, duration: number) {
        // play note according to data-frequency attribute
        let player = new SoundPlayer();

        player.play(freq, 0.8, 'triangle').stop(duration / 1000.0);

    };

}
