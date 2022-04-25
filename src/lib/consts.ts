import {ICityFaction, ICompanyFaction, IControllerConfig, IDarkwebTool, IFaction, IHackFaction, IServerFaction} from 'types';

export const WORLD_DAEMON: IServerFaction = {name: 'w0r1d_d43m0n', hostname: 'w0r1d_d43m0n'};
export const DEFAULT_RAM_BUFFER = 90;
export const DEFAULT_TARGET_HACK_PERCENT = .1;
export const HOME = 'home';

export const CYCLES_PER_SECOND = 5;

export const MIN_MONEY = 400;

export const HOSTS = [
    'home',
    'n00dles',
    'foodnstuff',
    'sigma-cosmetics',
    'joesguns',
    'hong-fang-tea',
    'harakiri-sushi',
    'iron-gym',
    'zer0',
    'nectar-net',
    'max-hardware',
    'CSEC',
    'neo-net',
    'omega-net',
    'phantasy',
    'silver-helix',
    //'comptek',
    'johnson-ortho',
    'netlink',
    'crush-fitness',
    'the-hub',
    'avmnite-02h',
    'rothman-uni',
    'zb-institute',
    'syscore',
    'summit-uni',
    'catalyst',
    'I.I.I.I',
    'rho-construction',
    'aevum-police',
    'alpha-ent',
    'millenium-fitness',
    'lexo-corp',
    'aerocorp',
    'global-pharm',
    'snap-fitness',
    'galactic-cyber',
    'omnia',
    'unitalife',
    'deltaone',
    'icarus',
    'univ-energy',
    'solaris',
    'zeus-med',
    'defcomm',
    'taiyang-digital',
    'zb-def',
    'nova-med',
    'infocomm',
    'titan-labs',
    'applied-energetics',
    'microdyne',
    'run4theh111z',
    'stormtech',
    'helios',
    'vitalife',
    'fulcrumtech',
    'omnitek',
    '4sigma',
    'kuai-gong',
    '.',
    'powerhouse-fitness',
    'blade',
    'b-and-a',
    'nwo',
    'clarkinc',
    'megacorp',
    'The-Cave',
    'ecorp',
    'fulcrumassets',
    'w0r1d_d43m0n'

];

export const FACTION_WORK_HACKING = 'hacking';
export const FACTION_WORK_FIELD = 'field';
export const FACTION_WORK_SECURITY = 'security';

export const NULL_PORT_DATA = 'NULL PORT DATA';

export enum PORTS {
    settings = 1,
    debug = 2,
    scriptCom = 3,
    targetStats = 4,
    batchStatus = 6
}

export enum EventType {
    hackComplete = 'hackComplete',
    weakenComplete = 'weakenComplete',
    growComplete = 'growComplete',

    batchHackComplete = 'batchHackComplete',
    batchWeakenComplete = 'batchWeakenComplete',
    batchGrowComplete = 'batchGrowComplete',

    batchHackStarted = 'batchHackStarted',
    batchWeakenStarted = 'batchWeakenStarted',
    batchGrowStarted = 'batchGrowStarted',
}

export const TOAST_DURATION: number = 5000;

export enum TOAST_VARIANT {
    success = 'success',
    info = 'info',
    warning = 'warning',
    error = 'error'
}

export const DARK_DATA = {
    torCost: 200000,
    tools: {
        brute: {name: 'BruteSSH.exe', cost: 500000, createSkill: 50} as IDarkwebTool,
        ftp: {name: 'FTPCrack.exe', cost: 1500000, createSkill: 100} as IDarkwebTool,
        smtp: {name: 'relaySMTP.exe', cost: 5000000, createSkill: 250} as IDarkwebTool,
        http: {name: 'HTTPWorm.exe', cost: 30000000, createSkill: 500} as IDarkwebTool,
        scan1: {name: 'DeepscanV1.exe', cost: 500000, createSkill: 75} as IDarkwebTool,
        scan2: {name: 'DeepscanV2.exe', cost: 25000000, createSkill: 400} as IDarkwebTool,
        sql: {name: 'SQLInject.exe', cost: 250000000, createSkill: 750} as IDarkwebTool,
        alink: {name: 'AutoLink.exe', cost: 1000000, createSkill: 25} as IDarkwebTool,
        prof: {name: 'ServerProfiler.exe', cost: 500000, createSkill: 50} as IDarkwebTool

    }
};

export enum FactionType {
    gang = 'Gang',
    city = 'City',
    hack = 'Hack',
    other = 'Other'
}

