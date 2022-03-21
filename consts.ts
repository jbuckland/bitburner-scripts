import { ICityFaction, ICompanyFaction, IHackFaction } from './types';

export const HOME_RESERVED_RAM = 32;
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
    'comptek',
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
    'fulcrumassets'

];

export const FACTION_WORK_HACKING = 'hacking';
export const FACTION_WORK_FIELD = 'field';
export const FACTION_WORK_SECURITY = 'security';

export const NULL_PORT_DATA = 'NULL PORT DATA';
export const SETTINGS_PORT = 1;
export const SCRIPT_COMM_PORT = 3;

export const TOAST_DURATION: number = 5000;

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

export const WORLD_DAEMON: IHackFaction = { name: '', hostname: 'w0r1d_d43m0n' };

export const CITY_FACTIONS = {
    aevum: { name: 'Aevum', homeCity: 'Aevum' } as ICityFaction,
    sec12: { name: 'Sector-12', homeCity: 'Sector-12' } as ICityFaction,
    tian: { name: 'Tian Di Hui', homeCity: 'Chongqing' } as ICityFaction,
    tokyo: { name: 'New Tokyo', homeCity: 'New Tokyo' } as ICityFaction,
    vol: { name: 'Volhaven', homeCity: 'Volhaven' } as ICityFaction,
    ishi: { name: 'Ishima', homeCity: 'Ishima' } as ICityFaction

};

export const COMPANY_FACTIONS = {
    mega: { name: 'MegaCorp', hostname: 'megacorp', city: CITY_FACTIONS.sec12.homeCity } as ICompanyFaction,
    nwo: { name: 'NWO', hostname: 'nwo', city: CITY_FACTIONS.vol.homeCity } as ICompanyFaction,
    fultech: { name: 'Fulcrum Secret Technologies', hostname: 'fulcrumassets', city: CITY_FACTIONS.aevum.homeCity } as ICompanyFaction,
    ecor: { name: 'ECorp', hostname: '', city: CITY_FACTIONS.aevum.homeCity },
    kuai: { name: 'KuaiGong International', hostname: '', city: CITY_FACTIONS.aevum.homeCity },
    fourSig: { name: 'Four Sigma', hostname: '', city: CITY_FACTIONS.sec12.homeCity },
    blade: { name: 'Blade Industries', hostname: 'blade', city: CITY_FACTIONS.sec12.homeCity },
    otech: { name: 'OmniTek Incorporated', hostname: '', city: CITY_FACTIONS.vol.homeCity },
    bach: { name: 'Bachman & Associates', hostname: '', city: CITY_FACTIONS.aevum.homeCity },
    clark: { name: 'Clarke Incorporated', hostname: '', city: CITY_FACTIONS.aevum.homeCity }
};

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
export const WEAKEN_SCRIPT = 'weaken.js';
export const GROW_SCRIPT = 'grow.js';
export const HACK_SCRIPT = 'hack.js';
export const SHARE_SCRIPT = 'share.js';
export const CONTROLLER_SCRIPT = 'controller.js';

export const OVERVIEW_EXTRA_0_ID = 'overview-extra-hook-0';
export const OVERVIEW_EXTRA_1_ID = 'overview-extra-hook-1';
export const OVERVIEW_EXTRA_2_ID = 'overview-extra-hook-2';

export const THE_RED_PILL = 'The Red Pill';

