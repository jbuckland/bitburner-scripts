import {UniquePathInGrid1} from '/contracts/unique-path-in-grid1';
import {timestamp} from '/lib/utils';
import {NS} from '/NetscriptDefinitions';



export async function main(ns: NS) {
    ns.tail();
    ns.clearLog();
    ns.print('');

    ns.print(timestamp());

    let solver = new UniquePathInGrid1();



    let target = {host: 'run4theh111z', file: 'contract-311437.cct'};

    //displayDescription(target);

    let data = ns.codingcontract.getData(target.file, target.host);
    let numTries = ns.codingcontract.getNumTriesRemaining(target.file, target.host);


    ns.print(`Contract: ${target.file}, Host: ${target.host}`);
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

    let contractType = ns.codingcontract.getContractType(target.file, target.host);


    if (contractType === solver.type) {
        
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
            let reward = ns.codingcontract.attempt(answer, target.file, target.host, {returnReward: true});

            if (reward) {
                ns.print(`Success! ${reward}`);
            } else {
                ns.print(`FAILURE!`);
            }
        }



    } else {
        ns.print(`Wrong solver for contract. Solver:${solver.type}, Contract:${contractType}`);
    }



    function displayDescription(target: { file: string; host: string }) {
        let desc = ns.codingcontract.getDescription(target.file, target.host);
        ns.print(desc);
        ns.print('');
    }

}
