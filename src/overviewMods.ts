import { OVERVIEW_EXTRA_0_ID, OVERVIEW_EXTRA_1_ID, OVERVIEW_EXTRA_2_ID } from 'utils/consts';
import { NS } from 'NetscriptDefinitions';
import { formatBigNumber, myFormatCurrency } from 'utils/utils';

export async function main(ns: NS) {

    let doc = document;
    let overviewElement0 = doc.getElementById(OVERVIEW_EXTRA_0_ID);
    let overviewElement1 = doc.getElementById(OVERVIEW_EXTRA_1_ID);
    let overviewElement2 = doc.getElementById(OVERVIEW_EXTRA_2_ID);

    while (true) {
        displayExtra0();
        await ns.sleep(1000);
    }

    function displayExtra0() {
        let income = ns.getScriptIncome();
        let exp = ns.getScriptExpGain('controller.js', 'home');
        let player = ns.getPlayer();

        let workGainRate = 0;
        if (player.currentWorkFactionName) {
            let factionFavor = ns.getFactionFavor(player.currentWorkFactionName);

            workGainRate = player.workRepGainRate * player.faction_rep_mult * (1 + (factionFavor / 100.0));
        }

        let incomeString = `${myFormatCurrency(income[0])}/s`;
        let repString = `${workGainRate.toPrecision(2)} rep/s`;
        let expString = `${formatBigNumber(exp)} xp/s`;

        let itemDiv = doc.createElement('div');
        itemDiv.style.cssText = 'margin-left: 15px;';

        let incomeEl = itemDiv.cloneNode(true);
        incomeEl.textContent = incomeString;

        let repEl = itemDiv.cloneNode(true);
        repEl.textContent = repString;

        let expEl = itemDiv.cloneNode(true);
        expEl.textContent = expString;

        let flexContainer = doc.createElement('div');
        flexContainer.style.cssText = 'display:flex';

        flexContainer.appendChild(incomeEl);
        flexContainer.append(repEl);
        flexContainer.append(expEl);

        if (overviewElement0) {
            overviewElement0.innerHTML = '';
            overviewElement0.hidden = false;
            overviewElement0.append(flexContainer);
        }
        if (overviewElement1) {
            overviewElement1.innerHTML = '';
            overviewElement1.hidden = true;
            //overviewElement1.append(flexContainer);
        }
        if (overviewElement2) {
            overviewElement2.innerHTML = '';
            overviewElement2.hidden = true;
        }

    }

}

