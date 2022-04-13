import { HOSTS } from 'lib/consts';
import { NS } from 'NetscriptDefinitions';

interface IContract {
    name: string;
    host: string;
}

export async function main(ns: NS) {
    ns.tail();
    ns.clearLog();

    let contractList: IContract[] = [];

    for (let i = 0; i < HOSTS.length; i++) {
        let host = HOSTS[i];

        let files = ns.ls(host);

        let hostContacts = files.filter(f => f.endsWith('.cct')).map(c => {
            return { host: host, name: c } as IContract;
        });

        contractList.push(...hostContacts);

    }

    if (contractList.length > 0) {
        ns.print(`Found ${contractList.length} contracts!`);
        contractList.forEach(cont => {
            ns.print(`${cont.host}: ${cont.name}`);
        });

        await navigator.clipboard.writeText(`lconnect ${contractList[0].host}`);
        ns.print(`Connect command for first contract copied to clipboard!`);

    } else {
        ns.print('No contracts found!');
    }

}
