/*
 * Made by o1-preview, with my rewriting, but who I am? I don't say...
 */

//
import { Matrix3x3, parseTransform } from "./Legacy.ts";
import { getOffsetParentChain } from "../Utils.ts";

//
export const transformationMatrixSymbol = Symbol('transformationMatrix');
export function getNodeFullTransform(element: Element): Matrix3x3 {
    let matrix = new Matrix3x3([
        1, 0, 0,
        0, 1, 0,
        0, 0, 1
    ]);

    //
    let chain = [element, ...getOffsetParentChain(element)];
    for (const el of chain) {
        if (el instanceof HTMLElement) {
            const scrollMatrix = new Matrix3x3([
                1, 0, -el.scrollLeft,
                0, 1, -el.scrollTop,
                0, 0, 1
            ]);
            matrix = scrollMatrix.multiply(matrix);
        }

        //
        const style = getComputedStyle(el);
        const transform = style.transform;
        if (transform && transform !== 'none') {
            const transformMatrix = parseTransform(transform);
            matrix = transformMatrix.multiply(matrix);
        }

        //
        const rect = el.getBoundingClientRect();
        const positionMatrix = new Matrix3x3([
            1, 0, rect.left + window.scrollX,
            0, 1, rect.top + window.scrollY,
            0, 0, 1
        ]);
        matrix = positionMatrix.multiply(matrix);
    }

    //
    (element as any)[transformationMatrixSymbol] = matrix;
    return matrix;
}

//
export function getCumulativeTransformFromPage(element: Element): DOMMatrix {
    let matrix = new DOMMatrix();
    let node: Element | null = element;
    while (node && node instanceof Element) {
        const style = getComputedStyle(node);
        const transform = style.transform || style.webkitTransform || 'none';
        let transformMatrix = new DOMMatrix();
        if (transform && transform !== 'none') {
            transformMatrix = new DOMMatrix(transform);
        }
        const rect = node.getBoundingClientRect();
        const parentRect = node.parentElement ? node.parentElement.getBoundingClientRect() : { left: 0, top: 0 };
        const offsetX = rect.left - parentRect.left;
        const offsetY = rect.top - parentRect.top;
        const offsetMatrix = new DOMMatrix().translate(offsetX, offsetY);
        const nodeMatrix = offsetMatrix.multiply(transformMatrix);
        matrix = nodeMatrix.multiply(matrix);
        node = node.parentElement;
    }

    //
    const scrollMatrix = new DOMMatrix().translate(window.scrollX, window.scrollY);
    matrix = scrollMatrix.multiply(matrix);
    return matrix;
}

//
export function convertPointFromPageToNode(element: Element, pageX: number, pageY: number): { x: number; y: number } {
    const rect = element.getBoundingClientRect();
    let x = pageX - rect.left - window.scrollX;
    let y = pageY - rect.top  - window.scrollY;

    //
    const style = getComputedStyle(element);
    const transform = style.transform;
    if (transform && transform !== 'none') {
        const matrix = new DOMMatrix(transform).inverse();
        const point = matrix.transformPoint(new DOMPoint(x, y));
        x = point.x, y = point.y;
    }

    //
    return { x, y };
}

//
export function convertPointFromNodeToPage(element: Element, nodeX: number, nodeY: number): { x: number; y: number } {
    const style = getComputedStyle(element);
    const transform = style.transform;

    //
    let point = new DOMPoint(nodeX, nodeY);
    if (transform && transform !== 'none') {
        const matrix = new DOMMatrix(transform);
        point = matrix.transformPoint(point);
    }

    //
    const rect = element.getBoundingClientRect();
    const x = point.x + rect.left + window.scrollX;
    const y = point.y + rect.top + window.scrollY;
    return { x, y };
}
