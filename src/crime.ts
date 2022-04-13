import { crimeControllers } from 'utils/crime-consts';
import { NS } from 'NetscriptDefinitions';
import { startBestController } from 'utils/utils-controller';

export async function main(ns: NS) {
    startBestController(ns, crimeControllers);
}
