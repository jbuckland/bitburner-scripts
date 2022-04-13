import { GangTaskStats } from 'NetscriptDefinitions';
import { IControllerConfig } from 'types';
import { SCRIPTS } from 'utils/consts';

export enum GYMS {
    powerhouse = 'powerhouse gym'
}

export const crimes = {
    shoplift: { name: 'shoplift', time: 3, money: 15000, moneyRate: 5000, moneyRatio: 1, karma: 0.05, karmaRate: 0.0167 },
    rob: { name: 'rob store', time: 60, money: 400000, moneyRate: 6666.666, moneyRatio: 1.333, karma: 0.5, karmaRate: 0.00833 },
    larceny: { name: 'larceny', time: 90, money: 800000, moneyRate: 8888.888, moneyRatio: 1.777, karma: 1.5, karmaRate: 0.0167 },
    mug: { name: 'mug', time: 4, money: 36000, moneyRate: 9000, moneyRatio: 1.8, karma: 0.25, karmaRate: 0.0625 },
    drugs: { name: 'deal drugs', time: 10, money: 120000, moneyRate: 12000, moneyRatio: 2.4, karma: 0.5, karmaRate: 0.05 },
    arms: { name: 'traffick illegal arms', time: 40, money: 600000, moneyRate: 15000, moneyRatio: 3, karma: 1, karmaRate: 0.025 },
    homicide: {
        name: 'homicide',
        time: 3,
        money: 45000,
        moneyRate: 15000,
        moneyRatio: 3,
        karma: 3,
        karmaRate: 1,
        hackWeight: 0,
        strWeight: 2,
        defWeight: 2,
        dexWeight: 0.5,
        agiWeight: 0.5,
        chaWeight: 0
    },//worse for stat gain than mug. Should have at least 60% success rate

    bond: { name: 'bond forgery', time: 300, money: 4500000, moneyRate: 15000, moneyRatio: 3, karma: 0.1, karmaRate: .000333 },
    gta: { name: 'grand theft auto', time: 80, money: 1600000, moneyRate: 20000, moneyRatio: 4, karma: 5, karmaRate: 0.0625 },
    kidnap: { name: 'kidnap and ransom', time: 120, money: 3600000, moneyRate: 30000, moneyRatio: 6, karma: 6, karmaRate: 0.05 },
    assassin: { name: 'assassinate', time: 300, money: 12000000, moneyRate: 40000, moneyRatio: 8, karma: 10, karmaRate: 0.0333 },
    heist: { name: 'heist', time: 600, money: 120000000, moneyRate: 200000, moneyRatio: 40, karma: 15, karmaRate: 0.067 }

};

export const crimeControllers: IControllerConfig[] = [
    { scriptName: SCRIPTS.crimeController0, sequenceNumber: 0, ramBuffer: 0, ramReq: 0 },
    { scriptName: SCRIPTS.crimeController1, sequenceNumber: 1, ramBuffer: 0, ramReq: 0 }
];

export enum PLAYER_STATS {
    agi = 'Agility',
    str = 'Strength',
    dex = 'Dexterity',
    def = 'Defense'

}

export enum GANG_EQUIP_TYPES {
    vehicle = 'Vehicle',
    armor = 'Armor',
    weapon = 'Weapon',
    augmentation = 'Augmentation',
    rootkit = 'Rootkit',
}

export enum GANG_TASK {

    unassigned = 'Unassigned',
    mug = 'Mug People',
    drugs = 'Deal Drugs',
    strongarm = 'Strongarm Civilians',
    con = 'Run a Con',
    robbery = 'Armed Robbery',
    arms = 'Traffick Illegal Arms',
    blackmail = 'Threaten & Blackmail',
    trafficking = 'Human Trafficking',
    terrorism = 'Terrorism',
    vigilante = 'Vigilante Justice',
    trainCombat = 'Train Combat',
    trainHacking = 'Train Hacking',
    trainCharisma = 'Train Charisma',
    territory = 'Territory Warfare',

}

export enum GangNames {
    slumSnakes = 'Slum Snakes',
    tetrads = 'Tetrads',
    syndicate = 'The Syndicate',
    darkArmy = 'The Dark Army',
    speakers = 'Speakers for the Dead',
    niteSec = 'NiteSec',
    blackHand = 'The Black Hand',
}