export const GANG_FACTIONS = {
    snakes: {name: 'Slum Snakes'} as IFaction,
    tetrads: {name: 'Tetrads'} as IFaction,
    silhouette: {name: 'Silhouette'} as IFaction,
    speakers: {name: 'Speakers for the Dead'} as IFaction,
    army: {name: 'The Dark Army'} as IFaction,
    syndicate: {name: 'The Syndicate'} as IFaction

};

export const HACK_FACTIONS = {
    csec: {name: 'CyberSec', hostname: 'CSEC'} as IHackFaction,
    nite: {name: 'NiteSec', hostname: 'avmnite-02h'} as IHackFaction,
    blackHand: {name: 'The Black Hand', hostname: 'I.I.I.I'} as IHackFaction,
    bitrunners: {name: 'BitRunners', hostname: 'run4theh111z'} as IHackFaction,
    daedalus: {name: 'Daedalus', hostname: ''} as IHackFaction
};

export const OTHER_FACTIONS = {
    netburner: {name: 'Netburners'} as IFaction,
    cotmg: {name: 'Church of the Machine God'}
};
export const CITY_FACTIONS = {
    aevum: {name: 'Aevum', homeCity: 'Aevum'} as ICityFaction,
    sec12: {name: 'Sector-12', homeCity: 'Sector-12'} as ICityFaction,
    tian: {name: 'Tian Di Hui', homeCity: 'Chongqing'} as ICityFaction,
    tokyo: {name: 'New Tokyo', homeCity: 'New Tokyo'} as ICityFaction,
    vol: {name: 'Volhaven', homeCity: 'Volhaven'} as ICityFaction,
    ishi: {name: 'Ishima', homeCity: 'Ishima'} as ICityFaction

};

export const COMPANY_FACTIONS = {
    mega: {
        name: 'MegaCorp',
        hostname: 'megacorp',
        city: CITY_FACTIONS.sec12.homeCity,
        repNeededForInvite: 200000
    } as ICompanyFaction,
    nwo: {
        name: 'NWO',
        hostname: 'nwo',
        city: CITY_FACTIONS.vol.homeCity,
        repNeededForInvite: 200000
    } as ICompanyFaction,
    //fultech: { name: 'Fulcrum Technologies', hostname: 'fulcrumassets', city: CITY_FACTIONS.aevum.homeCity, repNeededForInvite: 250000 } as ICompanyFaction,
    blade: {
        name: 'Blade Industries',
        hostname: 'blade',
        city: CITY_FACTIONS.sec12.homeCity,
        repNeededForInvite: 200000
    } as ICompanyFaction,
    clark: {
        name: 'Clarke Incorporated',
        hostname: 'clarkinc',
        city: CITY_FACTIONS.aevum.homeCity,
        repNeededForInvite: 200000
    } as ICompanyFaction,

    kuai: {
        name: 'KuaiGong International',
        hostname: '',
        city: CITY_FACTIONS.aevum.homeCity,
        repNeededForInvite: 200000
    } as ICompanyFaction,
    fourSig: {
        name: 'Four Sigma',
        hostname: '',
        city: CITY_FACTIONS.sec12.homeCity,
        repNeededForInvite: 200000
    } as ICompanyFaction,
    ecor: {
        name: 'ECorp',
        hostname: '',
        city: CITY_FACTIONS.aevum.homeCity,
        repNeededForInvite: 200000
    } as ICompanyFaction,
    otech: {
        name: 'OmniTek Incorporated',
        hostname: 'omnitek',
        city: CITY_FACTIONS.vol.homeCity,
        repNeededForInvite: 200000

    } as ICompanyFaction
    //bach: { name: 'Bachman & Associates', hostname: '', city: CITY_FACTIONS.aevum.homeCity, repNeededForInvite: 200000 } as ICompanyFaction
};

export enum JOB_FIELDS {
    Software = 'Software'
}

export enum WORK_TYPE {
    Faction = 'Working for Faction',
    Company = 'Working for Company'

}

export enum Materials {
    food = 'Food',
    water = 'Water',

}

export enum LocationName {
    // Cities
    Aevum = 'Aevum',
    Chongqing = 'Chongqing',
    Ishima = 'Ishima',
    NewTokyo = 'New Tokyo',
    Sector12 = 'Sector-12',
    Volhaven = 'Volhaven',

