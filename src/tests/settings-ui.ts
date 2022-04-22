import {CrimeMode, DebugLevel, HacknetMode} from 'lib/consts';
import {debugLog, getSettings, setSettings, timestamp} from 'lib/utils';
import {addOptionsToSelect, ISelectOption, makeMainUIContainer} from 'lib/utils-ui';
import {NS} from 'NetscriptDefinitions';
import {IGlobalSettings, INetscriptExtra} from 'types';

interface ISettingsView {
    setAutoSwitch(value: boolean): void;

    setCrimeModeSelection(value: string): void;

    setHacknetModeSelection(hacknetMode: string): void;
}

export async function main(ns: NS & INetscriptExtra) {
    ns.tail();
    ns.clearLog();
    ns.disableLog('ALL');

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
        setAutoSwitch(value: boolean) {
            if (chkAutoSwitch) {
                chkAutoSwitch.checked = value;
            }
        }
    };
    let chkAutoSwitch: HTMLInputElement;
    let cmbCrimeMode: HTMLSelectElement;
    let cmbHacknetMode: HTMLSelectElement;
    let template = `
        <style>
            body{
               /* size: 14px;*/
            }
            
            #mainContainer{
                background-color: rgba(51,63,136,0.19);            
            }
            
            .settingsRow{                
                padding:5px;
            }
            
            input[type='checkbox']{
                /*height:20px;width: 20px;*/
                   transform: scale(1.75);
            }
            
            select{
              font-size: 16px;
              font-weight: bold;
            }
        </style>
        
        <div class="settingsRow">
            <label>Auto Switch Tasks:</label> <input id="chkAutoSwitch" type="checkbox">
        </div>
        <div class="settingsRow">
          <label>Hack Percent:</label> <label id="lblHackPercent"></label>
        </div>
        <div class="settingsRow">
          <label>Crime Mode:</label> <select id="cmbCrimeMode"></select>
        </div> 
        <div class="settingsRow">
          <label>Hacknet Mode:</label> <select id="cmbHacknetMode"></select>
        </div>        
        `;


    let controller = new SettingsUiController(ns, view);
    let mainContainer = makeMainUIContainer(ns);

    if (mainContainer) {
        mainContainer.innerHTML = template;

        mainContainer.style.padding = '10px';

        chkAutoSwitch = document.getElementById('chkAutoSwitch') as HTMLInputElement;
        if (chkAutoSwitch) {
            chkAutoSwitch.onclick = () => controller.onChange_autoSwitch(chkAutoSwitch.checked);
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

    public doFoo() {
        console.log(timestamp());
    }

    public init() {
        this.settings = getSettings(this.ns);
        if (this.settings) {
            if (this.settings.crimeMode) {
                this.view.setCrimeModeSelection(this.settings.crimeMode);
            }
            if (this.settings.hacknetMode) {
                this.view.setHacknetModeSelection(this.settings.hacknetMode);
            }


            this.view.setAutoSwitch(this.settings.autoSwitchTasks ?? false);
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

    public onChange_autoSwitch(checked: boolean) {
        debugLog(this.ns, DebugLevel.info, `onChange_autoSwitch(${checked})`);
        setSettings(this.ns, {autoSwitchTasks: checked});
    }
}



