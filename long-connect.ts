import { NS } from './NetscriptDefinitions';
import { findServerNodeRecursive, getPathToServerNode, getServerTree } from './utils';

export async function main(ns: NS) {

    const INDENT_STRING = '--';

    //ns.tail();
    ns.disableLog('scan');
    ns.clearLog();

    let target = ns.args[0] as string;

    let flags = ns.flags([['print', false]]);

    if (!target) {
        ns.tprint(`please specify a target hostname!`);
    } else {

        let serverTree = getServerTree(ns);

        let targetNode = findServerNodeRecursive(serverTree, target);

        if (targetNode) {
            let path = getPathToServerNode(targetNode);

            if (flags.print) {
                let pathString = path.join(' ==> ');
                ns.tprint('Path to target: ', pathString);
            } else {
                let connectString = '';
                path.forEach((p, index) => {
                    if (index > 0) {
                        connectString += `connect ${p}; `;
                    }

                });

                ns.tprint(connectString);

                //need Source 4 to run ns.connect()
                for (let i = 0; i < path.length; i++) {
                    ns.connect(path[i]);
                }
            }

        } else {
            ns.print(`ERROR! could not find ${target}!`);
        }

    }

    /*function getPathToNode(serverNode: IServerNode): string[] {

        //trace the parent's back until we get to 'home'

        let currentNode: IServerNode | undefined = serverNode;
        let path: string[] = [];

        while (currentNode != undefined) {
            //add them to the front, so they wind up in the correct order
            path.unshift(currentNode.hostname);
            currentNode = currentNode.parent;
        }

        return path;
    }*/

    /*function recursivePrintServerTree(serverNode: IServerNode, currentIndent: string) {

        ns.print(`${currentIndent} ${serverNode.hostname}`);
        for (let i = 0; i < serverNode.children.length; i++) {
            recursivePrintServerTree(serverNode.children[i], INDENT_STRING + currentIndent);
        }

    }*/

}
