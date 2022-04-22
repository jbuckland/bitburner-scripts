import {makeEtaTimeString, trainStat} from '/lib/utils-player';
import {INetscriptExtra} from '/types';
import {INDENT_STRING} from 'lib/consts';
import {crimes} from 'lib/crime-consts';
import {formatBigTime, formatPercent, round} from 'lib/utils';
import {NS, Player} from 'NetscriptDefinitions';

export async function main(ns: NS & INetscriptExtra) {
    let svc = new BasicCrimeService(ns);
    await svc.doRun();
}

type KarmaAvgData = { totalKarma: number, time: number, avgGain: number; }
type CrimeInfo = { name: string, chance: number }

//this is to help get you to 64gb home ram
export class BasicCrimeService {

    private CRIME_THRESHOLD: number = .7;
    private KARMA_TO_START_GANG: number = -54000;
    private MIN_STARTING_STAT: number = 10;
    private karmaAverageWindow = 10 * 1000;
    private karmaAvgData: KarmaAvgData = {totalKarma: 0, time: 0, avgGain: 0};
    private player!: Player;
    private crimeTime: number = 0;
    private nextCrime: CrimeInfo | undefined;
    private targetCrime: CrimeInfo | undefined;

    public constructor(private ns: NS & INetscriptExtra) {
        this.updatePlayer();
    }

    public async doRun() {
        this.ns.tail();
        this.ns.disableLog('sleep');

        await this.doTraining();

        while (true) {
            this.updatePlayer();
            this.updateAvgKarmaGain();
            this.ns.print('');



            let crimesToTry = [
                //crimes.heist,
                //crimes.assassin,
                //crimes.kidnap,
                //crimes.gta,
                crimes.homicide,
                crimes.mug,
                crimes.shoplift
            ];


            let crimeInfo: CrimeInfo[] = crimesToTry.map(c => {
                return {
                    name: c.name,
                    chance: this.ns.singularity.getCrimeChance(c.name)
                };
            });

            this.nextCrime = undefined;
            this.targetCrime = undefined;

            for (let crime of crimeInfo) {
                if (crime.chance >= this.CRIME_THRESHOLD) {
                    this.targetCrime = crime;
                    break;
                } else {
                    this.nextCrime = crime;
                }
            }
            if (!this.targetCrime) {
                this.targetCrime = crimeInfo[crimeInfo.length - 1];
            }

            if (!this.ns.singularity.isBusy()) {
                this.crimeTime = this.ns.singularity.commitCrime(this.targetCrime.name);
            }

            this.displayInfo();
            await this.ns.sleep(this.crimeTime);
        }

    }

    private displayInfo() {

        let total = this.karmaAvgData.totalKarma;
        let remaining = this.KARMA_TO_START_GANG - total;

        if (this.targetCrime) {
            this.ns.print(`Doing "${this.targetCrime.name}", takes ${formatBigTime(this.crimeTime)} sec,  ${formatPercent(this.targetCrime.chance)}`);
        }

        if (this.nextCrime) {
            this.ns.print(`${INDENT_STRING}Next: "${this.nextCrime.name}", ${formatPercent(this.nextCrime.chance)}`);
        }


        this.ns.print(`Neg. Karm: ${round(total) * -1}, ${round(this.karmaAvgData.avgGain * -1, 2)}/s`);

        let etaString = makeEtaTimeString(this.ns, this.KARMA_TO_START_GANG * -1, remaining * -1, this.karmaAvgData.avgGain * -1);
        this.ns.print(`Neg. Karma for Gang: ${etaString}`);

    }

    private async doTraining() {
        this.updatePlayer();

        await this.trainStatUntilMin('strength', 'str');
        await this.trainStatUntilMin('defense', 'def');
        await this.trainStatUntilMin('dexterity', 'dex');
        await this.trainStatUntilMin('agility', 'agi');
    }

    private async trainStatUntilMin(playerStatName: keyof Player, gymStatName: string) {
        if (this.player[playerStatName] < this.MIN_STARTING_STAT) {
            await trainStat(this.ns, playerStatName, gymStatName);
            while (this.player[playerStatName] < this.MIN_STARTING_STAT) {
                await this.ns.sleep(1000);
                this.updatePlayer();
            }
            this.ns.singularity.stopAction();

        }
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
        this.player = this.ns.getPlayer();
    }

}
