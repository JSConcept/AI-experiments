import { Matrix3x3, Point } from "../Matrix.ts";
//import { transformationMatrixCache } from "./Native.ts";
import { parseLength, parseTransform, parseOrigin, getElementZoom, getParentChain } from "../Utils.ts";

// Символ для хранения кешированных матриц у элементов
const transformationMatrixCache  = new WeakMap<Element, Matrix3x3>();

// Изменение функции getNodeFullTransform для использования WeakMap
export function getNodeFullTransformFromCache(element: Element): Matrix3x3 {
    // Проверяем, есть ли кешированная матрица
    let matrix = transformationMatrixCache.get(element);
    if (matrix) { return matrix; }

    // Остальной код функции остаётся без изменений...
    matrix = getNodeFullTransform(element);

    // Кешируем матрицу
    transformationMatrixCache.set(element, matrix);
    return matrix;
}

// Функция для получения матрицы трансформации элемента относительно страницы
export function getNodeFullTransformAlt(element: Element): Matrix3x3 {
    //
    let matrix = new Matrix3x3();
    let chain = [element, ...getParentChain(element)];
    for (const el of chain) {
        const computedStyle = getComputedStyle(el);

        // Получаем матрицу transform
        const transform = computedStyle.transform || computedStyle.webkitTransform || 'none';
        let elementMatrix = parseTransform(transform);

        // Учитываем transform-origin
        const origin = computedStyle.transformOrigin || computedStyle.webkitTransformOrigin || '0 0';
        const originPoint = parseOrigin(origin, el);

        // correct only after...
        originPoint.x /= originPoint.w, originPoint.y /= originPoint.w;

        // Учитываем scroll
        const scrollMatrix = new Matrix3x3([
            1, 0, -el.scrollLeft,
            0, 1, -el.scrollTop,
            0, 0, 1
        ]);
        elementMatrix = scrollMatrix.multiply(elementMatrix);

        // Смещаем к origin
        const originMatrix = new Matrix3x3([1, 0, originPoint.x, 0, 1, originPoint.y, 0, 0, 1]);
        const inverseOriginMatrix = new Matrix3x3([1, 0, -originPoint.x, 0, 1, -originPoint.y, 0, 0, 1]);
        elementMatrix = inverseOriginMatrix.multiply(elementMatrix).multiply(originMatrix);

        // Учитываем позицию элемента
        const rect = el.getBoundingClientRect();
        const positionMatrix = new Matrix3x3([1, 0, rect.left + window.scrollX, 0, 1, rect.top + window.scrollY, 0, 0, 1]);

        // Учитываем zoom
        const zoom = getElementZoom(el);
        const zoomMatrix = new Matrix3x3([zoom, 0, 0, 0, zoom, 0, 0, 0, 1]);

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
export function getNodeFullTransform(element: Element): Matrix3x3 {
    // Создаем начальную единичную матрицу
    let matrix = new Matrix3x3();

    // Получаем цепочку родителей от текущего элемента до корневого элемента
    let chain = [element, ...getParentChain(element)];

    // Проходим по цепочке родителей
    for (const el of chain) {
        const computedStyle = getComputedStyle(el);

        // Получаем текущие трансформации
        const transform = computedStyle.transform || computedStyle.webkitTransform || 'none';
        let elementMatrix = parseTransform(transform);

        // Учитываем преобразования origin
        const origin = computedStyle.transformOrigin || computedStyle.webkitTransformOrigin || `${((el as HTMLElement)?.offsetWidth || 0)*0.5}px ${((el as HTMLElement)?.offsetHeight || 0)*0.5}px`;
        const originPoint = parseOrigin(origin, el);

        // correct only after...
        originPoint.x /= originPoint.w, originPoint.y /= originPoint.w;

        // Смещаем матрицу к origin
        const originMatrix = new Matrix3x3().translate(originPoint.x, originPoint.y);
        const inverseOriginMatrix = new Matrix3x3().translate(-originPoint.x, -originPoint.y);
        elementMatrix = originMatrix.multiply(elementMatrix).multiply(inverseOriginMatrix);

        // Учитываем позицию элемента относительно родителя
        let positionMatrix = new Matrix3x3();
        if (el instanceof HTMLElement) {
            // Получаем смещение элемента относительно offsetParent
            const offsetLeft = el.offsetLeft;
            const offsetTop  = el.offsetTop;

            // Учитываем скролл offsetParent
            let parentScrollLeft = 0, parentScrollTop = 0;
            if (el.offsetParent instanceof HTMLElement) {
                parentScrollLeft = el.offsetParent.scrollLeft,
                parentScrollTop = el.offsetParent.scrollTop;
            }

            // Создаем матрицу положения
            positionMatrix = new Matrix3x3().translate(offsetLeft - parentScrollLeft, offsetTop - parentScrollTop);
        }

        // Учитываем zoom
        const zoom = getElementZoom(el);
        const zoomMatrix = new Matrix3x3().scale(zoom, zoom);

        // Общая матрица для текущего элемента
        const totalMatrix = positionMatrix.multiply(zoomMatrix).multiply(elementMatrix);

        // Обновляем общую матрицу
        matrix = totalMatrix.multiply(matrix);
    }

    // Кешируем матрицу
    transformationMatrixCache.set(element, matrix);
    return matrix;
}
