import { NS } from './NetscriptDefinitions';
import { IServerNode } from './types';
import { getServerTree } from './utils';

export async function main(ns: NS) {

    const INDENT_STRING = '--';

    //ns.tail();
    ns.disableLog('scan');
    ns.clearLog();

    let target = ns.args[0] as string;

    if (!target) {
        ns.tprint(`please specify a target hostname!`);
    } else {

        let serverTree = getServerTree(ns);

        let targetNode = findServerNodeRecursive(serverTree, target);

        if (targetNode) {
            let path = getPathToNode(targetNode);

            ns.print('Path to target:');
            let pathString = path.join(' ==> ');
            ns.print(pathString);

            let connectString = '';
            path.forEach((p, index) => {
                if (index > 0) {
                    connectString += `connect ${p}; `;
                }

            });
            ns.tprint(connectString);

            //can't directly connect until Source 4 :(
            for (let i = 0; i < path.length; i++) {
                ns.connect(path[i]);
            }

        } else {
            ns.print(`ERROR! could not find ${target}!`);
        }

    }

    function getPathToNode(serverNode: IServerNode): string[] {

        //trace the parent's back until we get to 'home'

        let currentNode: IServerNode | undefined = serverNode;
        let path: string[] = [];

        while (currentNode != undefined) {
            //add them to the front, so they wind up in the correct order
            path.unshift(currentNode.hostname);
            currentNode = currentNode.parent;
        }

        return path;
    }

    function findServerNodeRecursive(currentNode: IServerNode, targetHostname: string): IServerNode | undefined {

        let targetNode: IServerNode | undefined = undefined;

        if (currentNode.hostname.toLowerCase() === targetHostname.toLowerCase()) {
            targetNode = currentNode;
        } else {

            for (let i = 0; i < currentNode.children.length; i++) {
                let childNode = currentNode.children[i];
                targetNode = findServerNodeRecursive(childNode, targetHostname);
                if (targetNode) {
                    break;
                }
            }

        }

        return targetNode;

    }

    function recursivePrintServerTree(serverNode: IServerNode, currentIndent: string) {

        ns.print(`${currentIndent} ${serverNode.hostname}`);
        for (let i = 0; i < serverNode.children.length; i++) {
            recursivePrintServerTree(serverNode.children[i], INDENT_STRING + currentIndent);
        }

    }

}