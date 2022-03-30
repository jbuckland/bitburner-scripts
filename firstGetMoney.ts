import { HOME } from './consts';
import { NS } from './NetscriptDefinitions';
import { timestamp } from './utils';

interface FirstTarget {
    name: string,
    hasRoot: boolean,
    reqHack: number,
    currSecurity: number;
    minSecurity: number;
}

export async function main(ns: NS) {

    ns.tail();
    ns.disableLog('getServerSecurityLevel');
    ns.disableLog('getServerRequiredHackingLevel');
    ns.disableLog('getServerMinSecurityLevel');
    ns.disableLog('getServerRequiredHackingLevel');
    ns.disableLog('scan');

    while (true) {

        let hosts = ns.scan(HOME);

        let targets: FirstTarget[] = [];
        for (let i = 0; i < hosts.length; i++) {
            const host = hosts[i];
            //const server = ns.getServer(host); //2GB

            targets.push({
                name: host,
                currSecurity: ns.getServerSecurityLevel(host),
                minSecurity: ns.getServerMinSecurityLevel(host),
                hasRoot: ns.hasRootAccess(host),
                reqHack: ns.getServerRequiredHackingLevel(host)
            });

        }
        targets = targets.filter(t => t.hasRoot);

        targets.sort((a, b) => {
            return a.currSecurity - b.currSecurity;
        });

        if (targets.length > 0) {
            let target = targets[0];

            ns.print(`${timestamp()} [${target.name}] Security: ${target.currSecurity}/${target.minSecurity}`);
            if (target.currSecurity > target.minSecurity + (0.05)) {
                await ns.weaken(target.name);
            } else {
                await ns.hack(target.name);
            }

        }

        await ns.sleep(50);
        ns.print('');
    }
}