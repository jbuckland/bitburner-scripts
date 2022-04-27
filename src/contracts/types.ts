import {GridDirection} from '/contracts/grid-utils';
import {CodingContractType} from '/lib/consts';

export interface IContractSolver {

    type: CodingContractType;
    debug: boolean;

    solve(input: any): string[] | number;


}


export interface IGridDirectionOption {
    destCell: ICell;
    direction: GridDirection;
}

export interface ICell {
    isPassable: boolean;
    value: number;
    x: number,
    y: number;
}

