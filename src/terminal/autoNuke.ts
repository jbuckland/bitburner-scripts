import {DARK_DATA, HOME, TOAST_DURATION, TOAST_VARIANT} from 'lib/consts';
import {NS} from 'NetscriptDefinitions';
import {getAllHosts} from 'lib/utils';

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

    function doNuking() {
        let nukedCount = 0;
        let newNukedCount = 0;

        for (let i = 0; i < getAllHosts(ns).length; i++) {

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
            ns.toast(`${newNukedCount} new servers nuked!`, TOAST_VARIANT.success, TOAST_DURATION);
        }

        ns.print(`NUKE: ${newNukedCount} new and ${nukedCount} total!`);
        ns.print('');
    }

}




