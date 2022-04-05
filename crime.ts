import {NS} from './NetscriptDefinitions';
import {startBestController} from "./utils-controller";
import {crimeControllers} from "./crime_consts";


export async function main(ns: NS) {
    startBestController(ns, crimeControllers);
}
