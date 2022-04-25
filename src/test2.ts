import {NS} from 'NetscriptDefinitions';
import {INetscriptExtra} from 'types';

export async function main(ns: NS & INetscriptExtra) {
    ns.tail();
    //ns.disableLog('ALL');
    ns.clearLog();



    let activeFrags = ns.stanek.activeFragments().map(frag => {
        return {
            x: frag.x,
            y: frag.y,
            id: frag.id,
            rotation: frag.rotation
        };
    });


    let lines = activeFrags.map(frag => '  ' + JSON.stringify(frag)).join(',\n');



    let savedPatternText = `let savedPattern = [\n${lines}\n];`;

    ns.print('');
    ns.print(savedPatternText);
    ns.print('');
    await navigator.clipboard.writeText(savedPatternText);

    let savedPattern = [
        {'x': 0, 'y': 3, 'id': 7, 'rotation': 0},
        {'x': 0, 'y': 1, 'id': 0, 'rotation': 3},
        {'x': 0, 'y': 0, 'id': 1, 'rotation': 2},
        {'x': 2, 'y': 0, 'id': 6, 'rotation': 2},
        {'x': 3, 'y': 1, 'id': 5, 'rotation': 0},
        {'x': 4, 'y': 2, 'id': 25, 'rotation': 3},
        {'x': 2, 'y': 2, 'id': 100, 'rotation': 3}
    ];





}
