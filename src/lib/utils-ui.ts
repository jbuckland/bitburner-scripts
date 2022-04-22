import {NS} from '/NetscriptDefinitions';

export function resizeScriptWindow(ns: NS, scriptName: string, args: any[], width: number, height: number) {

    let tailWindowContentsNode = getTailWindowContentsNode(ns, scriptName, args);
    if (tailWindowContentsNode) {
        tailWindowContentsNode.style.width = `${width}px`;
        tailWindowContentsNode.style.height = `${height}px`;
    }

}

export function getTailWindowContentsNode(ns: NS, scriptName: string, args: any[] = []): HTMLElement | undefined {
    let contentsNode: HTMLElement | undefined;

    let tailWindowTitleEl: Element | null = document.querySelector(getTailWindowsSelector(ns, scriptName, args));

    if (tailWindowTitleEl) {
        let tailWindowTitleNode = tailWindowTitleEl.parentNode!;
        contentsNode = tailWindowTitleNode.parentNode!.parentNode!.firstChild!.nextSibling!.firstChild! as HTMLElement;
    }

    return contentsNode;
}

export function getTailWindowsSelector(ns: NS, scriptName: string, args: any[]): string {
    let windowTitle = `${scriptName} ${args.join(' ')}`;
    return `h6[title="${windowTitle}"]`;
}

export interface ISelectOption {
    text: string;
    value: string;
}

export function addOptionsToSelect(selectElement: HTMLSelectElement, options: ISelectOption[]) {
    options.forEach(option => {
        let optionEl = document.createElement('option');
        optionEl.text = option.text;
        optionEl.value = option.value;
        selectElement.options.add(optionEl);
    });

}

export function makeMainUIContainer(ns: NS): HTMLDivElement | undefined {
    let mainContainer: HTMLDivElement | undefined;

    let contentEl = getTailWindowContentsNode(ns, ns.getScriptName());
    if (contentEl) {

        //let root = contentEl.parentNode!.parentNode!.parentNode!.querySelector('.MuiTypography-root');

        let bitburnerTitleLabel = document.querySelector('.MuiTypography-root .MuiTypography-body1');

        const rootStyle = globalThis.getComputedStyle(bitburnerTitleLabel!);

        //remove any divs in the contentEl
        //but don't kill the resizing span
        let contentDivs = contentEl.querySelectorAll('div');
        contentDivs.forEach(n => n.parentNode?.removeChild(n));

        mainContainer = document.createElement('div');
        mainContainer.id = 'mainContainer';

        mainContainer.style.fontFamily = rootStyle.fontFamily;
        mainContainer.style.fontSize = rootStyle.fontSize;
        mainContainer.style.color = rootStyle.color;

        mainContainer.style.height = '100%';
        mainContainer.style.whiteSpace = 'initial';

        contentEl.appendChild(mainContainer);
    }

    return mainContainer;

}



