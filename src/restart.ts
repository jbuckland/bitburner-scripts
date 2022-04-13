import { NS } from 'NetscriptDefinitions';

export async function main(ns: NS) {

    let scriptName = (ns.args.unshift()).toString();

    if (!scriptName) {
        ns.tprint('please specify a script name!');

    } else {

        let currentHost = ns.getHostname();

        let processes = ns.ps(currentHost);

        let targetProcesses = processes.filter(p => p.filename === scriptName);

        if (targetProcesses.length === 1) {

            let proc = targetProcesses[0];

            ns.scriptKill(scriptName, currentHost);


            ns.run(scriptName, proc.threads, ...ns.args);


        } else if (targetProcesses.length === 0) {

        } else if (targetProcesses.length > 1) {
            ns.tprint(`ERROR! found ${targetProcesses.length} running instances of '${scriptName}'`);
            ns.tprint(`ERROR! can only restart a single instance at a time`);
        }


    }

}
