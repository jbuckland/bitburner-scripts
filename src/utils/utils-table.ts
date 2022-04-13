import { NS } from 'NetscriptDefinitions';

type HorizType = 'top' | 'middle' | 'bottom';
type HorizCount = 'single' | 'double';

export interface TableCell {
    text: string;
}

export interface TableHeaderCell extends TableCell {
    align?: 'left' | 'right';
    dataKey: string;
    order?: number;
    width?: number;

}

export interface TableRow {
    cells: TableCell[];
}

export interface HeaderRow {
    [key: string]: TableHeaderCell;
}

export interface ITableData {
    [key: string]: string;
}

export class Table {

    public SHOW_FOOTER: boolean = false;
    public headerRow: HeaderRow = {};
    public rows: TableRow[] = [];
    private readonly CELL_PADDING = ' ';
    private readonly CORNER_BOTTOM_LEFT = '╚';
    private readonly CORNER_BOTTOM_RIGHT = '╝';
    private readonly CORNER_TOP_LEFT = '╔';
    private readonly CORNER_TOP_RIGHT = '╗';
    private readonly HORIZ_DOUBLE = '═'; //~*
    private HORIZ_LINES: boolean = false;
    private readonly HORIZ_SINGLE = '─'; //~*
    private readonly INTERSECT_EDGE_BOTTOM = '╧';
    private readonly INTERSECT_EDGE_LEFT = '╟';
    private readonly INTERSECT_EDGE_LEFT_2 = '╠';
    private readonly INTERSECT_EDGE_RIGHT = '╢';
    private readonly INTERSECT_EDGE_RIGHT_2 = '╣';
    private readonly INTERSECT_EDGE_TOP = '╤';
    private readonly INTERSECT_INNER = '┼';
    private readonly INTERSECT_INNER_2 = '╪';
    private readonly TABLE_LEFT_MARGIN = ' ';
    private readonly VERT_INNER = '│';
    private readonly VERT_OUTER = '║';
    private _data: ITableData[] | undefined;

    public constructor(private _ns: NS) {

    }

    public print() {

        if (this._data) {

            this.printHorizLine('top', 'double');
            this.printHeader();
            this.printHorizLine('middle', 'double');

            for (let i = 0; i < this._data.length; i++) {
                const row = this._data[i];

                this.printRow(row);

            }

            if (this.SHOW_FOOTER) {
                this.printHorizLine('middle', 'double');
                this.printHeader();
                this.printHorizLine('bottom', 'double');
            } else {
                //need to print a final line if we're not printing row lines
                if (!this.HORIZ_LINES) {
                    this.printHorizLine('bottom', 'double');
                }
            }
        }

    }

    public setData(data: ITableData[]) {
        this._data = data;

        if (data && data.length) {
            let dataRow = data[0];

            let dataKeys = Object.keys(dataRow);

            //make the header data
            for (let i = 0; i < dataKeys.length; i++) {
                const key = dataKeys[i];

                let headerCell: TableHeaderCell = this.headerRow[key];

                if (!headerCell) {
                    headerCell = { dataKey: key, text: key, order: i };
                    this.headerRow[key] = headerCell;
                }

            }

        }

        //for each column, find max text width
        for (let i = 0; i < Object.keys(this.headerRow).length; i++) {
            const dataKey = Object.keys(this.headerRow)[i];

            let headerCell = this.headerRow[dataKey];

            if (!headerCell.width) {
                headerCell.width = headerCell.text.length;

                for (let j = 0; j < this._data.length; j++) {
                    const row = this._data[j];

                    let cellText = row[dataKey];

                    if (cellText.length > headerCell.width) {
                        headerCell.width = cellText.length;
                    }

                }
            }

        }

    }

    private printHeader() {
        let rowString = `${this.TABLE_LEFT_MARGIN}${this.VERT_OUTER}`;
        let cells = Object.values(this.headerRow);
        cells.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

        cells.forEach((headerCell, index) => {

            let spaces = (headerCell.width ?? 0) - headerCell.text.length;
            let leftSpace = Math.floor(spaces / 2.0);
            let rightSpace = Math.ceil(spaces / 2.0);

            let cellText = `${' '.repeat(leftSpace)}${headerCell.text}${' '.repeat(rightSpace)}`;

            rowString += `${this.CELL_PADDING}${cellText}${this.CELL_PADDING}`;

            if (index < cells.length - 1) {
                rowString += this.VERT_INNER;
            } else {
                rowString += this.VERT_OUTER;
            }

        });

        this._ns?.print(rowString);
    }

    private printHorizLine(horizType: HorizType, count: HorizCount) {
        let horizLine = ``;
        horizLine = this.TABLE_LEFT_MARGIN;

        let lineWidth = 0;

        if (horizType === 'top') {
            horizLine += this.CORNER_TOP_LEFT;
        } else if (horizType === 'middle') {

            if (count === 'single') {
                horizLine += this.INTERSECT_EDGE_LEFT;
            } else {
                horizLine += this.INTERSECT_EDGE_LEFT_2;
            }

        } else {
            horizLine += this.CORNER_BOTTOM_LEFT;
        }

        let cells = Object.values(this.headerRow);
        cells.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

        for (let i = 0; i < cells.length; i++) {
            const headerCell = cells[i];
            lineWidth += (headerCell.width ?? 0) + this.VERT_INNER.length + (this.CELL_PADDING.length * 2); //add one divider width for each cell

            let cellTextWidth = (headerCell.width ?? 0) + (this.CELL_PADDING.length * 2);

            if (count === 'double') {
                horizLine += this.HORIZ_DOUBLE.repeat(cellTextWidth);
            } else {
                horizLine += this.HORIZ_SINGLE.repeat(cellTextWidth);
            }

            //if it's the last cell
            if (i === cells.length - 1) {
                if (horizType === 'top') {
                    horizLine += this.CORNER_TOP_RIGHT;
                } else if (horizType === 'middle') {

                    if (count === 'single') {
                        horizLine += this.INTERSECT_EDGE_RIGHT;
                    } else {
                        horizLine += this.INTERSECT_EDGE_RIGHT_2;
                    }

                } else {
                    horizLine += this.CORNER_BOTTOM_RIGHT;
                }

            } else {
                if (horizType === 'top') {
                    horizLine += this.INTERSECT_EDGE_TOP;
                } else if (horizType === 'middle') {

                    if (count === 'single') {
                        horizLine += this.INTERSECT_INNER;
                    } else {
                        horizLine += this.INTERSECT_INNER_2;

                    }

                } else {
                    horizLine += this.INTERSECT_EDGE_BOTTOM;
                }
            }
        }

        this._ns?.print(horizLine);
    }

    private printRow(row: ITableData) {

        let rowString = `${this.TABLE_LEFT_MARGIN}${this.VERT_OUTER}`;

        let keys = Object.keys(row);

        for (let i = 0; i < keys.length; i++) {
            const dataKey = keys[i];

            let headerCell = this.headerRow[dataKey];

            let cellText = row[dataKey].padStart(headerCell.width ?? 0);
            if (headerCell.align === 'left') {
                cellText = row[dataKey].padEnd(headerCell.width ?? 0);
            }

            rowString += `${this.CELL_PADDING}${cellText}${this.CELL_PADDING}`;

            if (i < keys.length - 1) {
                rowString += this.VERT_INNER;
            } else {
                rowString += this.VERT_OUTER;
            }

        }

        this._ns?.print(rowString);

        if (this.HORIZ_LINES) {
            this.printHorizLine('bottom', 'single');
        }

    }
}