export const GangTasks: GangTaskStats[] = [
    {
        'name': 'Unassigned',
        'desc': 'This gang member is currently idle',
        'isHacking': true,
        'isCombat': true,
        'baseRespect': 0,
        'baseWanted': 0,
        'baseMoney': 0,
        'hackWeight': 100,
        'strWeight': 0,
        'defWeight': 0,
        'dexWeight': 0,
        'agiWeight': 0,
        'chaWeight': 0,
        'difficulty': 1,
        'territory': { 'money': 1, 'respect': 1, 'wanted': 1 }
    }, {
        'name': 'Mug People',
        'desc': 'Assign this gang member to mug random people on the streets<br><br>Earns money - Slightly increases respect - Very slightly increases wanted level',
        'isHacking': false,
        'isCombat': true,
        'baseRespect': 0.00005,
        'baseWanted': 0.00005,
        'baseMoney': 3.6,
        'hackWeight': 0,
        'strWeight': 25,
        'defWeight': 25,
        'dexWeight': 25,
        'agiWeight': 10,
        'chaWeight': 15,
        'difficulty': 1,
        'territory': { 'money': 1, 'respect': 1, 'wanted': 1 }
    },
    {
        'name': 'Vigilante Justice',
        'desc': 'Assign this gang member to be a vigilante and protect the city from criminals<br><br>Decreases wanted level',
        'isHacking': true,
        'isCombat': true,
        'baseRespect': 0,
        'baseWanted': -0.001,
        'baseMoney': 0,
        'hackWeight': 20,
        'strWeight': 20,
        'defWeight': 20,
        'dexWeight': 20,
        'agiWeight': 20,
        'chaWeight': 0,
        'difficulty': 1,
        'territory': { 'money': 1, 'respect': 1, 'wanted': 0.9 }
    },
    {
        'name': 'Deal Drugs',
        'desc': 'Assign this gang member to sell drugs<br><br>Earns money - Slightly increases respect - Slightly increases wanted level - Scales slightly with territory',
        'isHacking': false,
        'isCombat': true,
        'baseRespect': 0.00006,
        'baseWanted': 0.002,
        'baseMoney': 15,
        'hackWeight': 0,
        'strWeight': 0,
        'defWeight': 0,
        'dexWeight': 20,
        'agiWeight': 20,
        'chaWeight': 60,
        'difficulty': 3.5,
        'territory': { 'money': 1.2, 'respect': 1, 'wanted': 1.15 }
    },
    {
        'name': 'Strongarm Civilians',
        'desc': 'Assign this gang member to extort civilians in your territory<br><br>Earns money - Slightly increases respect - Increases wanted - Scales heavily with territory',
        'isHacking': false,
        'isCombat': true,
        'baseRespect': 0.00004,
        'baseWanted': 0.02,
        'baseMoney': 7.5,
        'hackWeight': 10,
        'strWeight': 25,
        'defWeight': 25,
        'dexWeight': 20,
        'agiWeight': 10,
        'chaWeight': 10,
        'difficulty': 5,
        'territory': { 'money': 1.6, 'respect': 1.1, 'wanted': 1.5 }
    },
    {
        'name': 'Territory Warfare',
        'desc': 'Assign this gang member to engage in territorial warfare with other gangs. Members assigned to this task will help increase your gang\'s territory and will defend your territory from being taken.',
        'isHacking': true,
        'isCombat': true,
        'baseRespect': 0,
        'baseWanted': 0,
        'baseMoney': 0,
        'hackWeight': 15,
        'strWeight': 20,
        'defWeight': 20,
        'dexWeight': 20,
        'agiWeight': 20,
        'chaWeight': 5,
        'difficulty': 5,
        'territory': { 'money': 1, 'respect': 1, 'wanted': 1 }
    },

    {
        'name': 'Run a Con',
        'desc': 'Assign this gang member to run cons<br><br>Earns money - Increases respect - Increases wanted level',
        'isHacking': false,
        'isCombat': true,
        'baseRespect': 0.00012,
        'baseWanted': 0.05,
        'baseMoney': 45,
        'hackWeight': 0,
        'strWeight': 5,
        'defWeight': 5,
        'dexWeight': 25,
        'agiWeight': 25,
        'chaWeight': 40,
        'difficulty': 14,
        'territory': { 'money': 1, 'respect': 1, 'wanted': 1 }
    },
    {
        'name': 'Armed Robbery',
        'desc': 'Assign this gang member to commit armed robbery on stores, banks and armored cars<br><br>Earns money - Increases respect - Increases wanted level',
        'isHacking': false,
        'isCombat': true,
        'baseRespect': 0.00014,
        'baseWanted': 0.1,
        'baseMoney': 114,
        'hackWeight': 20,

        'strWeight': 15,
        'defWeight': 15,
        'dexWeight': 20,
        'agiWeight': 10,

        'chaWeight': 20,

        'difficulty': 20,
        'territory': { 'money': 1, 'respect': 1, 'wanted': 1 }
    },
    {
        'name': 'Threaten & Blackmail',
        'desc': 'Assign this gang member to threaten and black mail high-profile targets<br><br>Earns money - Slightly increases respect - Slightly increases wanted level',
        'isHacking': false,
        'isCombat': true,
        'baseRespect': 0.0002,
        'baseWanted': 0.125,
        'baseMoney': 72,
        'hackWeight': 25,
        'strWeight': 25, 'defWeight': 0, 'dexWeight': 25, 'agiWeight': 0,
        'chaWeight': 25,
        'difficulty': 28,
        'territory': { 'money': 1, 'respect': 1, 'wanted': 1 }
    },
    {
        'name': 'Traffick Illegal Arms',
        'desc': 'Assign this gang member to traffick illegal arms<br><br>Earns money - Increases respect - Increases wanted level - Scales heavily with territory',
        'isHacking': false,
        'isCombat': true,
        'baseRespect': 0.0002,
        'baseWanted': 0.24,
        'baseMoney': 174,
        'hackWeight': 15,
        'strWeight': 20,
        'defWeight': 20,
        'dexWeight': 20,
        'agiWeight': 0,
        'chaWeight': 25,
        'difficulty': 32,
        'territory': { 'money': 1.4, 'respect': 1.3, 'wanted': 1.25 }
    },
    {
        'name': 'Human Trafficking',
        'desc': 'Assign this gang member to engage in human trafficking operations<br><br>Earns money - Increases respect - Increases wanted level - Scales heavily with territory',
        'isHacking': false,
        'isCombat': true,
        'baseRespect': 0.004,
        'baseWanted': 1.25,
        'baseMoney': 360,
        'hackWeight': 30,
        'strWeight': 5,
        'defWeight': 5,
        'dexWeight': 30,
        'agiWeight': 0,
        'chaWeight': 30,
        'difficulty': 36,
        'territory': { 'money': 1.5, 'respect': 1.5, 'wanted': 1.6 }
    },
    {
        'name': 'Terrorism',
        'desc': 'Assign this gang member to commit acts of terrorism<br><br>Greatly increases respect - Greatly increases wanted level - Scales heavily with territory',
        'isHacking': false,
        'isCombat': true,
        'baseRespect': 0.01,
        'baseWanted': 6,
        'baseMoney': 0,
        'hackWeight': 20,
        'strWeight': 20,
        'defWeight': 20,
        'dexWeight': 20,
        'agiWeight': 0,
        'chaWeight': 20,
        'difficulty': 36,
        'territory': { 'money': 1, 'respect': 2, 'wanted': 2 }
    },

    {
        'name': 'Train Hacking',
        'desc': 'Assign this gang member to train their hacking skills',
        'isHacking': true,
        'isCombat': true,
        'baseRespect': 0,
        'baseWanted': 0,
        'baseMoney': 0,
        'hackWeight': 100,
        'strWeight': 0,
        'defWeight': 0,
        'dexWeight': 0,
        'agiWeight': 0,
        'chaWeight': 0,
        'difficulty': 45,
        'territory': { 'money': 1, 'respect': 1, 'wanted': 1 }
    },
    {
        'name': 'Train Combat',
        'desc': 'Assign this gang member to increase their combat stats (str, def, dex, agi)',
        'isHacking': true,
        'isCombat': true,
        'baseRespect': 0,
        'baseWanted': 0,
        'baseMoney': 0,
        'hackWeight': 0,
        'strWeight': 25,
        'defWeight': 25,
        'dexWeight': 25,
        'agiWeight': 25,
        'chaWeight': 0,
        'difficulty': 100,
        'territory': { 'money': 1, 'respect': 1, 'wanted': 1 }
    },
    {
        'name': 'Train Charisma',
        'desc': 'Assign this gang member to train their charisma',
        'isHacking': true,
        'isCombat': true,
        'baseRespect': 0,
        'baseWanted': 0,
        'baseMoney': 0,
        'hackWeight': 0,
        'strWeight': 0,
        'defWeight': 0,
        'dexWeight': 0,
        'agiWeight': 0,
        'chaWeight': 100,
        'difficulty': 8,
        'territory': { 'money': 1, 'respect': 1, 'wanted': 1 }
    }
];

export const MEMBER_NAME: string = 'Stabby';
