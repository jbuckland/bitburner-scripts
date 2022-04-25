import {CrimeMode, DebugLevel, HacknetMode} from 'lib/consts';
import {debugLog, getSettings, setSettings} from 'lib/utils';
import {addOptionsToSelect, ISelectOption, makeMainUIContainer} from 'lib/utils-ui';
import {NS} from 'NetscriptDefinitions';
import {IGlobalSettings, INetscriptExtra} from 'types';

interface ISettingsView {
    setForceSwitchWork(value: boolean): void;

    setAutoStartWork(value: boolean): void;

    setCrimeModeSelection(value: string): void;

    setHacknetModeSelection(hacknetMode: string): void;

    setMaxCostBen(value: number): void;
}

export async function main(ns: NS & INetscriptExtra) {
    ns.tail();
    ns.clearLog();
    ns.disableLog('ALL');

    let template = `
        <style>
            #mainContainer{
                background-color: rgba(51,63,136,0.19);            
            }
            
            .settingsRow{                
                padding:5px;
            }
            
            input[type='checkbox']{
                transform: scale(1.75);
            }
            
            select{
              font-size: 16px;
              font-weight: bold;
            }
            input{
              font-size: 16px;
              font-weight: bold;
            }
        
        </style>
        
        <div class="settingsRow">
            <label>Auto Start Work:</label> <input id="chkAutoStartWork" type="checkbox">
        </div>
        <div class="settingsRow">
            <label>Force Switch Work:</label> <input id="chkForceSwitchWork" type="checkbox">
        </div>        
        <div class="settingsRow">
          <label>Crime Mode:</label> <select id="cmbCrimeMode"></select>
        </div> 
        <div class="settingsRow">
          <label>Hacknet Mode:</label> <select id="cmbHacknetMode"></select>
        </div>        
       <!-- <div class="settingsRow">
          <label>Max Hacknet Cost/Ben:</label> <input id="numMaxCostBen" type="number"/>
        </div>-->
        `;

    let view: ISettingsView = {
        setHacknetModeSelection(hacknetMode: string): void {
            if (cmbHacknetMode) {
                cmbHacknetMode.value = hacknetMode;
            }
        },
        setCrimeModeSelection(value: string) {
            if (cmbCrimeMode) {
                cmbCrimeMode.value = value;
            }
        },
        setForceSwitchWork(value: boolean) {
            if (chkForceSwitchWork) {
                chkForceSwitchWork.checked = value;
            }
        },
        setAutoStartWork(value: boolean) {
            if (chkAutoStartWork) {
                chkAutoStartWork.checked = value;
            }
        },
        setMaxCostBen(value: number) {
            if (numMaxCostBen && value != numMaxCostBen.valueAsNumber) {
                numMaxCostBen.valueAsNumber = value;
            }
        }
    };

    let chkAutoStartWork: HTMLInputElement;
    let chkForceSwitchWork: HTMLInputElement;
    let cmbCrimeMode: HTMLSelectElement;
    let cmbHacknetMode: HTMLSelectElement;
    let numMaxCostBen: HTMLInputElement;


    let controller = new SettingsUiController(ns, view);
    let mainContainer = makeMainUIContainer(ns);

    if (mainContainer) {
        mainContainer.innerHTML = template;

        mainContainer.style.padding = '10px';

        chkAutoStartWork = document.getElementById('chkAutoStartWork') as HTMLInputElement;
        if (chkAutoStartWork) {
            chkAutoStartWork.onclick = () => controller.onChange_AutoStartWork(chkAutoStartWork.checked);
        }

        chkForceSwitchWork = document.getElementById('chkForceSwitchWork') as HTMLInputElement;
        if (chkForceSwitchWork) {
            chkForceSwitchWork.onclick = () => controller.onChange_forceSwitchWork(chkForceSwitchWork.checked);
        }

        numMaxCostBen = document.getElementById('numMaxCostBen') as HTMLInputElement;
        if (numMaxCostBen) {
            //numMaxCostBen.onchange = (event) => controller.onChange_maxCostBen(event.target?.value);
            numMaxCostBen.addEventListener('change', (event) => {
                controller.onChange_maxCostBen(numMaxCostBen.valueAsNumber);
            });
        }

        cmbCrimeMode = document.getElementById('cmbCrimeMode') as HTMLSelectElement;
        if (cmbCrimeMode) {
            cmbCrimeMode.onchange = () => controller.onChange_crimeMode(cmbCrimeMode.value);
            addOptionsToSelect(cmbCrimeMode, controller.crimeModeOptions);
        }
        cmbHacknetMode = document.getElementById('cmbHacknetMode') as HTMLSelectElement;
        if (cmbHacknetMode) {
            cmbHacknetMode.onchange = () => controller.onChange_hacknetMode(cmbHacknetMode.value);
            addOptionsToSelect(cmbHacknetMode, controller.hacknetModeOptions);
        }

    }

    while (true) {
        //have to keep the script alive to keep the ui working
        controller.init();
        await ns.asleep(1000);
    }

}

class SettingsUiController {
    public crimeModeOptions: ISelectOption[] = [];
    public hacknetModeOptions: ISelectOption[] = [];
    private settings: IGlobalSettings = {};

    constructor(private ns: NS, private view: ISettingsView) {

        for (let crimeModeKey in CrimeMode) {
            this.crimeModeOptions.push({text: crimeModeKey, value: crimeModeKey});
        }
        for (let modeKey in HacknetMode) {
            this.hacknetModeOptions.push({text: modeKey, value: modeKey});
        }

    }

    public init() {
        let updatedSettings = getSettings(this.ns);
        if (updatedSettings) {
            if (this.settings.crimeMode) {
                this.view.setCrimeModeSelection(this.settings.crimeMode);
            }
            if (this.settings.hacknetMode) {
                this.view.setHacknetModeSelection(this.settings.hacknetMode);
            }

            this.view.setAutoStartWork(this.settings.autoStartWork ?? false);
            this.view.setForceSwitchWork(this.settings.forceSwitchWork ?? false);

            //if (updatedSettings.maxHashCostBen !== this.settings.maxHashCostBen) {
            //this.view.setMaxCostBen(this.settings.maxHashCostBen || 0);
            //}

            this.settings = updatedSettings;
        }
    }

    public onChange_crimeMode(value: string) {
        console.log(`onChange_crimeMode()`, value);
        if (value) {
            setSettings(this.ns, {crimeMode: value as CrimeMode});
        }
    }

    public onChange_hacknetMode(value: string) {
        debugLog(this.ns, DebugLevel.info, `onChange_hacknetMode(${value})`);
        if (value) {
            setSettings(this.ns, {hacknetMode: value as HacknetMode});
        }
    }

    public onChange_forceSwitchWork(checked: boolean) {
        setSettings(this.ns, {forceSwitchWork: checked});
    }

    public onChange_AutoStartWork(checked: boolean) {
        setSettings(this.ns, {autoStartWork: checked});
    }

    public onChange_maxCostBen(valueAsNumber: number) {
        setSettings(this.ns, {maxHashCostBen: valueAsNumber});
    }
}



