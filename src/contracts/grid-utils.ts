import {ICell, IGridDirectionOption} from '/contracts/types';

export class Grid {
    public height: number = 0;
    public width: number = 0;
    private cells: ICell[][] = [];

    public getCell(x: number, y: number): ICell | undefined {
        let cell: ICell | undefined;

        if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
            cell = this.cells[y][x];
        }


        return cell;
    }

    public getOptions(srcCell: ICell): IGridDirectionOption[] {
        let options: IGridDirectionOption[] = [];

        //options are up, down, left, right,
        //check left

        let leftCell = this.getCell(srcCell.x - 1, srcCell.y);


        if (leftCell && this.locationIsValid(leftCell)) {
            options.push({
                destCell: leftCell,
                direction: GridDirection.left
            });
        }


        //check right
        let rightCell = this.getCell(srcCell.x + 1, srcCell.y);
        if (rightCell && this.locationIsValid(rightCell)) {
            options.push({
                destCell: rightCell,
                direction: GridDirection.right
            });
        }


        //check up
        let upCell = this.getCell(srcCell.x, srcCell.y - 1);
        if (upCell && this.locationIsValid(upCell)) {
            options.push({
                destCell: upCell,
                direction: GridDirection.up
            });
        }


        //check down
        let downCell = this.getCell(srcCell.x, srcCell.y + 1);
        if (downCell && this.locationIsValid(downCell)) {
            options.push({
                destCell: downCell,
                direction: GridDirection.down
            });
        }

        return options;
    }

    public locationIsValid(cell: ICell) {
        //Invalid if going past a wall, or into a -1

        let isValid = true;

        isValid = isValid && cell.x >= 0;
        isValid = isValid && cell.y >= 0;
        isValid = isValid && cell.x < this.width;
        isValid = isValid && cell.y < this.height;
        isValid = isValid && cell.isPassable;

        return isValid;
    }

    public setGridData(gridData: number[][]) {
        this.height = gridData.length;
        this.width = gridData[0].length;

        this.cells = gridData.map((row, y) => {
            return row.map((cellValue, x) => {
                return {
                    x: x,
                    y: y,
                    isPassable: cellValue !== 1,
                    value: cellValue
                } as ICell;

            });
        });
    }

    public setGridSize(width: number, height: number, defaultValue: number) {
        this.height = height;
        this.width = width;
        this.cells = [];
        for (let y = 0; y < height; y++) {
            let row: ICell[] = [];

            for (let x = 0; x < width; x++) {
                let cell: ICell = {x: x, y: y, isPassable: true, value: defaultValue};
                row.push(cell);
            }

            this.cells.push(row);
        }

    }

}


export enum GridDirection {
    left = 'L',
    right = 'R',
    up = 'U',
    down = 'D',
}