    // Aevum Locations
    AevumAeroCorp = 'AeroCorp',
    AevumBachmanAndAssociates = 'Bachman & Associates',
    AevumClarkeIncorporated = 'Clarke Incorporated',
    AevumCrushFitnessGym = 'Crush Fitness Gym',
    AevumECorp = 'ECorp',
    AevumFulcrumTechnologies = 'Fulcrum Technologies',
    AevumGalacticCybersystems = 'Galactic Cybersystems',
    AevumNetLinkTechnologies = 'NetLink Technologies',
    AevumPolice = 'Aevum Police Headquarters',
    AevumRhoConstruction = 'Rho Construction',
    AevumSnapFitnessGym = 'Snap Fitness Gym',
    AevumSummitUniversity = 'Summit University',
    AevumWatchdogSecurity = 'Watchdog Security',
    AevumCasino = 'Iker Molina Casino',

    // Chongqing locations
    ChongqingKuaiGongInternational = 'KuaiGong International',
    ChongqingSolarisSpaceSystems = 'Solaris Space Systems',
    ChongqingChurchOfTheMachineGod = 'Church of the Machine God',

    // Sector 12
    Sector12AlphaEnterprises = 'Alpha Enterprises',
    Sector12BladeIndustries = 'Blade Industries',
    Sector12CIA = 'Central Intelligence Agency',
    Sector12CarmichaelSecurity = 'Carmichael Security',
    Sector12CityHall = 'Sector-12 City Hall',
    Sector12DeltaOne = 'DeltaOne',
    Sector12FoodNStuff = 'FoodNStuff',
    Sector12FourSigma = 'Four Sigma',
    Sector12IcarusMicrosystems = 'Icarus Microsystems',
    Sector12IronGym = 'Iron Gym',
    Sector12JoesGuns = 'Joe\'s Guns',
    Sector12MegaCorp = 'MegaCorp',
    Sector12NSA = 'National Security Agency',
    Sector12PowerhouseGym = 'Powerhouse Gym',
    Sector12RothmanUniversity = 'Rothman University',
    Sector12UniversalEnergy = 'Universal Energy',

    // New Tokyo
    NewTokyoDefComm = 'DefComm',
    NewTokyoGlobalPharmaceuticals = 'Global Pharmaceuticals',
    NewTokyoNoodleBar = 'Noodle Bar',
    NewTokyoVitaLife = 'VitaLife',
    NewTokyoArcade = 'Arcade',

    // Ishima
    IshimaNovaMedical = 'Nova Medical',
    IshimaOmegaSoftware = 'Omega Software',
    IshimaStormTechnologies = 'Storm Technologies',
    IshimaGlitch = '0x6C1',

    // Volhaven
    VolhavenCompuTek = 'CompuTek',
    VolhavenHeliosLabs = 'Helios Labs',
    VolhavenLexoCorp = 'LexoCorp',
    VolhavenMilleniumFitnessGym = 'Millenium Fitness Gym',
    VolhavenNWO = 'NWO',
    VolhavenOmniTekIncorporated = 'OmniTek Incorporated',
    VolhavenOmniaCybersystems = 'Omnia Cybersystems',
    VolhavenSysCoreSecurities = 'SysCore Securities',
    VolhavenZBInstituteOfTechnology = 'ZB Institute of Technology',

    // Generic locations
    Hospital = 'Hospital',
    Slums = 'The Slums',
    TravelAgency = 'Travel Agency',
    WorldStockExchange = 'World Stock Exchange',

    // Default name for Location objects
    Void = 'The Void',
}

export const TRAVEL_COST = 200000;

//export type AllScripts = Scripts.terminal | Scripts.runner

export enum SCRIPTS {
    //////////////////////////
    //root folder    ,
    startController = 'start-controller.js',
    megaController = 'mega-controller.js',
    addScripts = 'addScripts.js',
    basicCrime = 'basic-crime.js',
    debugWatcher = 'debugWatcher.js',
    donate = 'donate.js', //82gb
    getRunnerStats = 'runnerStats.js',
    getScriptStats = 'scriptStats.js',
    reset = 'reset.js', //162gb
    targetStats = 'targetStats.js',
    watcher = 'watcher.js',

    //////////////////////////
    //terminal folder
    arrangeWindows = '/terminal/arrange-windows.js',
    autoNuke = '/terminal/autoNuke.js',
    backdoor = '/terminal/backdoor.js',

