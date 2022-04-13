import { NS } from 'NetscriptDefinitions';

export async function main(ns: NS) {
    ns.disableLog('ALL');
    ns.clearLog();
    ns.tail();
    const doc = globalThis['document'];

    let root = doc.querySelector('.MuiTypography-root');
    const style = globalThis.getComputedStyle(root!);
    const renderIframe = doc.createElement('iframe');
    renderIframe.style.boxSizing = 'border-box';
    renderIframe.style.position = 'relative';
    renderIframe.style['width'] = '100%';
    renderIframe.style['height'] = '100%';

    const navInputEl = doc.createElement('input');
    navInputEl.style.boxSizing = 'border-box';
    navInputEl.style.position = 'relative';
    navInputEl.style['width'] = '100%';
    navInputEl.style.outline = 'none';
    navInputEl.style.padding = '2px';
    navInputEl.style.fontFamily = style.fontFamily;
    navInputEl.style.fontSize = style.fontSize;
    navInputEl.style.color = style.color;
    navInputEl.style.background = style.backgroundColor;
    /*
    navInputEl.addEventListener('keydown', (evt: KeyboardEvent) => {
        evt.cancelBubble = true;
        if ('Enter' == evt.code) {
            let url = '';// evt.target?.value;
            if (!url.match('//')) {
                url += `https://` + url;
            }
            renderIframe.src = url;
        } else {
            return true;
        }
    });
*/
    renderIframe.onload = () => navInputEl.value = renderIframe.src; //set the input text to the url of the iframe

    function resizeTailWindow() {
        let windowTitle = `${ns.getScriptName()} ${ns.args.join(' ')}`;
        let tailWindowTitleEl: Element | null = doc.querySelector(`h6[title="${windowTitle}"]`);

        if (tailWindowTitleEl) {
            let tailWindowTitleNode = tailWindowTitleEl.parentNode!;
            let tailWindowContentsNode = tailWindowTitleNode.parentNode!.parentNode!.firstChild!.nextSibling!.firstChild! as HTMLElement;
            tailWindowContentsNode.style.width;
        }

    }

    function rebuildBrowserWindow() {
        let windowTitle = `${ns.getScriptName()} ${ns.args.join(' ')}`;
        let tailWindowTitleEl: Element | null = doc.querySelector(`h6[title="${windowTitle}"]`);

        if (tailWindowTitleEl) {
            let tailWindowTitleNode = tailWindowTitleEl.parentNode!;
            let buttonsDiv = tailWindowTitleNode.querySelector('div')!;
            navInputEl.style.marginRight = globalThis.getComputedStyle(buttonsDiv)['width'];

            if (!tailWindowTitleNode.querySelector('input')) {

                let sibling = tailWindowTitleNode.firstChild!.nextSibling; //seems to be the same as buttonsDiv
                tailWindowTitleNode.insertBefore(navInputEl, sibling);
                tailWindowTitleNode.removeChild(tailWindowTitleNode.firstChild!);

                let tailWindowContentsNode = tailWindowTitleNode.parentNode!.parentNode!.firstChild!.nextSibling!.firstChild! as Element;
                let contentDivs = tailWindowContentsNode.querySelectorAll('div');

                contentDivs.forEach(n => n.parentNode?.removeChild(n));

                tailWindowContentsNode.appendChild(renderIframe);

            }

        }
    }

    while (true) {
        rebuildBrowserWindow();
        await ns.asleep(1000);
    }
}
