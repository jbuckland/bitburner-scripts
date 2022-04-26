function main() {

    /*
    You are given the following array with two elements:
    [ 2,
      [119,103,73,109,25,38,59,18,40,197,20,49,134,146,101,149,137,91,167,35,91,171,66,169,182,84,21,126,156]
    ]
    The first element is an integer k.
    The second element is an array of stock prices (which are numbers) where the i-th element represents the stock price on day i.
    Determine the maximum possible profit you can earn using at most k transactions. A transaction is defined as buying and then selling one share of the stock.
    Note that you cannot engage in multiple transactions at once. In other words, you must sell the stock before you can buy it again.

    If no profit can be made, then the answer should be 0.
     */

    let data = [
        2, [119, 103, 73, 109, 25, 38, 59, 18, 40, 197, 20, 49, 134, 146, 101, 149, 137, 91, 167, 35, 91, 171, 66, 169, 182, 84, 21, 126, 156]
    ];

    let maxTransactions = data[0];
    let stockPrices = data[1];

    let foo = [
        119, 103, 73, 109, 25, 38, 59,
        18, 40, 197,
        20, 49, 134, 146, 101, 149, 137, 91, 167, 35, 91, 171, 66, 169, 182,
        84, 21, 126, 156
    ];


    ///////////
    //73-109
    //25-38
    //25-59
    //18-40
    //18-197
    //20-49
    //20-134
    //20-145
    //20-149
    //20-167
    //20-171
    //20-182


    //buy at 18, sell at 197, profit of 179
    //buy at 20, sell at 182, profit of 162

    //total of 341, this was correct!

    let list2 = [
        147,
        21, 87, 43, 93, 104, 172, 76, 109, 27, 162, 106, 58, 139, 171, 75, 112, 123, 54, 128, 148, 41,
        4, 77, 121, 154, 103, 119, 181, 165, 88, 181,
        103, 172, 126, 113, 116, 157
    ];
//4 to 181 is 177

//get all possible ranges where first is lower than second.
    list2.forEach(start => {

    })


}


main();


console.log('done!');
