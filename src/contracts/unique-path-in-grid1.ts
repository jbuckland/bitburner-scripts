import {Grid, GridDirection} from '/contracts/grid-utils';
import {ICell, IContractSolution} from '/contracts/types';
import {CodingContractType} from '/lib/consts';



export class UniquePathInGrid1 implements IContractSolution {

    /**Unique Paths in a Grid I
     You are attempting to solve a Coding Contract. You have 10 tries remaining, after which the contract will self-destruct.


     You are in a grid with 10 rows and 13 columns, and you are positioned in the top-left corner of that grid.
     You are trying to reach the bottom-right corner of the grid, but you can only move down or right on each step.
     Determine how many unique paths there are from start to finish.

     NOTE: The data returned for this contract is an array with the number of rows and columns:
     //[y,x]
     [10, 13]

     */

    public type: CodingContractType = CodingContractType.uniquePathsInAGrid1;
    private destCell: ICell | undefined;


    public solve(gridSize: number[]): string[] | number {
        let answerNumber: number = 0;

        let grid = new Grid();
        grid.setGridSize(gridSize[1], gridSize[0], -1);


        let startCell = grid.getCell(0, 0);
        this.destCell = grid.getCell(grid.width - 1, grid.height - 1);

        if (!startCell) {
            throw new Error(`Could not get the starting cell!`);
        }

        if (!this.destCell) {
            throw new Error(`Could not get the destination cell!`);
        }



        let validPathCount: number = 0;

        //validPathCount = this.getValidPathCountRecurse(this.destCell);


        let pathQueue: IPathNode[] = [];

        let whileCount = 0;
        while (pathQueue.length > 0 && whileCount < 10) {
            console.log(`UniquePathInGrid1`, pathQueue);
            let currNode = pathQueue.shift();
            if (!currNode) {
                throw new Error(`pathQueue was empty when it shouldn't have been!`);
            } else {
                let currCell = currNode.cell;

                if (currCell.x === this.destCell.x && currCell.y === this.destCell.y) {
                    //we made it!                    
                    currNode.validPathCount = 1;
                    currNode.destNodes = [];

                } else {
                    let options = grid.getOptions(currCell);

                    //in this contract, only down and right are valid directions
                    currNode.destNodes = [];
                    options.filter(o => o.direction === GridDirection.down || o.direction === GridDirection.right)
                        .map(o => {
                                return {} as IPathNode;
                            }
                        );

                    let sourceOptions = options.filter(o => o.direction === GridDirection.up || o.direction === GridDirection.left);
                    /*
                                        for (const opt of options) {
                                            //create new paths for each possible direction
                                            let newPath: IGridPath = {route: [...currNode.route, opt.destCell], currentCell: opt.destCell};
                                            pathQueue.push(newPath);
                                        }
                                        
                     */
                }


            }
            whileCount++;
        }

        answerNumber = validPathCount;

        return answerNumber;

    }

    private getValidPathCountRecurse(cell: ICell): number {

        if (this.destCell) {
            if (cell.x === this.destCell.x && cell.y === this.destCell.y) {
                //if you AT the destination, there is one way to get TO the destination
                cell.value = 1;
                return cell.value;
            } else {



            }
        } else {

            //error!!!c

        }



        return 0;
    }
}

interface IPathNode {
    cell: ICell;
    sourceNodes: ICell[];
    destNodes: ICell[];
    validPathCount: number;
}

interface IGridPath {
    route: ICell[];
    currentCell: ICell;
}

