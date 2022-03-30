import {NS} from './NetscriptDefinitions';

export async function main(ns: NS) {
    ns.tail();


    let history = [];

    let crimes = {
        shoplift: {name: 'shoplift', time: 3, money: 10354, gainRate: 3451},
        rob: {name: 'rob', time: 60, money: 276118, gainRate: 4601},
        larceny: {name: 'larceny', time: 90, money: 552235, gainRate: 6135},
        mug: {name: 'mug', time: 4, money: 24851, gainRate: 6212},
        homicide: {name: 'homicide', time: 3, money: 31063, gainRate: 10354} //worse for stat gain than mug. Should have at least 60% success rate

    };



    while (true) {
        let crimeTime = 100;
        if (!ns.isBusy()) {
            //let chance = ns.getCrimeChance('Homicide');
            //ns.print(`${round(chance * 100)}% to commit Homicide`);

            let crime = '';


            crime = 'Homicide'; //use when >~60% success
            if (ns.getCrimeChance(crimes.homicide.name) > .7) {
                crimeTime = ns.commitCrime(crime);
            } else if (ns.getCrimeChance(crimes.mug.name) > .7) {
                crimeTime = ns.commitCrime(crimes.mug.name);
            } else {
                crimeTime = ns.commitCrime(crimes.shoplift.name);
            }


        }
        await ns.sleep(crimeTime);
    }

}
