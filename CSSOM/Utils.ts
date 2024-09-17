/*
 * Made by o1-preview, with my rewriting, but who I am? I don't say...
 */

//
export type Point = DOMPoint;

//
export function parseOrigin(origin: string, element: Element): Point {
    const values = origin.split(' ');
    const x = parseLength(values[0], element.clientWidth);
    const y = parseLength(values[1], element.clientHeight);
    return new DOMPoint(x, y);
}

//
export function parseLength(value: string, size: number): number {
    if (value.endsWith('%')) {
        return (parseFloat(value) / 100) * size;
    }
    return parseFloat(value);
}

//
export function getParent(element: Element): Element | null {
    const position = getComputedStyle(element, "")?.position || "static";
    if (position == "absolute" || position == "fixed") {
        return (element as HTMLElement)?.offsetParent;
    }
    return (element?.parentElement ?? (element as any)?.host ?? element?.parentNode) as (Element | null);
}

//
export function getParentChain(element: Element): Element[] {
    const parents: Element[] = [];
    let current: Element | null = element;
    while (current) {
        const parent = getParent(current);

        //
        if (parent && (/*parent instanceof HTMLBodyElement ||*/ parent instanceof HTMLHtmlElement)) {
            break;
        }

        //
        if (current = parent) {
            parents.push(current);
        }
    }
    return parents;
}

//
export function getElementZoom(element: Element): number {
    let zoom = 1;
    let currentElement: Element | null = element;

    //
    while (currentElement) {
        if ('currentCSSZoom' in (currentElement as any)) {
            const currentCSSZoom = (currentElement as any).currentCSSZoom;
            if (typeof currentCSSZoom === 'number') {
                zoom *= currentCSSZoom;
                return zoom; // why not skipped here?!
            }
        }

        //
        const style = getComputedStyle(currentElement);
        if (style.zoom && style.zoom !== 'normal') {
            zoom *= parseFloat(style.zoom);
            return zoom;
        }

        //
        if ((style.zoom && style.zoom !== 'normal') || 'currentCSSZoom' in (currentElement as any)) {
            return zoom;
        }

        //
        currentElement = currentElement.parentElement;
    }

    //
    return zoom;
}

//
export function isNearlyIdentity(matrix: DOMMatrix, epsilon: number = 1e-6): boolean {
    return (
        Math.abs(matrix.a - 1) < epsilon &&
        Math.abs(matrix.b) < epsilon &&
        Math.abs(matrix.c) < epsilon &&
        Math.abs(matrix.d - 1) < epsilon &&
        Math.abs(matrix.e) < epsilon &&
        Math.abs(matrix.f) < epsilon
    );
}
