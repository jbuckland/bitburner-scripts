import {GridDirection} from '/contracts/grid-utils';
import {CodingContractType} from '/lib/consts';

export interface IContractSolution {

    type: CodingContractType;

    solve(input: any): string[] | number;


}


export interface IGridDirectionOption {
    direction: GridDirection;
    destCell: ICell;
}

export interface ICell {
    x: number,
    y: number;
    value: number;
    isPassable: boolean;
}
