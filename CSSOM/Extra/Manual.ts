/*
 * Made by o1-preview, with my rewriting, but who I am? I don't say...
 */

//
import { Matrix3x3, parseTransform } from "./Legacy.ts";
import { parseOrigin, getElementZoom, getOffsetParentChain } from "../Utils.ts";

//
export const transformationMatrixCache  = new WeakMap<Element, Matrix3x3>();
export function getNodeFullTransformFromCache(element: Element): Matrix3x3 {
    let matrix = transformationMatrixCache.get(element);
    if (matrix) { return matrix; }
    matrix = getNodeFullTransform(element);
    transformationMatrixCache.set(element, matrix);
    return matrix;
}

//
export function getNodeFullTransformAlt(element: Element): Matrix3x3 {
    let matrix = new Matrix3x3();
    let chain = [element, ...getOffsetParentChain(element)];
    for (const el of chain) {
        const computedStyle = getComputedStyle(el);
        const transform = computedStyle.transform || computedStyle.webkitTransform || 'none';
        let elementMatrix = parseTransform(transform);

        //
        const origin = computedStyle.transformOrigin || computedStyle.webkitTransformOrigin || '0 0';
        const originPoint = parseOrigin(origin, el);
        originPoint.x /= originPoint.w, originPoint.y /= originPoint.w;

        //
        const scrollMatrix = new Matrix3x3([
            1, 0, -el.scrollLeft,
            0, 1, -el.scrollTop,
            0, 0, 1
        ]);
        elementMatrix = scrollMatrix.multiply(elementMatrix);

        //
        const originMatrix = new Matrix3x3([1, 0, originPoint.x, 0, 1, originPoint.y, 0, 0, 1]);
        const inverseOriginMatrix = new Matrix3x3([1, 0, -originPoint.x, 0, 1, -originPoint.y, 0, 0, 1]);
        elementMatrix = inverseOriginMatrix.multiply(elementMatrix).multiply(originMatrix);

        //
        const rect = el.getBoundingClientRect();
        const positionMatrix = new Matrix3x3([1, 0, rect.left + window.scrollX, 0, 1, rect.top + window.scrollY, 0, 0, 1]);
        const zoom = getElementZoom(el);
        const zoomMatrix = new Matrix3x3([zoom, 0, 0, 0, zoom, 0, 0, 0, 1]);
        const totalMatrix = positionMatrix.multiply(zoomMatrix).multiply(elementMatrix);

        //
        matrix = totalMatrix.multiply(matrix);
    }

    //
    transformationMatrixCache.set(element, matrix);
    return matrix;
}

//
export function getNodeFullTransform(element: Element): Matrix3x3 {
    let matrix = new Matrix3x3();
    let chain = [element, ...getOffsetParentChain(element)];
    for (const el of chain) {
        const computedStyle = getComputedStyle(el);
        const transform = computedStyle.transform || computedStyle.webkitTransform || 'none';
        let elementMatrix = parseTransform(transform);

        //
        const origin = computedStyle.transformOrigin || computedStyle.webkitTransformOrigin || `${((el as HTMLElement)?.offsetWidth || 0)*0.5}px ${((el as HTMLElement)?.offsetHeight || 0)*0.5}px`;
        const originPoint = parseOrigin(origin, el);

        // correct only after...
        originPoint.x /= originPoint.w, originPoint.y /= originPoint.w;

        //
        const originMatrix = new Matrix3x3().translate(originPoint.x, originPoint.y);
        const inverseOriginMatrix = new Matrix3x3().translate(-originPoint.x, -originPoint.y);
        elementMatrix = originMatrix.multiply(elementMatrix).multiply(inverseOriginMatrix);

        //
        let positionMatrix = new Matrix3x3();
        if (el instanceof HTMLElement) {
            const {offsetLeft, offsetTop} = el;
            let parentScrollLeft = 0, parentScrollTop = 0;
            if (el.offsetParent instanceof HTMLElement) {
                parentScrollLeft = el.offsetParent.scrollLeft,
                parentScrollTop  = el.offsetParent.scrollTop;
            }
            positionMatrix = new Matrix3x3().translate(offsetLeft - parentScrollLeft, offsetTop - parentScrollTop);
        }

        //
        const zoom = getElementZoom(el);
        const zoomMatrix = new Matrix3x3().scale(zoom, zoom);
        const totalMatrix = positionMatrix.multiply(zoomMatrix).multiply(elementMatrix);
        matrix = totalMatrix.multiply(matrix);
    }

    //
    transformationMatrixCache.set(element, matrix);
    return matrix;
}
