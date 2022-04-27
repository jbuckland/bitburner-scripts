import {IContractSolver} from '/contracts/types';
import {CodingContractType} from '/lib/consts';
import {NS} from '/NetscriptDefinitions';

export class SubarrayWithMaxSum implements IContractSolver {
    public debug: boolean=false;

    /**Subarray with Maximum Sum

     Given the following integer array, find the contiguous subarray (containing at least one number) which has the largest sum and return that sum.
     'Sum' refers to the sum of all the numbers in the subarray.

     Q: [6,-9,-1,3,-9,-3]
     A: 6

     Q: [-10,10,-10,1,-10,4,0,0,8,-4,-1,-6,2,-7,-7,-1,-1]
     A: 12


     */

    public type: CodingContractType = CodingContractType.subarrayWithMaxSum;

    constructor(private ns: NS) {
    }

    public solve(numbers: number[]): string[] | number {
        let answerNumber: number = 0;

        let sums: { startIndex: number, endIndex: number, sum: number }[] = [];

        for (let startIndex = 0; startIndex < numbers.length - 1; startIndex++) {

            for (let endIndex = startIndex; endIndex < numbers.length; endIndex++) {
                let sum = 0;


                for (let i = startIndex; i < endIndex + 1; i++) {
                    sum += numbers[i];
                }

                sums.push({startIndex, endIndex, sum});

            }
        }


        sums.sort((a, b) => b.sum - a.sum);

        answerNumber = sums[0].sum;

        return answerNumber;

    }

}
