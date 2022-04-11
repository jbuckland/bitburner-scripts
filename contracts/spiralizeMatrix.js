/*
Spiralize Matrix

Given the following array of arrays of numbers representing a 2D matrix, return the elements of the matrix as an array in spiral order:

Q:       [
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
    [16, 47, 38, 7, 15, 26, 35, 16, 4, 6, 17],
    [17, 29, 32, 36, 37, 38, 13, 12, 6, 15, 15],
    [19, 48, 49, 40, 17, 23, 1, 26, 34, 6, 30]
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
console.log(spiralizedArray);

