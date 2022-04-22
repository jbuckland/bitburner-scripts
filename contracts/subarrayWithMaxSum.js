/*
Subarray with Maximum Sum

Given the following integer array, find the contiguous subarray (containing at least one number) which has the largest sum and return that sum.
'Sum' refers to the sum of all the numbers in the subarray.

Q: [6,-9,-1,3,-9,-3]
A: 6

Q: [-10,10,-10,1,-10,4,0,0,8,-4,-1,-6,2,-7,-7,-1,-1]
A: 12

 */

let numbers = [-8,8,3,4,10,-3,5,-9,2,-2,2,-8,1,-6,2,-9,4,0,-3,0,2,-1,9,6,-10,6,-4,-1,4,5,-8,8,2]

let sums = [];

for (let startIndex = 0; startIndex < numbers.length - 1; startIndex++) {

    for (let endIndex = startIndex; endIndex < numbers.length; endIndex++) {
        let sum = 0;


        for (let i = startIndex; i < endIndex + 1; i++) {
            sum += numbers[i]
        }

        sums.push({startIndex, endIndex, sum});

    }
}

console.log(`Sum Count: ${sums.length}`);
console.log(sums);

sums.sort((a, b) => b.sum - a.sum)
console.log(`Largest sum: `,sums[0]);
