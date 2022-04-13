/*
import { NS } from '/NetscriptDefinitions';

let doc: Document = eval('document');
let factionHosts = ['CSEC', 'avmnite-02h', 'I.I.I.I', 'run4theh111z', 'w0r1d_d43m0n'];

function tprint(html: string) {
    let terminalThingy = doc.querySelector('ul>li:last-child>p')!;
    terminalThingy.insertAdjacentHTML('beforeend', html);
}

export function main(ns: NS) {
    let theme = ns.ui.getTheme();
    let css = `
    <style id="scanCSS">
        .sc{
            white-space:pre;
            color:${theme.secondary};
            line-height:1.2
        }
        .sc .s{
            cursor:pointer;
            text-decoration:underline;
            color:${theme.secondary}
        }
        .sc .f{
            color:${theme.errordark}
        }
        .sc .r{
            color:${theme.primary}
        }
        .sc .r.f{
            color:${theme.infolight}
        }
        .sc .s::before{
            content:"◉";
            color:${theme.errordark}
        }
        .sc .r::before{
            color:${theme.successdark}
        }
    </style>`;

    doc.getElementById('scanCSS') && doc.getElementById('scanCSS')!['remove']();

    doc.head.insertAdjacentHTML('beforeend', css);

    let servers = ['home'];
    let pathIcons = [''];
    let serverRoutes: { [key: string]: string } = { home: 'home' };

    function fName(x: string): string {
        let fString = factionHosts.includes(x) ? ' f' : '';
        let rString = ns.hasRootAccess(x) ? ' r' : '';

        return `<a class="s${fString}${rString}">${x}</a>`;
    }

    function tcommand(x: any): void {
        let tIn: HTMLInputElement = doc.getElementById('terminal-input')! as HTMLInputElement;
        tIn.value = x;
        let thingKey: string = Object.keys(tIn)[1];
        let thing = tIn[thingKey];
        thing.onChange({ target: tIn });
        thing.onKeyDown({ keyCode: 13, preventDefault: () => 0 });

    }

    function addSc(x = servers[0], p1 = ['\n'], o = p1.join('') + fName(x)): string {
        for (let i = 0; i < servers.length; i++) {
            if (pathIcons[i] != x) {
                continue;
            }
            let p2 = p1.slice(); //copy array

            let pathIcon = pathIcons.slice(i + 1).includes(pathIcons[i]) ? '├>' : '└>';
            let p2NewLength = p2.push(pathIcon);

            let updatedPath = p2[p2NewLength - 2].replace('├>', '│ ').replace('└>', '  ');
            p2[p2.length - 1] = updatedPath;
            o += addSc(servers[i], p2);
        }
        return o;
    }

    for (let i = 0, scannedServerName; i < servers.length; i++) {
        for (scannedServerName of ns.scan(servers[i])) {
            if (!servers.includes(scannedServerName)) {
                servers.push(scannedServerName);
                pathIcons.push(servers[i]);
                serverRoutes[scannedServerName] = serverRoutes[servers[i]] + ';connect ' + scannedServerName;
            }
        }
    }

    let output = addSc().trimStart();

    setTimeout(() => {
        tprint(`<div class="sc new">${output}</div>`);
        doc.querySelectorAll('.sc.new .s').forEach(queriedElements => {
            let routeIndex = queriedElements.childNodes[0].nodeValue;
            let theRoute = serverRoutes[routeIndex];

            queriedElements.addEventListener('click', tcommand.bind(null, theRoute));
        });
        doc.querySelector('.sc.new').classList['remove']('new');
    }, 50);
}
*/
