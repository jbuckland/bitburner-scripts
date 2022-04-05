import {NS, Player} from './NetscriptDefinitions';
import {crimes, GYMS} from './crime_consts';
import {round} from './utils';

export async function main(ns: NS) {
    let svc = new CrimeService1(ns);
    await svc.doRun();
}

export class CrimeService1 {
    private _player!: Player;
    private SHOPLIFT_DEX: number = 10;
    private SHOPLIFT_AGI: number = 10;
    private CRIME_THRESHOLD: number = .5;

    public constructor(private _ns: NS) {
        this.updatePlayer();
    }

    public async doRun() {
        this._ns.tail();
        //this._ns.disableLog('ALL');
        this._ns.disableLog('sleep');

        while (!this.readyForShoplift()) {
            this._ns.print('Training!');
            this.trainForShoplift();
        }

        while (true) {
            this.updatePlayer();

            this._ns.print(`Karma: ${round(this._ns.heart.break())}`);

            let crimeTime = 0;
            let crimeNames = [
                crimes.gta.name,
                crimes.homicide.name,
                crimes.mug.name,
                crimes.shoplift.name
            ];

            let crimeName = crimeNames.find(c => this._ns.getCrimeChance(c) >= this.CRIME_THRESHOLD);
            if (!crimeName) {
                crimeName = crimes.shoplift.name;
            }

            if (!this._ns.isBusy()) {
                this._ns.print('Doing crime!!');
                crimeTime = this._ns.commitCrime(crimeName);
            }

            await this._ns.sleep(crimeTime);
        }

    }

    private updatePlayer() {
        this._player = this._ns.getPlayer();
    }

    private readyForShoplift() {
        return this._player.dexterity > this.SHOPLIFT_DEX && this._player.agility > this.SHOPLIFT_AGI;
    }

    private trainForShoplift() {

        if (this._player.dexterity < this.SHOPLIFT_DEX) {
            this._ns.gymWorkout(GYMS.powerhouse, 'dex', true);
        } else if (this._player.agility < this.SHOPLIFT_AGI) {
            this._ns.gymWorkout(GYMS.powerhouse, 'agi', true);
        }

    }

}