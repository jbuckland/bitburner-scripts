import {IContractSolution} from '/contracts/types';
import {CodingContractType} from '/lib/consts';

export class TemplateSolver implements IContractSolution {

    /**

     */

    public type: CodingContractType = CodingContractType.unknown;


    public solve(input: any): string[] | number {
        let answerArray: string[] = [];
        return answerArray;

        /*
        let answerNumber: number;
        return answerNumber;
        */
    }

}
