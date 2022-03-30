import { HOME, TOAST_DURATION, TOAST_VARIANT } from './consts';
import { NS } from './NetscriptDefinitions';
import { IServerFaction } from './types';
import { longConnect } from './utils';

export async function main(ns: NS) {
    let target = ns.args[0] as string;

    if (!target) {
        ns.print('ERROR! please specify a target!');
        ns.exit();
    }

    await installBackdoor(ns, { name: '', hostname: target });

}

export async function installBackdoor(ns: NS, faction: IServerFaction): Promise<boolean> {
    let success = false;
    let player = ns.getPlayer();

    if (!player.factions.includes(faction.name)) {
        let server = ns.getServer(faction.hostname);
        if (!server.backdoorInstalled) {
            if (server.hasAdminRights) {
                if (server.requiredHackingSkill <= player.hacking) {
                    ns.print(`Connecting to ${server.hostname} and installing backdoor!`);
                    longConnect(ns, server.hostname);
                    await ns.installBackdoor();
                    ns.toast(`backdoor installed on ${server.hostname}!`, TOAST_VARIANT.info, TOAST_DURATION);
                    ns.connect(HOME);
                }
            }
        }
    }

    return success;
}