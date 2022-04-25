import {ArrayJumpingGame2} from '/contracts/array-jumping-game2';
import {HammingCodesBinaryToInteger} from '/contracts/hamming-codes-binary-to-integer';
import {HammingCodesIntegerToBinary} from '/contracts/hamming-codes-integer-to-binary';
import {MergeOverlappingIntervals} from '/contracts/merge-overlapping-intervals';
import {SanitizeParens} from '/contracts/sanitize-parens';
import {SubarrayWithMaxSum} from '/contracts/subarray-with-max-sum';
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

    constructor(private ns: NS) {
        ns.tail();
        ns.disableLog('ALL');
        ns.enableLog('codingcontract.attempt');
        this.contractTable = new Table(this.ns);
    }

    public async doRun() {

        //while (true) {
        this.updateData();
        this.displayInfo();

        await this.doSolve();

        this.runTime = new Date().getTime() - this.lastRunTime;
        await this.ns.sleep(this.SLEEP_TIME);
        //}

    }

    private displayInfo() {
        this.ns.clearLog();
        displayHeader(this.ns, this.runTime);
        //stuff here

        this.displayContractList();


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
                let solvable = SolvableContractTypes.includes(cont.type);
                tableData.push({
                    'Server': cont.host,
                    'Type': cont.type,
                    'Faction': cont.targetFaction ?? '',
                    'Filename': cont.name,
                    'Solvable': solvable ? 'Yes' : 'No'
                });
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
            let input = this.ns.codingcontract.getData(contract.name, contract.host);

            switch (contract.type) {


                case CodingContractType.arrayJumpingGame2:
                    answer = new ArrayJumpingGame2().solve(input);
                    break;
                case CodingContractType.mergeOverlappingIntervals:
                    answer = new MergeOverlappingIntervals().solve(input);
                    break;
                case CodingContractType.sanitizeParens:
                    answer = new SanitizeParens().solve(input);
                    break;
                case CodingContractType.subarrayWithMaxSum:
                    answer = new SubarrayWithMaxSum().solve(input);
                    break;
                case CodingContractType.hammingCodesBinToInt:
                    answer = new HammingCodesBinaryToInteger().solve(input);
                    break;
                case CodingContractType.hammingCodesIntToBin:
                    answer = new HammingCodesIntegerToBinary().solve(input);
                    break;

                case CodingContractType.unknown:
                case CodingContractType.algorithmicStockTrader1:
                case CodingContractType.algorithmicStockTrader2:
                case CodingContractType.algorithmicStockTrader3:
                case CodingContractType.findAllValidMathExpressions:
                case CodingContractType.uniquePathsInAGrid1:
                case CodingContractType.uniquePathsInAGrid2: //we can't solves these yet
                    continue;
            }

            if (answer) {
                let msg = `Do you want to submit the following answer to \n${contract.type}:${contract.name}\n${answer}`;
                let proceed = await this.ns.prompt(msg, {type: 'boolean'});

                if (proceed) {
                    let reward = this.ns.codingcontract.attempt(answer, contract.name, contract.host, {returnReward: true}) as string;
                    if (reward.length > 0) {
                        this.ns.toast(`Contract success! ${reward}`, TOAST_VARIANT.success, TOAST_DURATION);
                    } else {
                        this.ns.toast(`Contract FAILED! ${contract.type}`, TOAST_VARIANT.error, TOAST_DURATION);
                        //failed!!!
                    }
                }



            } else {
                //didn't get an answer for this contract
            }

        }



    }
}
