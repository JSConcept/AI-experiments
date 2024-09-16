import { Matrix3x3, Point } from "./Matrix.ts";
import { parseLength, parseTransform, parseOrigin, getElementZoom, getParentChain } from "./Utils.ts";

//
const transformationMatrixSymbol = Symbol('transformationMatrix');

// Функция для получения матрицы трансформации элемента относительно страницы
export function getNodeFullTransform(element: Element): Matrix3x3 {
    // Проверяем, есть ли кешированная матрица
    //let matrix = (element as any)[transformationMatrixSymbol] as Matrix3x3;
    //if (matrix) { return matrix; }

    // Начинаем с единичной матрицы
    let matrix = new Matrix3x3([
        1, 0, 0,
        0, 1, 0,
        0, 0, 1
    ]);

    //
    let chain = [element, ...getParentChain(element)];
    for (const el of chain) {
        // Учитываем scroll
        if (el instanceof HTMLElement) {
            const scrollMatrix = new Matrix3x3([
                1, 0, -el.scrollLeft,
                0, 1, -el.scrollTop,
                0, 0, 1
            ]);
            matrix = scrollMatrix.multiply(matrix);
        }

        // Учитываем transform
        const style = getComputedStyle(el);

        // Получаем матрицу трансформации элемента
        const transform = style.transform;
        if (transform && transform !== 'none') {
            const transformMatrix = parseTransform(transform);
            matrix = transformMatrix.multiply(matrix);
        }

        // Учитываем позицию элемента
        const rect = el.getBoundingClientRect();
        const positionMatrix = new Matrix3x3([
            1, 0, rect.left + window.scrollX,
            0, 1, rect.top + window.scrollY,
            0, 0, 1
        ]);
        matrix = positionMatrix.multiply(matrix);
    }

    // Кешируем матрицу
    (element as any)[transformationMatrixSymbol] = matrix;
    return matrix;
}

//
export function getCumulativeTransformFromPage(element: Element): DOMMatrix {
    let matrix = new DOMMatrix();
    let node: Element | null = element;
    while (node && node instanceof Element) {
        const style = getComputedStyle(node);

        // Получаем матрицу трансформации элемента
        const transform = style.transform || style.webkitTransform || 'none';
        let transformMatrix = new DOMMatrix();
        if (transform && transform !== 'none') {
            transformMatrix = new DOMMatrix(transform);
        }

        // Учитываем смещение элемента относительно родителя
        const rect = node.getBoundingClientRect();
        const parentRect = node.parentElement ? node.parentElement.getBoundingClientRect() : { left: 0, top: 0 };

        // Расчет смещения относительно родителя
        const offsetX = rect.left - parentRect.left;
        const offsetY = rect.top - parentRect.top;

        // Матрица смещения
        const offsetMatrix = new DOMMatrix().translate(offsetX, offsetY);

        // Общая матрица для текущего узла: смещение + трансформация
        const nodeMatrix = offsetMatrix.multiply(transformMatrix);

        // Накопление матриц: умножаем текущую матрицу на общую
        matrix = nodeMatrix.multiply(matrix);

        // Переходим к родительскому элементу
        node = node.parentElement;
    }

    // Учитываем прокрутку окна
    const scrollMatrix = new DOMMatrix().translate(window.scrollX, window.scrollY);
    matrix = scrollMatrix.multiply(matrix);
    return matrix;
}
