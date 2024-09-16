import { Matrix3x3, Point } from "./Matrix.ts";
import { parseLength, parseTransform, isNearlyIdentity, parseOrigin, getElementZoom, getParentChain } from "./Utils.ts";

//
export const transformationMatrixCache = new WeakMap<Element, DOMMatrix>();

/**
 * Получает общую матрицу трансформации элемента относительно страницы.
 * @param element Элемент DOM.
 * @returns DOMMatrix представляющая трансформацию элемента.
 */
export function getNodeFullTransform(element: Element): DOMMatrix {
    // Создаем начальную единичную матрицу
    let matrix = new DOMMatrix();

    // Получаем цепочку родителей от текущего элемента до корневого элемента
    let chain = [element, ...getParentChain(element)];

    // Проходим по цепочке родителей
    for (const el of chain) {
        const computedStyle = getComputedStyle(el);

        // Получаем текущие трансформации
        const transform = computedStyle.transform || computedStyle.webkitTransform || 'none';
        let elementMatrix = new DOMMatrix(transform);

        // Учитываем преобразования origin
        const origin = computedStyle.transformOrigin || computedStyle.webkitTransformOrigin || `${((el as HTMLElement)?.clientWidth||0)*0.5}px ${((el as HTMLElement)?.clientHeight || 0)*0.5}px`;
        const originPoint = parseOrigin(origin, el);

        // Смещаем матрицу к origin
        if (!isNearlyIdentity(elementMatrix)) {
            const originMatrix = new DOMMatrix().translate(originPoint.x, originPoint.y);
            const inverseOriginMatrix = new DOMMatrix().translate(-originPoint.x, -originPoint.y);
            elementMatrix = originMatrix.multiply(elementMatrix).multiply(inverseOriginMatrix);
        }

        // Учитываем позицию элемента относительно родителя
        let positionMatrix = new DOMMatrix();
        if (el instanceof HTMLElement) {
            // Получаем смещение элемента относительно offsetParent
            const {offsetLeft, offsetTop} = el;

            //
            const marginLeft = 0;
            const marginTop  = 0;

            // Учитываем скролл offsetParent
            let parentScrollLeft = 0, parentScrollTop = 0;
            if (el.offsetParent instanceof HTMLElement) {
                parentScrollLeft = el?.offsetParent?.scrollLeft || 0;
                parentScrollTop  = el?.offsetParent?.scrollTop  || 0;
            }

            //
            const diffLeft = (offsetLeft - marginLeft - parentScrollLeft) || 0;
            const diffTop  = (offsetTop  - marginTop  - parentScrollTop ) || 0;

            // Создаем матрицу положения
            if (Math.abs(diffTop) >= 0.001 || Math.abs(diffLeft) >= 0.001) {
                positionMatrix = new DOMMatrix().translate(diffLeft, diffTop);
            }
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

//
export function convertPointFromPageToNode(element: Element, pageX: number, pageY: number): { x: number; y: number } {
    // Получаем накопленную матрицу трансформации от элемента до страницы
    // Инвертируем матрицу для преобразования из координат страницы в координаты элемента
    const inverseMatrix = getNodeFullTransform(element).inverse();
    // Преобразуем точку
    return inverseMatrix.transformPoint(new DOMPoint(pageX, pageY));
}

//
export function convertPointFromNodeToPage(element: Element, nodeX: number, nodeY: number): { x: number; y: number } {
    // Получаем накопленную матрицу трансформации от элемента до страницы
    const matrix = getNodeFullTransform(element);
    // Преобразуем точку
    return matrix.transformPoint(new DOMPoint(nodeX, nodeY));
}
