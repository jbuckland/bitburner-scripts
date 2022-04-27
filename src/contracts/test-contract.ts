import {getSolverForContract} from '/contracts/utils-contracts';
import {CodingContractType} from '/lib/consts';
import {timestamp} from '/lib/utils';
import {NS} from '/NetscriptDefinitions';
import {IContract} from '/types';



export async function main(ns: NS) {
    ns.tail();
    ns.clearLog();
    ns.print('');

    ns.print(timestamp());


    let target: IContract = {filename: 'contract-62245-NWO.cct', host: 'phantasy', type: CodingContractType.unknown};

    let solver = getSolverForContract(ns, target);
    if (solver) {
        solver.debug = true;
        //displayDescription(target);

        let data = ns.codingcontract.getData(target.filename, target.host);
        let numTries = ns.codingcontract.getNumTriesRemaining(target.filename, target.host);


        ns.print(`Contract: ${target.filename}, Host: ${target.host}`);
        ns.print(`Running "${solver.type}" Solver:`);
        ns.print(`Number of tries remaining: ${numTries}`);

        ns.print(`Data:`);
        if (Array.isArray(data)) {

            if (Array.isArray(data[0])) {
                ns.print('[');
                data.forEach(row => ns.print('  ', row));
                ns.print(']');
            } else {
                ns.print(data);
            }
        } else {
            ns.print(data);
        }
        //ns.print(`Raw Data:`);
        //ns.print(data);


        ns.print('');

        let answer = solver.solve(data);
        ns.print('');
        ns.print(`Answer is:`);
        if (Array.isArray(answer)) {
            (answer as string[]).forEach(subAnswer => {
                ns.print(subAnswer);
            });

        } else {
            ns.print(answer);
        }

        let ready = false;
        if (ready) {
            let reward = ns.codingcontract.attempt(answer, target.filename, target.host, {returnReward: true});

            if (reward) {
                ns.print(`Success! ${reward}`);
            } else {
                ns.print(`FAILURE!`);
            }
        }



    } else {
        ns.print(`could not find a solver for ${target.type}`);
    }



    function displayDescription(target: IContract) {
        let desc = ns.codingcontract.getDescription(target.filename, target.host);
        ns.print(desc);
        ns.print('');
    }



}
