/*
Algorithmic Stock Trader I

You are given the following array of stock prices (which are numbers) where the i-th element represents the stock price on day i:

Q: 98,162,47,51,141,180,90,52,39,93,101,50,78,9,130,134,19,179,142,118,197,152,185,160,86,75,171,66,26,93,3,34,163,143,180,166
A: 188

Determine the maximum possible profit you can earn using at most one transaction (i.e. you can only buy and sell the stock once). If no profit can be made then the answer should be 0. Note that you have to buy the stock before you can sell it
 */

let prices = [98, 162, 47, 51, 141, 180, 90, 52, 39, 93, 101, 50, 78, 9, 130, 134, 19, 179, 142, 118, 197, 152, 185, 160, 86, 75, 171, 66, 26, 93, 3, 34, 163, 143, 180, 166]

let transactions = [];

for (let startDay = 0; startDay < prices.length - 1; startDay++) {

    for (let endDay = startDay + 1; endDay < prices.length; endDay++) {

        let profit = prices[endDay] - prices[startDay]
        transactions.push({startIndex: startDay, endIndex: endDay, profit});

    }
}

transactions.sort((a, b) => b.profit - a.profit)

console.log(`Possible Transation Count: ${transactions.length}`);

transactions.forEach(t => {
    console.log(t);
})

console.log(`Best single transaction:`, transactions[0])