    //////////////////////////
    //runner folder
    batchGrow = '/runner/batch-grow.js',
    batchHack = '/runner/batch-hack.js',
    batchWeaken = '/runner/batch-weaken.js',
    chargeFragment = '/runner/charge-fragment.js',
    expGain = '/runner/expGain.js',
    grow = '/runner/grow.js',
    hack = '/runner/hack.js',
    myShare = '/runner/share.js',
    weaken = '/runner/weaken.js',

}

export enum SCRIPTS_OLD_CONTROLLERS {
    batchController = 'batch-controller.js',
    controller = 'basic-controller.js', //20gm
    crimeController0 = 'crime-controller0.js',
    crimeController1 = '/old-controllers/crime-controller1.js',
    hackController = 'hack-controller.js',
    hacknet = 'hacknet.js',
    homeController = 'home-controller.js',
    playerController = 'player-controller.js', //1090gb
    playerController0 = 'player-controller0.js',//9gb
    playerController1 = 'player-controller1.js',//79gb
    playerController2 = 'player-controller2.js', //223gb
}

export const playerControllers: IControllerConfig[] = [
    {scriptName: SCRIPTS_OLD_CONTROLLERS.playerController0, sequenceNumber: 0, ramBuffer: 16, ramReq: 0},
    {scriptName: SCRIPTS_OLD_CONTROLLERS.playerController1, sequenceNumber: 1, ramBuffer: 32, ramReq: 0},
    {scriptName: SCRIPTS_OLD_CONTROLLERS.playerController2, sequenceNumber: 2, ramBuffer: 32, ramReq: 0},
    {scriptName: SCRIPTS_OLD_CONTROLLERS.playerController, sequenceNumber: 3, ramBuffer: 190, ramReq: 0}
];

export const OVERVIEW_EXTRA_0_ID = 'overview-extra-hook-0';
export const OVERVIEW_EXTRA_1_ID = 'overview-extra-hook-1';
export const OVERVIEW_EXTRA_2_ID = 'overview-extra-hook-2';

export const THE_RED_PILL = 'The Red Pill';

export const NON_HACKING_AUGMENTS = [
    'Augmented Targeting I', //dex skill
    'Augmented Targeting II', //dex skill
    'Augmented Targeting III', //dex skill
    'Bionic Arms', //+30% str and dex
    'Bionic Legs', //+60 agi
    'Bionic Spine', //+15 combat skills
    'BrachiBlades', //str, dex, crime money and success
    'CashRoot Starter Kit', //start with $1m and brutessh.exe
    'Combat Rib I',
    'Combat Rib II',
    'Combat Rib III',
    'CordiARC Fusion Reactor', //combat skill, exp
    'DermaForce Particle Barrier',
    'Enhanced Social Interaction Implant', //cha skill, exp
    'Graphene Bionic Arms Upgrade', //+85% str dex
    'Graphene Bionic Legs Upgrade', //agi
    'Graphene Bionic Spine Upgrade', // combat skill
    'Graphene Bone Lacings', //+str +dex
    'Graphene BrachiBlades Upgrade', //str def crime money and success
    'HemoRecirculator',// +8% combat
    'LuminCloaking-V1 Skin Implant', //agi, crime money
    'LuminCloaking-V2 Skin Implant', //agi def, crime money
    'Hydroflame Left Arm', //str skill
    'INFRARET Enhancement',
    'Nanofiber Weave',
    'NEMEAN Subdermal Weave', //def skill
    'Neotra', //+55% str def
    'Neuroreceptor Management Implant', //removes non-focus penalty
    'nickofolas Congruity Implant', //Removed entropy virus ???
    'Nuoptimal Nootropic Injector Implant', //+20% company rep
    'NutriGen Implant', //combat
    'PCMatrix', //+7.77 everything
    'Photosynthetic Cells', //str def agi
    'SmartSonar Implant', //dex and crime money
    'Speech Enhancement', //+10% cha, +10% comp rep
    'Speech Processor Implant', //cha skill
    'Synfibril Muscle', //str, def skill
    'Synthetic Heart', //str, agi skill
    'TITN-41 Gene-Modification Injection', //cha
    'Unstable Circadian Modulator', // +100% crime money and success
    'Wired Reflexes' //dex, agi skill,

];

export const HACKING_AUGMENTS = [
    'Artificial Synaptic Potentiation',
    'BitWire',
    'CashRoot Starter Kit',
    'Cranial Signal Processors - Gen I',
    'Cranial Signal Processors - Gen II',
    'Cranial Signal Processors - Gen II',
    'Cranial Signal Processors - Gen III',
    'CRTX42-AA Gene Modification',
    'DataJack',
    'Embedded Netburner Module',
    'Neural-Retention Enhancement',
    'Neuralstimulator',
    'Neurotrainer II',
    'PCMatrix'
];

