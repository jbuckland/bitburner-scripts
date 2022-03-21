import { NS } from './NetscriptDefinitions';
import { round, timestamp } from './utils';

export async function main(ns: NS) {
    ns.tail();
    ns.disableLog('sleep');

    const SLEEP_TIME = 4000;

    let stock = ns.args[0] as string;

    if (!stock) {
        ns.print('please provide a stock symbol!');
        ns.exit();
    }

    let forecast = getScaledForecast(stock);

    while (true) {
        let newForecast = getScaledForecast(stock);
        if (forecast < 0 && newForecast > 0) {
            //success, info, warning, error
            let msg = `${stock} has flipped from - to  + forecast. Time to buy!! ${forecast} to ${newForecast}`;
            ns.toast(msg, 'info', null);
            ns.print(msg);
            forecast = newForecast;

        } else if (forecast < 0 && newForecast > 0) {
            let msg = `${stock} has flipped from + to - forecast. Time to sell!! ${forecast} to ${newForecast}`;
            ns.toast(msg, 'info', null);
            ns.print(msg);
            forecast = newForecast;

        } else {
            ns.print(`${timestamp()} ${stock} forecast: ${round(newForecast, 2)}`);

        }

        await ns.sleep(SLEEP_TIME);
    }

    /**
     * Turns a forcast of 0.0 to 1.0 into -100 to 100
     * @param stock
     */
    function getScaledForecast(stock: string): number {
        let rawForecast = ns.stock.getForecast(stock);
        let scaledForecast = Math.round((rawForecast * 200) - 100);
        return scaledForecast;
    }

}