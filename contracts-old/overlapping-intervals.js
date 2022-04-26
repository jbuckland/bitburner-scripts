/*
Given the following array of array of numbers representing a list of intervals, merge all overlapping intervals.

Q:[[12,15],[9,18],[19,21],[1,11],[1,9],[22,23],[7,13],[1,5],[2,3],[14,18],[20,27],[3,5],[23,28],[11,21],[22,26],[15,16],[4,9],[25,31]]
A: [ [ 1, 31 ] ] //CORRECT!


Example:

[[1, 3], [8, 10], [2, 6], [10, 16]]

would merge into [[1, 6], [8, 16]].

The intervals must be returned in ASCENDING order. You can assume that in an interval, the first number will always be smaller than the second.
 */

let intervals = [[12, 15], [9, 18], [19, 21], [1, 11], [1, 9], [22, 23], [7, 13], [1, 5], [2, 3], [14, 18], [20, 27], [3, 5], [23, 28], [11, 21], [22, 26], [15, 16], [4, 9], [25, 31]]

//this sort is key!
intervals.sort((a, b) => a[0] - b[0] || a[1] - b[1]);

console.log(`Original Intervals`, intervals);

let mergedIntervals = [];

while (intervals.length > 0) {

    let currInterval = intervals.shift()

    //find all the other merged intervals that 
    // start at or before I end &&
    // end at or after I start

    let otherInt = mergedIntervals.find(i => i[0] <= currInterval[1] && i[1] >= currInterval[0]);

    if (otherInt) {
        //they overlap!
        //merge them

        //there's no way that currInt could start before otherInt
        otherInt[1] = Math.max(otherInt[1], currInterval[1])
    } else {
        //no other overlapping interval, 
        //so we can add currInt to the merged List
        mergedIntervals.push(currInterval);
    }


}

console.log(`Merged Intervals:`, mergedIntervals);