export const NEURO_FLUX_GOVERNOR = 'NeuroFlux Governor';

export const COMPANY_QUIT_PENALTY = {
    default: 0.5,
    withBackdoor: 0.25
};

export const INDENT_STRING = ' *';

export const MAX_HOME_SERVER_RAM = Math.pow(2, 20);

export enum DebugLevel {
    info = 'INFO',
    warn = 'WARN',
    error = 'ERROR',
    success = 'SUCCESS',
}

export const EXP_GAIN_FLAG = 'exp-gain';

export const MAX_GANG_MEMBERS = 12;

export enum CrimeMode {
    money = 'money',
    territory = 'territory',
    respect = 'respect'
}

export enum HacknetMode {
    money = 'money',
    hacking = 'hacking'
}

export enum HashSpendOptions {
    none = '',
    money = 'Sell for Money',
    reduceMinSec = 'Reduce Minimum Security',
    incMaxMoney = 'Increase Maximum Money',
    bbSkill = 'Exchange for Bladeburner SP',
    bbRank = 'Exchange for Bladeburner Rank',
}

export const FragmentEffect: { [key: number]: string } = {
    0: 'Hacking skill',
    1: 'Hacking skill',
    5: 'Faster hack(), grow(), and weaken()',
    6: 'Hack() power',
    7: 'Grow() power',

    10: 'Strength Skill',

    12: 'Defense Skill',
    14: 'Dexterity Skill',
    16: 'Agility Skill',

    20: 'Hacknet production',
    21: 'Cheaper Hacknet cost',
    25: 'Reputation from factions and companies',
    28: 'Crime Money',
    30: 'All Bladeburner stats',
    100: 'Booster',
    101: 'Booster',
    102: 'Booster',
    103: 'Booster',
    105: 'Booster'

};

export type StanekPatternCollection = { [key: string]: StanekFragmentLocation[] }
export type StanekFragmentLocation = { x: number, y: number, id: number, rotation: number }

export const STANEK_PATTERNS = {
    x5y6: {
        hacking: [
            {'x': 4, 'y': 2, 'id': 25, 'rotation': 3},
            {'x': 0, 'y': 3, 'id': 28, 'rotation': 0},
            {'x': 0, 'y': 2, 'id': 0, 'rotation': 0},
            {'x': 4, 'y': 0, 'id': 1, 'rotation': 1},
            {'x': 1, 'y': 0, 'id': 6, 'rotation': 2},
            {'x': 0, 'y': 0, 'id': 5, 'rotation': 3},
            {'x': 2, 'y': 1, 'id': 101, 'rotation': 1}
        ],
        hack_hacknet_rep: [
            {'x': 4, 'y': 0, 'id': 1, 'rotation': 1},
            {'x': 1, 'y': 0, 'id': 6, 'rotation': 2},
            {'x': 0, 'y': 0, 'id': 5, 'rotation': 3},
            {'x': 1, 'y': 1, 'id': 0, 'rotation': 0},
            {'x': 0, 'y': 3, 'id': 21, 'rotation': 0},
            {'x': 3, 'y': 2, 'id': 25, 'rotation': 0},
            {'x': 2, 'y': 4, 'id': 20, 'rotation': 0}
        ]

    } as StanekPatternCollection
};


export enum CodingContractType {
    unknown = 'UNKNOWN',
    arrayJumpingGame2 = 'Array Jumping Game II',
    algorithmicStockTrader1 = 'Algorithmic Stock Trader I',
    algorithmicStockTrader2 = 'Algorithmic Stock Trader II',
    algorithmicStockTrader3 = 'Algorithmic Stock Trader III',
    findAllValidMathExpressions = 'Find All Valid Math Expressions',
    hammingCodesBinToInt = 'HammingCodes: Encoded Binary to Integer',
    hammingCodesIntToBin = 'HammingCodes: Integer to encoded Binary',
    mergeOverlappingIntervals = 'Merge Overlapping Intervals',
    sanitizeParens = `Sanitize Parentheses in Expression`,
    subarrayWithMaxSum = 'Subarray with Maximum Sum',
    uniquePathsInAGrid1 = 'Unique Paths in a Grid I',
    uniquePathsInAGrid2 = 'Unique Paths in a Grid II',
}
