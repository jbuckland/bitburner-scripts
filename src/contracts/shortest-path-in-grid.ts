import {BaseSolver} from '/contracts/template-solver';
import {CodingContractType} from '/lib/consts';


interface Cell {
    x: number,
    y: number
}

interface CellOption extends Cell {
    steps: number;
    dir: 'U' | 'D' | 'L' | 'R';
}

export class ShortestPathInGrid extends BaseSolver {

    public type = CodingContractType.shortestPathInGrid;
    private numberGrid: number[][] = [];
    private height: number = 0;
    private width: number = 0;



    public solve(input: number[][]): string[] | number {

        this.numberGrid = input;

        this.height = this.numberGrid.length;
        this.width = this.numberGrid[0].length;

        this.debugPrint(`grid is ${this.width}x${this.height}`);

        //first, turn all the 1's into -1, and 0's into 999's
        //this way we can use the value to indicate number of steps  
        for (let y = 0; y < this.numberGrid.length; y++) {
            const row = this.numberGrid[y];
            for (let x = 0; x < row.length; x++) {
                if (row[x] === 1) {
                    row[x] = -1;
                } else if (row[x] === 0) {
                    row[x] = 99;
                }
            }
        }


        this.numberGrid[0][0] = 0; //it takes 0 steps to get to the first cell
        let options: Cell[] = [{x: 0, y: 0}];

        //calculate distances to cells
        while (options.length > 0) {

            let currCell = options.shift()!; //queue instead of a stack, for cuz
            let currStepCount = this.numberGrid[currCell.y][currCell.x];
            let nextStepCount = currStepCount + 1;
            let currOptions = this.getCellOptions(currCell);

            currOptions.forEach(cell => {
                //if we found a shorter way to get to this cell, update it's value,
                //(using 999 as the initial value means the first time we get to a cell it will always be the best way to get there
                if (nextStepCount < this.numberGrid[cell.y][cell.x]) {
                    this.numberGrid[cell.y][cell.x] = nextStepCount;
                    options.push(cell);
                }
            });

        }

        this.numberGrid.forEach(row => {
            let rowString = row.map(num => num.toString().padStart(2)).join('|');
            console.log(rowString);
        });


//trace the shortest path, starting from the end;
        let pathString = '';

        let currCell = {x: this.width - 1, y: this.height - 1};

        while (currCell.x !== 0 || currCell.y !== 0) {
            let pathOptions = this.getCellOptions(currCell);
            pathOptions.sort((a, b) => a.steps - b.steps);

            let nextCell = pathOptions[0];
            //building the path backwards
            pathString = this.invertDirection(nextCell.dir) + pathString;
            currCell = nextCell;

        }


        this.numberGrid.forEach(row => {
            row.map(num => num.toString().padStart(3));
            console.log(row.map(num => num.toString().padStart(2)));
        });
        console.log(`Path: ${pathString}`);



        return 0;
    }

    private getCellOptions(cell: Cell): CellOption[] {
        let options: CellOption[] = [];

        //options are up, down, left, right,
        //check left
        let left: CellOption = {x: cell.x - 1, y: cell.y, dir: 'L', steps: 0};
        if (this.locationIsValid(left)) {
            left.steps = this.numberGrid[left.y][left.x];
            options.push(left);
        }

        //check right
        let right: CellOption = {x: cell.x + 1, y: cell.y, dir: 'R', steps: 0};
        if (this.locationIsValid(right)) {
            right.steps = this.numberGrid[right.y][right.x];
            options.push(right);
        }

        //check up
        let up: CellOption = {x: cell.x, y: cell.y - 1, dir: 'U', steps: 0};
        if (this.locationIsValid(up)) {
            up.steps = this.numberGrid[up.y][up.x];
            options.push(up);
        }

        //check down
        let down: CellOption = {x: cell.x, y: cell.y + 1, dir: 'D', steps: 0};
        if (this.locationIsValid(down)) {
            down.steps = this.numberGrid[down.y][down.x];
            options.push(down);
        }


        return options;
    }

    private locationIsValid(cell: Cell) {
        //Invalid if going past a wall, or into a -1

        let isValid = true;

        isValid = isValid && cell.x >= 0;
        isValid = isValid && cell.y >= 0;
        isValid = isValid && cell.x < this.width;
        isValid = isValid && cell.y < this.height;
        isValid = isValid && this.numberGrid[cell.y][cell.x] >= 0;

        return isValid;
    }


    private invertDirection(dir: string) {
        let revDir = '';
        if (dir === 'U') revDir = 'D';
        else if (dir === 'D') revDir = 'U';
        else if (dir === 'L') revDir = 'R';
        else if (dir === 'R') revDir = 'L';


        return revDir;
    }

}
