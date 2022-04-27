import {HOSTS} from '/lib/consts';
import {NS} from '/NetscriptDefinitions';
import {IContract} from '/types';


export function getCodingContracts(ns: NS): IContract[] {
    let contracts: IContract[] = [];

    for (let i = 0; i < HOSTS.length; i++) {
        let host = HOSTS[i];

        let files = ns.ls(host);

        let hostContacts = files.filter(f => f.endsWith('.cct')).map(contractFileName => {

            //get the target faction, if it exists
            let targetFaction: string | undefined;
            let tempName = contractFileName.substring(0, contractFileName.indexOf('.cct'));
            let nameParts = tempName.split('-');
            if (nameParts.length === 3) {
                targetFaction = nameParts[2];
            }



            return {
                host: host,
                filename: contractFileName,
                type: ns.codingcontract.getContractType(contractFileName, host),
                targetFaction: targetFaction
            } as IContract;
        });

        contracts.push(...hostContacts);

    }
    return contracts;
}
