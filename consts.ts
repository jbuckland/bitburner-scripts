import { ICityFaction, ICompanyFaction, IHackFaction, IServerFaction } from './types';

export const HOME_RESERVED_RAM = 64;
export const HOME = 'home';

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
        brute: { name: 'BruteSSH.exe', cost: 500000, createSkill: 50 },
        ftp: { name: 'FTPCrack.exe', cost: 1500000, createSkill: 100 },
        smtp: { name: 'relaySMTP.exe', cost: 5000000, createSkill: 250 },
        http: { name: 'HTTPWorm.exe', cost: 30000000, createSkill: 500 },
        scan1: { name: 'DeepscanV1.exe', cost: 500000, createSkill: 75 },
        scan2: { name: 'DeepscanV2.exe', cost: 25000000, createSkill: 400 },
        sql: { name: 'SQLInject.exe', cost: 250000000, createSkill: 750 },
        alink: { name: 'AutoLink.exe', cost: 1000000, createSkill: 25 },
        prof: { name: 'ServerProfiler.exe', cost: 500000, createSkill: 50 }

    }
};

export const HACK_FACTIONS = {
    csec: { name: 'CyberSec', hostname: 'CSEC' } as IHackFaction,
    nite: { name: 'NiteSec', hostname: 'avmnite-02h' } as IHackFaction,
    blackHand: { name: 'The Black Hand', hostname: 'I.I.I.I' } as IHackFaction,
    bitrunners: { name: 'BitRunners', hostname: 'run4theh111z' } as IHackFaction,
    daedalus: { name: 'Daedalus', hostname: '' } as IHackFaction
};

export const WORLD_DAEMON: IServerFaction = { name: '', hostname: 'w0r1d_d43m0n' };

export const CITY_FACTIONS = {
    aevum: { name: 'Aevum', homeCity: 'Aevum' } as ICityFaction,
    sec12: { name: 'Sector-12', homeCity: 'Sector-12' } as ICityFaction,
    tian: { name: 'Tian Di Hui', homeCity: 'Chongqing' } as ICityFaction,
    tokyo: { name: 'New Tokyo', homeCity: 'New Tokyo' } as ICityFaction,
    vol: { name: 'Volhaven', homeCity: 'Volhaven' } as ICityFaction,
    ishi: { name: 'Ishima', homeCity: 'Ishima' } as ICityFaction

};

export const COMPANY_FACTIONS = {
    mega: { name: 'MegaCorp', hostname: 'megacorp', city: CITY_FACTIONS.sec12.homeCity, repNeededForInvite: 200000 } as ICompanyFaction,
    nwo: { name: 'NWO', hostname: 'nwo', city: CITY_FACTIONS.vol.homeCity, repNeededForInvite: 200000 } as ICompanyFaction,
    fultech: {
        name: 'Fulcrum Secret Technologies', hostname: 'fulcrumassets', city: CITY_FACTIONS.aevum.homeCity, repNeededForInvite: 250000
    } as ICompanyFaction,
    blade: { name: 'Blade Industries', hostname: 'blade', city: CITY_FACTIONS.sec12.homeCity, repNeededForInvite: 200000 } as ICompanyFaction,
    clark: { name: 'Clarke Incorporated', hostname: 'clarkinc', city: CITY_FACTIONS.aevum.homeCity, repNeededForInvite: 200000 } as ICompanyFaction,

    kuai: { name: 'KuaiGong International', hostname: '', city: CITY_FACTIONS.aevum.homeCity, repNeededForInvite: 200000 } as ICompanyFaction,
    fourSig: { name: 'Four Sigma', hostname: '', city: CITY_FACTIONS.sec12.homeCity, repNeededForInvite: 200000 } as ICompanyFaction,
    ecor: { name: 'ECorp', hostname: '', city: CITY_FACTIONS.aevum.homeCity, repNeededForInvite: 200000 } as ICompanyFaction,
    otech: { name: 'OmniTek Incorporated', hostname: '', city: CITY_FACTIONS.vol.homeCity, repNeededForInvite: 200000 } as ICompanyFaction,
    bach: { name: 'Bachman & Associates', hostname: '', city: CITY_FACTIONS.aevum.homeCity, repNeededForInvite: 200000 } as ICompanyFaction
};

export enum JOB_FIELDS {
    Software = 'Software'
}

export enum WORK_TYPE {
    Faction = 'Working for Faction',
    Company = 'Working for Company'

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

export enum SCRIPTS {
    backdoor = 'backdoor.js',
    weaken = 'weaken.js',
    grow = 'grow.js',
    batchWeaken = 'batch-weaken.js',
    batchGrow = 'batch-grow.js',
    batchHack = 'batch-hack.js',
    hack = 'hack.js',
    share = 'share.js',
    controller = 'basic-controller.js',
    autoNuke = 'autoNuke.js',
    addScripts = 'addScripts.js',

}

export const OVERVIEW_EXTRA_0_ID = 'overview-extra-hook-0';
export const OVERVIEW_EXTRA_1_ID = 'overview-extra-hook-1';
export const OVERVIEW_EXTRA_2_ID = 'overview-extra-hook-2';

export const THE_RED_PILL = 'The Red Pill';

export const NON_HACKING_AUGMENTS = [
    'Augmented Targeting I',
    'Augmented Targeting II',
    'Combat Rib I',
    'Combat Rib II',
    'INFRARET Enhancement',
    'Nanofiber Weave',
    'NutriGen Implant',
    'Speech Processor Implant',
    'Wired Reflexes',
    'DermaForce Particle Barrier'
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

export const COMPANY_QUIT_PENALTY = {
    default: 0.5,
    withBackdoor: 0.25
};