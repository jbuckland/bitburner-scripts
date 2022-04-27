import {IContractSolver} from '/contracts/types';
import {CodingContractType} from '/lib/consts';
import {NS} from '/NetscriptDefinitions';



export class BaseSolver implements IContractSolver {
    public debug: boolean = false;
    public type: CodingContractType = CodingContractType.unknown;


    constructor(private ns: NS) {
    }

    public solve(input: any): string[] | number {
        return 0;
    }

    protected debugPrint(msg: string, ...data: any) {
        if (this.debug) {
            this.ns.print(`${this.constructor.name}: ${msg}`, data);
        }
    }


    public runTests(): boolean {
        return false;
    }

}


export class TemplateSolver extends BaseSolver {

    public type = CodingContractType.unknown;

    public solve(input: any): string[] | number {
        return 0;
    }
}
