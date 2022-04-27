import {IContractSolver} from '/contracts/types';
import {CodingContractType} from '/lib/consts';
import {NS} from '/NetscriptDefinitions';

export class MergeOverlappingIntervals implements IContractSolver {
    public debug: boolean=false;
    /* Merge Overlapping Intervals
    Given the following array of array of numbers representing a list of intervals, merge all overlapping intervals.
    
    [[10,18],[16,24],[11,17],[7,12],[6,11],[19,20],[19,21],[14,20],[10,20],[23,32],[24,34],[14,19],[13,22],[8,14],[13,18],[11,15]]
    
    Example:
    
    [[1, 3], [8, 10], [2, 6], [10, 16]]
    
    would merge into [[1, 6], [8, 16]].
    
    The intervals must be returned in ASCENDING order. You can assume that in an interval, the first number will always be smaller than the second.
    */
    public type: CodingContractType = CodingContractType.mergeOverlappingIntervals;

    constructor(private ns: NS) {
    }

    public solve(input: number[][]): string[] {

        let intervals = input;

        intervals.sort((a, b) => a[0] - b[0] || a[1] - b[1]);

        console.log(`Original Intervals`, intervals);

        let mergedIntervals = [];

        while (intervals.length > 0) {

            let currInterval = intervals.shift();

            if (currInterval != undefined) {
                //find all the other merged intervals that 
                // start at or before I end &&
                // end at or after I start
                let currStart = currInterval[0];
                let currEnd = currInterval[1];


                let otherInt = mergedIntervals.find(interval => interval[0] <= currEnd && interval[1] >= currStart);

                if (otherInt) {
                    //they overlap!
                    //merge them

                    //there's no way that currInt could start before otherInt
                    otherInt[1] = Math.max(otherInt[1], currInterval[1]);
                } else {
                    //no other overlapping interval, 
                    //so we can add currInt to the merged List
                    mergedIntervals.push(currInterval);
                }
            }



        }



        return [...mergedIntervals.map(int => `[${int}]`)];
    }

}
