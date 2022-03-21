import { DARK_DATA, HOME } from './consts';
import { NS } from './NetscriptDefinitions';
import { TOAST_VARIANT } from './types';
import { getAllHosts, longConnect } from './utils';

export async function main(ns: NS) {
    ns.disableLog('ALL');
    ns.clearLog();

    let player = ns.getPlayer();

    let playersTools = {
        brute: ns.fileExists(DARK_DATA.tools.brute.name, HOME),
        ftp: ns.fileExists(DARK_DATA.tools.ftp.name, HOME),
        smtp: ns.fileExists(DARK_DATA.tools.smtp.name, HOME),
        http: ns.fileExists(DARK_DATA.tools.http.name, HOME),
        sql: ns.fileExists(DARK_DATA.tools.sql.name, HOME)
    };

    doNuking();

    //doBackdooring();

    function doNuking() {
        let nukedCount = 0;
        let newNukedCount = 0;

        for (let i = 0; i < getAllHosts(ns).length; i++) {
            ns.connect(HOME);

            let hostname = getAllHosts(ns)[i];

            // start the nuking process		
            let server = ns.getServer(hostname);

            if (playersTools.brute && !server.sshPortOpen) {
                ns.brutessh(server.hostname);
            }

            if (playersTools.ftp && !server.ftpPortOpen) {
                ns.ftpcrack(server.hostname);
            }

            if (playersTools.smtp && !server.smtpPortOpen) {
                ns.relaysmtp(server.hostname);
            }

            if (playersTools.http && !server.httpPortOpen) {
                ns.httpworm(server.hostname);
            }

            if (playersTools.sql && !server.sqlPortOpen) {
                ns.sqlinject(server.hostname);
            }

            // refresh
            server = ns.getServer(hostname);

            if (!server.hasAdminRights) {
                if (server.openPortCount >= server.numOpenPortsRequired) {
                    ns.print(`${server.hostname} can now be nuked!!`);
                    ns.nuke(server.hostname);
                    newNukedCount++;
                    nukedCount++;
                } else {
                    //ns.print(`not enough open ports to nuke ${server.hostname}`)
                }

                // refresh
                server = ns.getServer(hostname);

            } else {
                //ns.print(`${server.hostname} already nuked!`)

                nukedCount++;
            }

        }

        if (newNukedCount > 0) {
            ns.toast(`${newNukedCount} new servers nuked!`, 'info' as TOAST_VARIANT, null);
        }

        ns.print(`NUKE: ${newNukedCount} new and ${nukedCount} total!`);
        ns.print('');
    }

    async function doBackdooring() {
        let backedCount = 0;
        let newBackedCount = 0;

        for (let i = 0; i < getAllHosts(ns).length; i++) {
            let hostname = getAllHosts(ns)[i];
            let server = ns.getServer(hostname);
            if (server.hasAdminRights) {
                if (server.hackDifficulty > 0) {
                    if (server.requiredHackingSkill < player.hacking) {

                        if (!server.backdoorInstalled) {
                            longConnect(ns, server.hostname);

                            ns.print(`Connected to ${server.hostname}, backdooring!`);
                            //ns.print(`${server.hostname} difficulty:${server.hackDifficulty}, player hacking:${player.hacking}`, server);
                            await ns.installBackdoor();
                            backedCount++;
                            newBackedCount++;

                        } else {
                            //ns.print(`${server.hostname} already backdoored!`);
                            backedCount++;
                        }
                    } else {
                        //ns.print(`${server.hostname} difficulty is ${server.requiredHackingSkill}, too hard to hack!`);
                    }
                } else {
                    //ns.print(`${server.hostname} has no difficulty, skipping`);
                }
            } else {
                //ns.print(`${server.hostname} has no admin rights, skipping`);
            }
        }

        ns.print('');
        ns.print(`BACKDOOR: ${newBackedCount} new and ${backedCount} total!`);
    }
}




