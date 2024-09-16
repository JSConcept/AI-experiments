import { Matrix3x3, Point } from "./Matrix.ts";
import { parseLength, parseTransform, parseOrigin, getElementZoom } from "./Utils.ts";

//
export function convertPointFromPageToNode(element: Element, pageX: number, pageY: number): { x: number; y: number } {
    // Получаем границы элемента относительно окна просмотра
    const rect = element.getBoundingClientRect();
    // Вычисляем координаты внутри элемента без учета трансформаций
    let x = pageX - rect.left - window.scrollX;
    let y = pageY - rect.top - window.scrollY;

    // Получаем матрицу трансформации элемента
    const style = getComputedStyle(element);
    const transform = style.transform;

    //
    if (transform && transform !== 'none') {
        // Преобразуем строку трансформации в объект DOMMatrix
        const matrix = new DOMMatrix(transform).inverse();
        // Применяем инвертированную матрицу к точке
        const point = matrix.transformPoint(new DOMPoint(x, y));
        x = point.x, y = point.y;
    }

    return { x, y };
}

//
export function convertPointFromNodeToPage(element: Element, nodeX: number, nodeY: number): { x: number; y: number } {
    // Получаем матрицу трансформации элемента
    const style = getComputedStyle(element);
    const transform = style.transform;

    // Инициализируем точку
    let point = new DOMPoint(nodeX, nodeY);
    if (transform && transform !== 'none') {
        // Преобразуем строку трансформации в объект DOMMatrix
        const matrix = new DOMMatrix(transform);
        // Применяем матрицу к точке
        point = matrix.transformPoint(point);
    }

    // Получаем границы элемента относительно окна просмотра
    const rect = element.getBoundingClientRect();

    // Вычисляем координаты на странице
    const x = point.x + rect.left + window.scrollX;
    const y = point.y + rect.top + window.scrollY;
    return { x, y };
}
