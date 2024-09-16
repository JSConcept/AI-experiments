import { Matrix3x3, Point } from "./Matrix.ts";
import { parseLength, parseTransform, parseOrigin, getElementZoom, getParentChain } from "./Utils.ts";

//
export const transformationMatrixCache = new WeakMap<Element, DOMMatrix>();

/**
 * Получает общую матрицу трансформации элемента относительно страницы.
 * @param element Элемент DOM.
 * @returns DOMMatrix представляющая трансформацию элемента.
 */
export function getElementToPageMatrixAlt(element: Element): DOMMatrix {
    // Создаем начальную единичную матрицу
    let matrix = new DOMMatrix();
    let chain = getParentChain(element);
    for (const el of chain) {
        const computedStyle = getComputedStyle(el);

        // Получаем текущие трансформации
        const transform = computedStyle.transform || computedStyle.webkitTransform || 'none';
        let elementMatrix = new DOMMatrix(transform);

        // Учитываем преобразования origin
        const origin = computedStyle.transformOrigin || computedStyle.webkitTransformOrigin || '0 0';
        const originPoint = parseOrigin(origin, el);

        // Учитываем scroll
        const scrollMatrix = new DOMMatrix([
            1, 0, -el.scrollLeft,
            0, 1, -el.scrollTop,
            //0, 0, 1
        ]);
        elementMatrix = scrollMatrix.multiply(elementMatrix);

        // Смещаем матрицу к origin
        const originMatrix = new DOMMatrix().translate(originPoint.x, originPoint.y);
        const inverseOriginMatrix = new DOMMatrix().translate(-originPoint.x, -originPoint.y);
        elementMatrix = inverseOriginMatrix.multiply(elementMatrix).multiply(originMatrix);

        // Учитываем позицию элемента
        const rect = el.getBoundingClientRect();
        const positionMatrix = new DOMMatrix().translate(rect.left + window.scrollX, rect.top + window.scrollY);

        // Учитываем zoom
        const zoom = getElementZoom(el);
        const zoomMatrix = new DOMMatrix().scale(zoom);

        // Общая матрица для текущего элемента
        const totalMatrix = positionMatrix.multiply(zoomMatrix).multiply(elementMatrix);

        // Обновляем общую матрицу
        matrix = totalMatrix.multiply(matrix);
    }

    // Кешируем матрицу
    transformationMatrixCache.set(element, matrix);
    return matrix;
}

/**
 * Получает общую матрицу трансформации элемента относительно страницы.
 * @param element Элемент DOM.
 * @returns DOMMatrix представляющая трансформацию элемента.
 */
export function getElementToPageMatrix(element: Element): DOMMatrix {
    // Создаем начальную единичную матрицу
    let matrix = new DOMMatrix();

    // Получаем цепочку родителей от текущего элемента до корневого элемента
    let chain = getParentChain(element);

    // Проходим по цепочке родителей
    for (const el of chain) {
        const computedStyle = getComputedStyle(el);

        // Получаем текущие трансформации
        const transform = computedStyle.transform || computedStyle.webkitTransform || 'none';
        let elementMatrix = new DOMMatrix(transform);

        // Учитываем преобразования origin
        const origin = computedStyle.transformOrigin || computedStyle.webkitTransformOrigin || '0 0';
        const originPoint = parseOrigin(origin, el);

        // Смещаем матрицу к origin
        const originMatrix = new DOMMatrix().translate(originPoint.x, originPoint.y);
        const inverseOriginMatrix = new DOMMatrix().translate(-originPoint.x, -originPoint.y);
        elementMatrix = inverseOriginMatrix.multiply(elementMatrix).multiply(originMatrix);

        // Учитываем позицию элемента относительно родителя
        let positionMatrix = new DOMMatrix();
        if (el instanceof HTMLElement) {
            // Получаем смещение элемента относительно offsetParent
            const offsetLeft = el.offsetLeft;
            const offsetTop = el.offsetTop;

            // Учитываем скролл offsetParent
            let parentScrollLeft = 0;
            let parentScrollTop = 0;
            if (el.offsetParent instanceof HTMLElement) {
                parentScrollLeft = el.offsetParent.scrollLeft;
                parentScrollTop = el.offsetParent.scrollTop;
            }

            // Создаем матрицу положения
            positionMatrix = new DOMMatrix().translate(offsetLeft - parentScrollLeft, offsetTop - parentScrollTop);
        }

        // Учитываем zoom
        const zoom = getElementZoom(el);
        const zoomMatrix = new DOMMatrix().scale(zoom);

        // Общая матрица для текущего элемента
        const totalMatrix = positionMatrix.multiply(zoomMatrix).multiply(elementMatrix);

        // Обновляем общую матрицу
        matrix = totalMatrix.multiply(matrix);
    }

    // Кешируем матрицу
    transformationMatrixCache.set(element, matrix);
    return matrix;
}
