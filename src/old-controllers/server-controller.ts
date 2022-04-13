import { addScripts } from 'addScripts';
import { NS } from 'NetscriptDefinitions';
import { HOME, MAX_HOME_SERVER_RAM, TOAST_DURATION, TOAST_VARIANT } from 'lib/consts';
import { debug, formatBigRam } from 'lib/utils';
import { displayHomeServerInfo, displayRunnerStats, getHomeServers, getNextHomeServerSize, HomeServer } from 'lib/utils-player';

export class ServerManager {

    public costMultiplierBeforeBuying: number = 1;

    public constructor(private ns: NS) {
    }

    public displayServerStats() {
        this.ns.print('Server Stats:');
        displayRunnerStats(this.ns);
        displayHomeServerInfo(this.ns, this.costMultiplierBeforeBuying);
        this.ns.print('');
    }

    public async tryPurchaseServer() {

        let myServers = this.ns.getPurchasedServers();

        //finally
        let nextRamSize = getNextHomeServerSize(this.ns);
        let serverCost = this.ns.getPurchasedServerCost(nextRamSize);
        let playerHasEnoughMoney = this.ns.getPlayer().money >= (serverCost * this.costMultiplierBeforeBuying);

        let serverLimit = this.ns.getPurchasedServerLimit();
        let serverCount = myServers.length;
        let homeServersFull = serverCount >= serverLimit;

        let homeServers = getHomeServers(this.ns);
        let aServerNeedsUpgraded = false;
        let smallestServer: HomeServer | undefined;
        if (homeServers.length > 0) {

            homeServers.sort((a, b) => a.maxRam - b.maxRam);
            smallestServer = homeServers[0];
            aServerNeedsUpgraded = smallestServer && smallestServer.maxRam < MAX_HOME_SERVER_RAM;
        }

        debug(this.ns, 'tryPurchaseServer()', {
            nextRamSize,
            serverCost,
            playerHasEnoughMoney,
            homeServersFull,
            smallestServer
        });

        if (playerHasEnoughMoney) {
            if (homeServersFull && smallestServer && aServerNeedsUpgraded) {
                //delete
                this.ns.toast(`Removed home server ${smallestServer.hostname} (${formatBigRam(smallestServer.maxRam)})`, TOAST_VARIANT.info, TOAST_DURATION);
                this.ns.killall(smallestServer.hostname);
                this.ns.deleteServer(smallestServer.hostname);
            }

            if (!homeServersFull || (smallestServer && aServerNeedsUpgraded)) {
                //buy
                let newHostName = this.ns.purchaseServer(HOME, nextRamSize);
                await addScripts(this.ns, newHostName, true);

                await this.ns.sleep(10);
                this.ns.toast(`Purchased home server ${newHostName} (${formatBigRam(nextRamSize)})`, TOAST_VARIANT.info, TOAST_DURATION);
            }
        }

    }

}
