import {Grid, GridDirection} from '/contracts/grid-utils';
import {ICell, IContractSolver} from '/contracts/types';
import {CodingContractType} from '/lib/consts';
import {NS} from '/NetscriptDefinitions';

export class UniquePathsInGrid2 implements IContractSolver {
    public debug: boolean=false;

    /**Unique Paths in a Grid II
     You are located in the top-left corner of the following grid:

     0,0,0,0,0,0,1,0,0,0,0,
     0,0,0,0,0,0,0,0,1,0,0,
     0,0,0,0,0,0,0,0,0,0,0,
     0,0,0,0,1,0,0,0,0,0,1,
     1,0,0,0,0,0,0,0,1,0,0,
     1,0,1,0,0,0,1,0,1,0,0,

     You are trying reach the bottom-right corner of the grid, but you can only move down or right on each step. Furthermore, there are obstacles on the grid that you cannot move onto. These obstacles are denoted by '1', while empty spaces are denoted by 0.

     Determine how many unique paths there are from start to finish.

     NOTE: The data returned for this contract is an 2D array of numbers representing the grid.

     */

    public type: CodingContractType = CodingContractType.uniquePathsInAGrid2;

    constructor(private ns: NS) {
    }

    public solve(input: number[][]): string[] | number {
        let answerNumber: number = 0;

        let grid = new Grid();
        grid.setGridData(input);


        let startCell = grid.getCell(0, 0);

        let pathQueue: ICell[][] = [
            [startCell!]
        ];

        let validPaths: ICell[][] = [];
        while (pathQueue.length > 0) {
            let currPath = pathQueue.shift();
            if (!currPath) {
                throw new Error(`pathQueue was empty when it shouldn't have been!`);
            } else {
                let lastCell = currPath[currPath.length];

                if (lastCell.x === grid.width - 1 && lastCell.y === grid.height - 1) {
                    //we made it!
                    //add this path to the list of valid ones
                    validPaths.push(currPath);
                } else {
                    let options = grid.getOptions(lastCell);

                    //in this contract, only down and right are valid directions
                    options = options.filter(o => o.direction === GridDirection.down || o.direction === GridDirection.right);

                }


            }
        }

        answerNumber = validPaths.length;

        return answerNumber;

    }

}

