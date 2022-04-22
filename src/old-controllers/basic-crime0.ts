import {INetscriptExtra} from '/types';
import {INDENT_STRING} from 'lib/consts';
import {crimes} from 'lib/crime-consts';
import {formatPercent, round} from 'lib/utils';
import {NS, Player} from 'NetscriptDefinitions';

export async function main(ns: NS & INetscriptExtra) {
    let svc = new CrimeService0(ns);
    await svc.doRun();
}

type KarmaAvgData = { totalKarma: number, time: number, avgGain: number; }

//this is to help get you to 64gb home ram
export class CrimeService0 {
    private _player!: Player;
    private CRIME_THRESHOLD: number = .6;
    private karmaAverageWindow = 10 * 1000;
    private karmaAvgData: KarmaAvgData = {totalKarma: 0, time: 0, avgGain: 0};

    public constructor(private _ns: NS & INetscriptExtra) {
        this.updatePlayer();
    }

    public async doRun() {
        this._ns.tail();
        this._ns.disableLog('sleep');

        while (true) {
            this.updatePlayer();
            this.updateAvgKarmaGain();
            this._ns.print('');

            this._ns.print(`Karma: ${round(this.karmaAvgData.totalKarma)}, ${round(this.karmaAvgData.avgGain, 2)}/s`);

            let crimeTime = 0;

            let crimesToTry = [
                //crimes.heist,
                //crimes.assassin,
                //crimes.kidnap,
                //crimes.gta,
                crimes.homicide,
                crimes.mug,
                crimes.shoplift
            ];

            type CrimeInfo = { name: string, chance: number }
            let crimeInfo: CrimeInfo[] = crimesToTry.map(c => {
                return {
                    name: c.name,
                    chance: this._ns.singularity.getCrimeChance(c.name)
                };
            });

            let nextCrime: CrimeInfo | undefined;
            let targetCrime: CrimeInfo | undefined;

            for (let crime of crimeInfo) {
                if (crime.chance >= this.CRIME_THRESHOLD) {
                    targetCrime = crime;
                    break;
                } else {
                    nextCrime = crime;
                }
            }
            if (!targetCrime) {
                targetCrime = crimeInfo[crimeInfo.length - 1];
            }

            if (!this._ns.singularity.isBusy()) {
                this._ns.print(`Doing "${targetCrime.name}", ${formatPercent(targetCrime.chance)}`);

                if (nextCrime) {
                    this._ns.print(`${INDENT_STRING}Next: "${nextCrime.name}", ${formatPercent(nextCrime.chance)}`);
                }

                crimeTime = this._ns.singularity.commitCrime(targetCrime.name);
            }

            await this._ns.sleep(crimeTime);
        }

    }

    private updatePlayer() {
        this._player = this._ns.getPlayer();
    }

    private updateAvgKarmaGain() {

        let currKarmaData: KarmaAvgData = {
            totalKarma: this._ns.heart.break(),
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

}
