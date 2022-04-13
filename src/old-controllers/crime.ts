import { crimeControllers } from 'lib/crime-consts';
import { NS } from 'NetscriptDefinitions';
import { startBestController } from 'lib/utils-controller';

export async function main(ns: NS) {
    startBestController(ns, crimeControllers);
}
