import {ITableData, Table} from '/lib/utils-table';
import {HOSTS} from 'lib/consts';
import {NS} from 'NetscriptDefinitions';

interface IContract {
    name: string;
    host: string;
    type: string;
}

export async function main(ns: NS) {
    ns.tail();
    ns.clearLog();

    let contractList: IContract[] = [];

    for (let i = 0; i < HOSTS.length; i++) {
        let host = HOSTS[i];

        let files = ns.ls(host);

        let hostContacts = files.filter(f => f.endsWith('.cct')).map(c => {
            return {
                host: host,
                name: c,
                type: ns.codingcontract.getContractType(c, host)
            } as IContract;
        });

        contractList.push(...hostContacts);

    }

    if (contractList.length > 0) {
        ns.print(`Found ${contractList.length} contracts!`);

        let table = new Table(ns);
        let tableData: ITableData[] = [];

        contractList.forEach(cont => {
            tableData.push({
                'Server': cont.host,
                'Type': cont.type,
                'Filename': cont.name
            });
            //ns.print(`${cont.host}: ${cont.name}`);
        });

        table.setData(tableData);
        table.headerRow['Type'].align = 'left';

        table.print();
        await navigator.clipboard.writeText(`lcon ${contractList[0].host}`);
        ns.print(`Connect command for first contract copied to clipboard!`);

    } else {
        ns.print('No contracts found!');
    }

}
