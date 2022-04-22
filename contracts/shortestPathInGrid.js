/*
Shortest Path in a Grid
You are located in the top-left corner of the following grid:

  [[0,0,0,1,1,1],
   [1,0,0,1,0,0],
   [0,0,1,0,0,0],
   [0,0,0,1,1,1],
   [0,1,0,0,0,0],
   [0,0,1,0,0,0],
   [0,1,0,1,0,0],
   [0,1,0,0,0,0]]

You are trying to find the shortest path to the bottom-right corner of the grid, but there are obstacles on the grid that you cannot move onto. These obstacles are denoted by '1', while empty spaces are denoted by 0.

Determine the shortest path from start to finish, if one exists. The answer should be given as a string of UDLR characters, indicating the moves along the path

NOTE: If there are multiple equally short paths, any of them is accepted as answer. If there is no path, the answer should be an empty string.
NOTE: The data returned for this contract is an 2D array of numbers representing the grid.

Examples:

    [[0,1,0,0,0],
     [0,0,0,1,0]]

Answer: 'DRRURRD'

    [[0,1],
     [1,0]]

Answer: ''
 */


let numberGrid =  [
    [0,0,0,0,0,0,0,1,0,0],
    [1,0,0,1,0,1,0,0,0,0],
    [0,0,0,0,0,0,1,0,1,1],
    [1,1,0,1,1,0,1,1,0,0],
    [0,1,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,1,0,1,0],
    [0,0,0,1,0,1,0,0,0,0],
    [1,0,0,1,1,0,1,0,1,0],
    [0,1,0,1,1,1,1,0,0,0],
    [1,0,1,0,0,0,0,0,0,0],
    [1,0,1,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0]]

let height = numberGrid.length;
let width = numberGrid[0].length;

console.log(`grid is ${width}x${height}`)

//first, turn all the 1's into -1, and 0's into 999's
//this way we can use the value to indicate number of steps  
for (let y = 0; y < numberGrid.length; y++) {
    const row = numberGrid[y];
    for (let x = 0; x < row.length; x++) {
        if (row[x] === 1) {
            row[x] = -1;
        } else if (row[x] === 0) {
            row[x] = 99;
        }
    }
}


numberGrid[0][0] = 0; //it takes 0 steps to get to the first cell
let options = [{x: 0, y: 0}];

//calculate distances to cells
while (options.length > 0) {

    let currCell = options.shift(); //queue instead of a stack, for cuz
    let currStepCount = numberGrid[currCell.y][currCell.x];
    let nextStepCount = currStepCount + 1;
    let currOptions = getCellOptions(currCell);

    currOptions.forEach(cell => {
        //if we found a shorter way to get to this cell, update it's value,
        //(using 999 as the initial value means the first time we get to a cell it will always be the best way to get there
        if (nextStepCount < numberGrid[cell.y][cell.x]) {
            numberGrid[cell.y][cell.x] = nextStepCount
            options.push(cell);
        }
    })

}

numberGrid.forEach(row => {
    let rowString = row.map(num => num.toString().padStart(2)).join('|');
    console.log(rowString);
})


//trace the shortest path, starting from the end;
let pathString = '';

let currCell = {x: width - 1, y: height - 1}

while (currCell.x !== 0 || currCell.y !== 0) {
    let pathOptions = getCellOptions(currCell);
    pathOptions.sort((a, b) => a.steps - b.steps)

    let nextCell = pathOptions[0];
    //building the path backwards
    pathString = invertDirection(nextCell.dir) + pathString;
    currCell = nextCell

}


numberGrid.forEach(row => {
    row.map(num => num.toString().padStart(3));
    console.log(row.map(num => num.toString().padStart(2)));
})
console.log(`Path: ${pathString}`)


function getCellOptions(cell) {
    let options = [];

    //options are up, down, left, right,
    //check left
    let left = {x: cell.x - 1, y: cell.y, dir: "L"}
    if (locationIsValid(left)) {
        left.steps = numberGrid[left.y][left.x]
        options.push(left);
    }

    //check right
    let right = {x: cell.x + 1, y: cell.y, dir: "R"}
    if (locationIsValid(right)) {
        right.steps = numberGrid[right.y][right.x]
        options.push(right);
    }

    //check up
    let up = {x: cell.x, y: cell.y - 1, dir: 'U'}
    if (locationIsValid(up)) {
        up.steps = numberGrid[up.y][up.x]
        options.push(up);
    }

    //check down
    let down = {x: cell.x, y: cell.y + 1, dir: 'D'}
    if (locationIsValid(down)) {
        down.steps = numberGrid[down.y][down.x]
        options.push(down);
    }


    return options;
}

function locationIsValid(cell) {
    //Invalid if going past a wall, or into a -1

    let isValid = true;

    isValid = isValid && cell.x >= 0;
    isValid = isValid && cell.y >= 0;
    isValid = isValid && cell.x < width;
    isValid = isValid && cell.y < height;
    isValid = isValid && numberGrid[cell.y][cell.x] >= 0;

    return isValid;
}


function invertDirection(dir) {
    let revDir = '';
    if (dir === 'U') revDir = 'D'
    else if (dir === 'D') revDir = 'U'
    else if (dir === 'L') revDir = 'R'
    else if (dir === 'R') revDir = 'L'


    return revDir;
}
