/*
Algorithmic Stock Trader IV
You are attempting to solve a Coding Contract. You have 10 tries remaining, after which the contract will self-destruct.


You are given the following array with two elements:

[2, [70,172,62,33,39,5,158,193,80,16,1,192,186,125,124,113,26,70,90,81,110,52,100,81,172,24,8,163,191]]

The first element is an integer k. The second element is an array of stock prices (which are numbers) where the i-th element represents the stock price on day i.

Determine the maximum possible profit you can earn using at most k transactions. A transaction is defined as buying and then selling one share of the stock. Note that you cannot engage in multiple transactions at once. In other words, you must sell the stock before you can buy it again.

If no profit can be made, then the answer should be 0.
 */


let values = [108, 120, 131, 127, 54, 94, 151, 102, 60, 107, 119, 27, 21, 180, 85, 182, 80, 65, 21, 139, 166, 42, 32, 10, 93, 194, 16, 117, 93, 73, 86, 79, 96]

let transactions = [];

let buyTrans = {index: 0, value: 0};
let sellTrans = {index: 0, value: 0};

let transactions = [];

let currIndex = 0;

while (currIndex < values.length) {

    let buyTrans = {index: currIndex, value: values[currIndex]}
    currIndex++
    let sellTrans = {index: currIndex, value: values[currIndex]}

    //is the next day better than the current sellTrans?



    if (currIndex + 1 < values.length) {
        currIndex++
        let nextValue = values[currIndex];

    } else {
        //we're at the last value...
    }
}


for (let i = 0; i < values.length; i++) {
    const currValue = values[i];
    if (i < values.length + 1) {
        const nextValue = values[i + 1];


    } else {
        //we're at the last value...
    }


}


console.log('done!');
