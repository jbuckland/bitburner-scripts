import {NS, Player} from './NetscriptDefinitions';
import {crimes, GYMS} from './crime_consts';

export async function main(ns: NS) {
    let svc = new CrimeService0(ns);
    await svc.doRun();
}

export class CrimeService0 {
    private _player!: Player;
    private SHOPLIFT_DEX: number = 10;
    private SHOPLIFT_AGI: number = 10;

    public constructor(private _ns: NS) {
        this.updatePlayer();
    }

    public async doRun() {
        this._ns.tail();
        //this._ns.disableLog('ALL');
        this._ns.disableLog('sleep');

        while (true) {
            this.updatePlayer();
            if (this.readyForShoplift()) {
                this._ns.print('Doing shoplift!');
                await this.doShopLift();

            } else {
                this._ns.print('Training!');
                this.trainForShoplift();
            }

            await this._ns.sleep(20);
        }

    }

    private async basicCrime(): Promise<number> {
        let crimeTime = 0;




        if (!this._ns.isBusy()) {
            crimeTime = this._ns.commitCrime(crimes.shoplift.name);
        }
        return crimeTime;
    }

    private updatePlayer() {
        this._player = this._ns.getPlayer();
    }

    private readyForShoplift() {
        //this._ns.print(`Player: dex:${this._player.dexterity}, agi:${this._player.agility}`);
        return this._player.dexterity > this.SHOPLIFT_DEX && this._player.agility > this.SHOPLIFT_AGI;
    }

    private trainForShoplift() {

        if (this._player.dexterity < this.SHOPLIFT_DEX) {
            this._ns.gymWorkout(GYMS.powerhouse, 'dex', true);
        } else if (this._player.agility < this.SHOPLIFT_AGI) {
            this._ns.gymWorkout(GYMS.powerhouse, 'agi', true);
        }

    }

    private async doShopLift() {
        let crimeTime = 0;
        if (!this._ns.isBusy()) {
            crimeTime = this._ns.commitCrime(crimes.shoplift.name);
        }

        await this._ns.sleep(crimeTime);
    }
}