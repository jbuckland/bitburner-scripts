import {HOME, SCRIPTS} from '/lib/consts';
import {formatBigRam} from '/lib/utils';
import {displayHeader} from '/lib/utils-player';
import {ITableData, Table} from '/lib/utils-table';
import {NS, ProcessInfo} from '/NetscriptDefinitions';

interface IScriptInfo extends ProcessInfo {
    ramUse: number;

}

export async function main(ns: NS) {
    let controller = new StartController(ns);
    await controller.doRun();
}

class StartController {
    private SLEEP_TIME: number = 1000;
    private scriptsToStart: string[] = [
        SCRIPTS.megaController,
        SCRIPTS.watcher

    ];
    private runningScriptInfo: IScriptInfo[] = [];

    constructor(private ns: NS) {
        ns.tail();
        ns.disableLog('ALL');

    }

    public async doRun() {



        this.scriptsToStart.forEach(script => {
            this.ns.run(script);
        });

        if (this.ns.gang.inGang()) {
            this.ns.run('/old-controllers/crime-controller1.js');
        }



        while (true) {

            this.updateData();

            this.displayInfo();

            await this.ns.sleep(this.SLEEP_TIME);
        }

    }



    private displayInfo() {
        this.ns.clearLog();
        displayHeader(this.ns, 0);


        this.displayRunningScriptInfo();



    }

    private updateData() {
        let processInfos = this.ns.ps(HOME);
        this.runningScriptInfo = processInfos.filter(p => this.scriptsToStart.includes(p.filename)).map(process => {
            return {
                ...process,
                ramUse: this.ns.getScriptRam(process.filename)
            };
        });



    }

    private displayRunningScriptInfo() {
        let table = new Table(this.ns);
        let tableData: ITableData[] = [];

        this.runningScriptInfo.sort((a, b) => b.ramUse - a.ramUse);

        this.runningScriptInfo.forEach(info => {
            tableData.push({
                'Name': info.filename,
                'PID': info.pid.toString(),
                'RAM': formatBigRam(info.ramUse)

            });
        });

        table.setData(tableData);
        table.headerRow['Name'].align = 'left';

        table.print();


    }
}
