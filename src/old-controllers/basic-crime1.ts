import {INDENT_STRING} from 'lib/consts';
import {crimes} from 'lib/crime-consts';
import {formatPercent, round} from 'lib/utils';
import {makeEtaTimeString, trainStat} from 'lib/utils-player';
import {NS, Player} from 'NetscriptDefinitions';

export async function main(ns: NS) {
    let svc = new CrimeService0(ns);
    await svc.doRun();
}

type KarmaAvgData = { totalKarma: number, time: number, avgGain: number; }

//this is to help get you to 64gb home ram
export class CrimeService0 {
    private _player!: Player;
    private MIN_CRIME_SUCCESS: number = .6;
    private karmaAverageWindow = 10 * 1000;
    private karmaAvgData: KarmaAvgData = {totalKarma: 0, time: 0, avgGain: 0};
    private MIN_STARTING_STAT: number = 10;
    private readonly KARMA_TO_START_GANG: number = -54000;

    public constructor(private ns: NS) {
        this.updatePlayer();
        //ns.disableLog('ALL');
    }

    public async doRun() {
        this.ns.tail();
        this.ns.disableLog('sleep');

        await this.doTraining();

        while (true) {
            this.updatePlayer();
            this.updateAvgKarmaGain();
            this.ns.print('');

            this.displayKarmaInfo();

            let crimeTime = 0;

            let crimesToTry = [
                //crimes.heist,
                //crimes.assassin,
                //crimes.kidnap,
                //crimes.gta,
                crimes.homicide,
                crimes.mug,
                crimes.rob,
                crimes.shoplift
            ];

            type CrimeInfo = { name: string, chance: number };
            let crimeInfo: CrimeInfo[] = Object.values(crimes).map(c => {
                return {
                    name: c.name,
                    chance: this.ns.getCrimeChance(c.name),
                    stats: this.ns.getCrimeStats(c.name)
                };
            });

            console.log(crimeInfo);

            let nextCrime: CrimeInfo | undefined;
            let targetCrime: CrimeInfo | undefined;

            for (let crime of crimeInfo) {
                if (crime.chance >= this.MIN_CRIME_SUCCESS) {
                    targetCrime = crime;
                    break;
                } else {
                    nextCrime = crime;
                }
            }
            if (!targetCrime) {
                targetCrime = crimeInfo[crimeInfo.length - 1];
            }

            if (!this.ns.isBusy()) {
                this.ns.print(`Doing "${targetCrime.name}", ${formatPercent(targetCrime.chance)}`);

                if (nextCrime) {
                    this.ns.print(`${INDENT_STRING}Next: "${nextCrime.name}", ${formatPercent(nextCrime.chance)}`);
                }

                crimeTime = this.ns.commitCrime(targetCrime.name);
            }

            await this.ns.sleep(crimeTime);
        }

    }

    private displayKarmaInfo() {

        let total = this.karmaAvgData.totalKarma;
        let remaining = this.KARMA_TO_START_GANG - total;

        this.ns.print(`Karma: ${round(this.karmaAvgData.avgGain, 2)}/s`);

        let etaString = makeEtaTimeString(this.ns, total, remaining, this.karmaAvgData.avgGain);
        this.ns.print(etaString);

    }

    private async doTraining() {
        this.updatePlayer();

        await trainStat(this.ns, 'strength', 'str');
        while (this._player.strength < this.MIN_STARTING_STAT) {
            await this.ns.sleep(1000);
            this.updatePlayer();
        }
        this.ns.stopAction();

        await trainStat(this.ns, 'defense', 'def');
        while (this._player.defense < this.MIN_STARTING_STAT) {
            await this.ns.sleep(1000);
            this.updatePlayer();
        }
        this.ns.stopAction();

        await trainStat(this.ns, 'dexterity', 'dex');
        while (this._player.dexterity < this.MIN_STARTING_STAT) {
            await this.ns.sleep(1000);
            this.updatePlayer();
        }
        this.ns.stopAction();

        await trainStat(this.ns, 'agility', 'agi');
        while (this._player.agility < this.MIN_STARTING_STAT) {
            await this.ns.sleep(1000);
            this.updatePlayer();
        }
        this.ns.stopAction();

        this.ns.stopAction();
    }

    private updateAvgKarmaGain() {

        let currKarmaData: KarmaAvgData = {
            totalKarma: this.ns.heart.break(),
            time: new Date().getTime(),
            avgGain: 0
        };

        let elapsedTime = currKarmaData.time - this.karmaAvgData.time;
        if (elapsedTime >= this.karmaAverageWindow) {

            let karmaIncrease = currKarmaData.totalKarma - this.karmaAvgData.totalKarma;
            currKarmaData.avgGain = (karmaIncrease / (elapsedTime / 1000));

            this.karmaAvgData = currKarmaData;

        }

    }

    private updatePlayer() {
        this._player = this.ns.getPlayer();
    }
}
