import {getSolverForContract} from '/contracts/utils-contracts';
import {CodingContractType, CrimeMode, TOAST_DURATION, TOAST_VARIANT} from '/lib/consts';
import {getCodingContracts} from '/lib/utils-contracts';
import {displayHeader} from '/lib/utils-player';
import {ITableData, Table} from '/lib/utils-table';
import {AutocompleteData, NS} from '/NetscriptDefinitions';
import {FlagSchema, IContract} from '/types';

export const SolvableContractTypes = [
    'Merge Overlapping Intervals'
];

export function autocomplete(data: AutocompleteData, args: any[]) {
    console.log(`autocomplete()`, args);
    data.flags(flagSchema);
    let flagOptions: string[] = [];
    if (args && args.length >= 0) {
        if (args[0] === '--crimeMode') {
            flagOptions = Object.values(CrimeMode);
        }
    }

    return [
        ...flagOptions
        //...data.servers,
        //...data.scripts,
        //...data.txts
    ]; //return what you want to have in autocomplete
}

const flagSchema: FlagSchema = [
    ['debug', '']

];

export async function main(ns: NS) {

    let controller = new TemplateController(ns);
    let flags = ns.flags(flagSchema);
    await controller.doRun();

}

class TemplateController {
    private SLEEP_TIME: number = 1000;
    private lastRunTime: number = 0;
    private runTime: number = 0;
    private contractList: IContract[] = [];
    private contractTable: Table;
    private solvedContracts: IContract[] = [];
    private solvedRewards: string[] = [];

    constructor(private ns: NS) {
        ns.tail();
        ns.disableLog('ALL');
        ns.enableLog('codingcontract.attempt');
        this.contractTable = new Table(this.ns);
    }

    public async doRun() {

        //while (true) {
        this.updateData();

        await this.doSolve();

        this.displayInfo();
        this.runTime = new Date().getTime() - this.lastRunTime;
        await this.ns.sleep(this.SLEEP_TIME);
        //}

    }

    private displayInfo() {
        this.ns.clearLog();
        displayHeader(this.ns, this.runTime);
        //stuff here

        this.displayContractList();
        this.displaySolvedReqards();


    }

    private updateData() {
        this.lastRunTime = new Date().getTime();

        this.contractList = getCodingContracts(this.ns);

    }

    private displayContractList() {

        let tableData: ITableData[] = [];

        if (this.contractList.length > 0) {


            this.contractList.sort((a, b) => a.type.localeCompare(b.type));


            this.contractList.forEach(cont => {
                if (this.solvedContracts.find(c => c.filename !== cont.filename)) {
                    let solvable = SolvableContractTypes.includes(cont.type);
                    tableData.push({
                        'Server': cont.host,
                        'Type': cont.type,
                        'Faction': cont.targetFaction ?? '',
                        'Filename': cont.filename,
                        'Solvable': solvable ? 'Yes' : 'No'
                    });
                }

            });
            tableData.sort((a, b) => a['Solvable'].localeCompare(b['Solvable']));

            this.contractTable.setData(tableData);
            this.contractTable.headerRow['Type'].align = 'left';
            this.contractTable.headerRow['Filename'].align = 'left';
            this.contractTable.headerRow['Solvable'].align = 'left';
            this.contractTable.print();
        } else {
            this.ns.print(`No Contracts Found`);

        }
    }

    private async doSolve() {


        for (const contract of this.contractList) {
            let answer: string[] | number | undefined;
            let input = this.ns.codingcontract.getData(contract.filename, contract.host);

            let solver = getSolverForContract(this.ns, contract);
            if (solver) {
                answer = solver?.solve(input);
            }


            if (answer) {
                let msg = `Do you want to submit the following answer to \n${contract.type}:${contract.filename}\n${answer}
                \n{filename:'${contract.filename}', host:'${contract.host}', type:${contract.type as CodingContractType}}`;
                let proceed = await this.ns.prompt(msg, {type: 'boolean'});

                if (proceed) {
                    let reward = this.ns.codingcontract.attempt(answer, contract.filename, contract.host, {returnReward: true}) as string;
                    if (reward.length > 0) {
                        this.ns.toast(`Contract success! ${reward}`, TOAST_VARIANT.success, TOAST_DURATION);

                        this.solvedContracts.push(contract);
                        this.solvedRewards.push(reward);
                    } else {
                        this.ns.toast(`Contract FAILED! ${contract.type}`, TOAST_VARIANT.error, TOAST_DURATION);
                        this.ns.tprint(`Contract FAILED!`, contract);
                        //failed!!!
                    }
                }



            } else {
                //didn't get an answer for this contract
            }

        }



    }

    private displaySolvedReqards() {
        
    }
}
