import {NS, Player} from '/NetscriptDefinitions';


const CONSTANTS = {
    FactionWorkHacking: 'Faction Hacking Work',
    FactionWorkField: 'Faction Field Work',
    FactionWorkSecurity: 'Faction Security Work',

    FactionWorkDescHacking: 'carrying out hacking contracts',
    FactionWorkDescField: 'carrying out field missions',
    FactionWorkDescSecurity: 'performing security detail',

    MaxSkillLevel: 975
};

interface Faction {

}

export function getIntelligenceBonus(player: Player, weight: number): number {
    return calculateIntelligenceBonus(player.intelligence, weight);
}

export function calculateIntelligenceBonus(intelligence: number, weight = 1): number {
    return 1 + (weight * Math.pow(intelligence, 0.8)) / 600;
}



export function getHackingWorkRepGain(p: Player, factionFavor: number, bitNodeMultFactionWorkRepGain: number, sharePower: number): number {
    return (
        (
            (p.hacking + p.intelligence / 3) / CONSTANTS.MaxSkillLevel
        ) * p.faction_rep_mult * getIntelligenceBonus(p, 1) * mult(factionFavor, bitNodeMultFactionWorkRepGain) * sharePower
    );
}

export function getFactionFieldWorkRepGain(p: Player, factionFavor: number, bitNodeMultFactionWorkRepGain: number, sharePower: number): number {
    const t =
        (
            0.9 * (
                p.strength + p.defense + p.dexterity + p.agility + p.charisma + ((p.hacking + p.intelligence) * sharePower)
            )
        ) / CONSTANTS.MaxSkillLevel / 5.5;
    return t * p.faction_rep_mult * mult(factionFavor, bitNodeMultFactionWorkRepGain) * getIntelligenceBonus(p, 1);
}

export function getFactionSecurityWorkRepGain(p: Player, factionFavor: number, bitNodeMultFactionWorkRepGain: number, sharePower: number): number {
    const t =
        (
            0.9 * (
                p.strength + p.defense + p.dexterity + p.agility + ((p.hacking + p.intelligence) * sharePower)
            )
        ) / CONSTANTS.MaxSkillLevel / 4.5;
    return t * p.faction_rep_mult * mult(factionFavor, bitNodeMultFactionWorkRepGain) * getIntelligenceBonus(p, 1);
}

function mult(factionFavor: number, bitNodeMultFactionWorkRepGain: number): number {
    let favorMult = 1 + factionFavor / 100;
    if (isNaN(favorMult)) {
        favorMult = 1;
    }
    return favorMult * bitNodeMultFactionWorkRepGain;
}

export function CalculateShareMult(sharePower: number): number {
    return CSM(sharePower);
}

export function CSM(power: number): number {
    const x = 1 + Math.log(power) / 25;
    if (isNaN(x) || !isFinite(x))
        return 1;
    return x;
}



export function getFactionWorkRepGain(ns: NS, faction: string): number {
    //const faction = Factions[player.currentWorkFactionName];
    let workRepGainRate = 0;
    let factionFavor = ns.singularity.getFactionFavor(faction);
    let bitNodeMultFactionWorkRepGain = ns.getBitNodeMultipliers().FactionWorkRepGain;
    let player = ns.getPlayer();
    let sharePower = ns.getSharePower();

    ns.print(`getFactionWorkRepGain`, {factionFavor, bitNodeMultFactionWorkRepGain, sharePower});
    ns.print(player.currentWorkFactionDescription);
    //Constantly update the rep gain rate
    switch (player.currentWorkFactionDescription) {
        case CONSTANTS.FactionWorkDescHacking:
            workRepGainRate = getHackingWorkRepGain(player, factionFavor, bitNodeMultFactionWorkRepGain, sharePower);
            break;
        case CONSTANTS.FactionWorkDescField:
            workRepGainRate = getFactionFieldWorkRepGain(player, factionFavor, bitNodeMultFactionWorkRepGain, sharePower);
            break;
        case CONSTANTS.FactionWorkDescSecurity:
            workRepGainRate = getFactionSecurityWorkRepGain(player, factionFavor, bitNodeMultFactionWorkRepGain, sharePower);
            break;
        default:
            break;
    }
    workRepGainRate *= bitNodeMultFactionWorkRepGain; //why do we multiply this AGAIN here??

    return workRepGainRate * 5;

}

/*
export function getCompanyWorkRepGain(player: Player): number {
    const company = Companies[this.companyName];
    const companyPositionName = this.jobs[this.companyName];
    const companyPosition = CompanyPositions[companyPositionName];
    if (company == null || companyPosition == null) {
        console.error(
            [
                `Could not find Company object for ${this.companyName}`,
                `or CompanyPosition object for ${companyPositionName}.`,
                `Work rep gain will be 0`
            ].join(' ')
        );
        return 0;
    }

    let jobPerformance = companyPosition.calculateJobPerformance(
        this.hacking,
        this.strength,
        this.defense,
        this.dexterity,
        this.agility,
        this.charisma
    );

    //Intelligence provides a flat bonus to job performance
    jobPerformance += this.intelligence / CONSTANTS.MaxSkillLevel;

    //Update reputation gain rate to account for company favor
    let favorMult = 1 + company.favor / 100;
    if (isNaN(favorMult)) {
        favorMult = 1;
    }
    return jobPerformance * this.company_rep_mult * favorMult;
}

*/
