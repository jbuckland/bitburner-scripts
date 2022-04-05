import {NS} from './NetscriptDefinitions';
import {HOME, MAX_HOME_SERVER_RAM, SCRIPTS, TOAST_DURATION, TOAST_VARIANT} from './consts';
import {debug, formatBigRam} from './utils';
import {
    displayHomeServerInfo,
    displayRunnerStats,
    getHomeServers,
    getNextHomeServerSize,
    HomeServer
} from './utils-player';

export class ServerManager {

    public costMultiplierBeforeBuying: number = 1;

    public constructor(private _ns: NS) {
    }

    public displayServerStats() {
        this._ns.print('Server Stats:');
        displayRunnerStats(this._ns);
        displayHomeServerInfo(this._ns, this.costMultiplierBeforeBuying);
        this._ns.print('');
    }

    public async tryPurchaseServer() {

        let myServers = this._ns.getPurchasedServers();

        //finally
        let nextRamSize = getNextHomeServerSize(this._ns);
        let serverCost = this._ns.getPurchasedServerCost(nextRamSize);
        let playerHasEnoughMoney = this._ns.getPlayer().money >= (serverCost * this.costMultiplierBeforeBuying);

        let serverLimit = this._ns.getPurchasedServerLimit();
        let serverCount = myServers.length;
        let homeServersFull = serverCount >= serverLimit;

        let homeServers = getHomeServers(this._ns);
        let aServerNeedsUpgraded = false;
        let smallestServer: HomeServer | undefined;
        if (homeServers.length > 0) {

            homeServers.sort((a, b) => a.maxRam - b.maxRam);
            smallestServer = homeServers[0];
            aServerNeedsUpgraded = smallestServer && smallestServer.maxRam < MAX_HOME_SERVER_RAM;
        }

        debug(this._ns, 'tryPurchaseServer()', {
            nextRamSize,
            serverCost,
            playerHasEnoughMoney,
            homeServersFull,
            smallestServer
        });

        if (playerHasEnoughMoney) {
            if (homeServersFull && smallestServer && aServerNeedsUpgraded) {
                //delete
                this._ns.toast(`Removed home server ${smallestServer.hostname} (${formatBigRam(smallestServer.maxRam)})`, TOAST_VARIANT.info, TOAST_DURATION);
                this._ns.killall(smallestServer.hostname);
                this._ns.deleteServer(smallestServer.hostname);
            }

            if (!homeServersFull || (smallestServer && aServerNeedsUpgraded)) {
                //buy
                let newHostName = this._ns.purchaseServer(HOME, nextRamSize);
                this._ns.run(SCRIPTS.addScripts); //get the scripts on the new server
                await this._ns.sleep(1000);
                this._ns.toast(`Purchased home server ${newHostName} (${formatBigRam(nextRamSize)})`, TOAST_VARIANT.info, TOAST_DURATION);
            }
        }

    }

}
