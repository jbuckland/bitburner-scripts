/*
Spiralize Matrix

Given the following array of arrays of numbers representing a 2D matrix, return the elements of the matrix as an array in spiral order:

Q: [
        [16,47,38, 7,15,26,35,16, 4, 6,17]
        [17,29,32,36,37,38,13,12, 6,15,15]
        [19,48,49,40,17,23, 1,26,34, 6,30]
    ]
A: [
  16, 47, 38,  7, 15, 26, 35, 16,  4,
   6, 17, 15, 30,  6, 34, 26,  1, 23,
  17, 40, 49, 48, 19, 17, 29, 32, 36,
  37, 38, 13, 12,  6, 15
]


Q:[
        [32,44,17,17,12,47,39, 5,25,48,33,29,48,30,44],
        [14, 2,45,35,18,29,16,16,38,29,12,14, 2,16,38],
        [36,31,16,45, 4,41,24,16,14,48, 2,15,37, 3,41],
        [ 6,28,28,23,48,14,27,29,13, 7, 8,27,14, 5,31],
        [33,35, 3,10,41, 7, 2,33,44,32,48,31, 7,38,37],
        [45,29,41,32,11, 4,38,39,10,13,22, 6,46,30,14],
        [49, 9,23,19,20,29,14,10,27, 7, 5,40,22,17, 6],
        [31, 8,10,42,22,12,20,13,40,45,16,41,45, 6,49]
    ]
A:




Here is an example of what spiral order should be:

    [
        [1, 2, 3]
        [4, 5, 6]
        [7, 8, 9]
    ]

Answer: [1, 2, 3, 6, 9, 8, 7, 4, 5]

Note that the matrix will not always be square:

    [
        [1,  2,  3,  4]
        [5,  6,  7,  8]
        [9, 10, 11, 12]
    ]

Answer: [1, 2, 3, 4, 8, 12, 11, 10, 9, 5, 6, 7]
 */


let matrix = [
    [33, 4, 5, 32, 38],
    [35, 48, 3, 19, 47],
    [33, 4, 25, 3, 30],
    [47, 9, 32, 23, 1],
    [5, 20, 41, 4, 48],
    [33, 9, 50, 47, 28],
    [43, 8, 41, 45, 35],
    [48, 28, 34, 49, 9],
    [26, 40, 14, 18, 30],
    [41, 31, 15, 20, 10],
    [10, 19, 1, 25, 19],
    [50, 13, 8, 17, 21],
    [47, 24, 38, 12, 37],
    [31, 21, 45, 18, 32],
    [41, 25, 8, 39, 46],
]


let height = matrix.length;
let width = matrix[0].length;
let minX = 0;
let minY = 0;
let maxX = width - 1;
let maxY = height - 1

//(0,0) is in top left
let currX = -1;
let currY = 0;


let spiralizedArray = [];
let travelDir = 'right'

let done = false;

while (!done) {

    //travel in our direction
    console.log(`at (${currX},${currY}) and traveling ${travelDir}`)
    if (travelDir === 'right') {
        currX++;
    } else if (travelDir === 'down') {
        currY++
    } else if (travelDir === 'left') {
        currX--;
    } else if (travelDir === 'up') {
        currY--
    } else {
        console.log({spiralizedArray, currX, currY, minX, maxX, minY, maxY});
        throw Error(`unknown travel direction direction!`);
    }

    //record our spot
    spiralizedArray.push(matrix[currY][currX]);

    if (travelDir === 'right' && currX === maxX) {
        travelDir = 'down'
        minY++
        done = minY > maxY;
    } else if (travelDir === 'down' && currY === maxY) {
        travelDir = 'left'
        maxX--;
        done = minX > maxX;
    } else if (travelDir === 'left' && currX === minX) {
        travelDir = 'up'
        maxY--
        done = minY > maxY;
    } else if (travelDir === 'up' && currY === minY) {
        travelDir = 'right'
        minX++;
        done = minX > maxX;
    } else {
        //just keep going the same direction
    }


}
console.log(`The Answer is:`)
console.log(`[${spiralizedArray}]`);

