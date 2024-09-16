import { getNodeFullTransform as getNodeFullTransformManual } from "./Manual.ts";
import { getNodeFullTransform as getNodeFullTransformNative } from "./Native.ts";
import { Matrix3x3, Point } from "../Matrix.ts";
import { parseLength, parseTransform, parseOrigin, getElementZoom } from "../Utils.ts";

//
export function convertPointFromPageToNode(element: Element, pageX: number, pageY: number): { x: number; y: number } {
    // Получаем накопленную матрицу трансформации от элемента до страницы
    // Инвертируем матрицу для преобразования из координат страницы в координаты элемента
    const inverseMatrix = getNodeFullTransformNative(element).inverse();
    // Преобразуем точку
    return inverseMatrix.transformPoint(new DOMPoint(pageX, pageY));
}

//
export function convertPointFromNodeToPage(element: Element, nodeX: number, nodeY: number): { x: number; y: number } {
    // Получаем накопленную матрицу трансформации от элемента до страницы
    const matrix = getNodeFullTransformNative(element);
    // Преобразуем точку
    return matrix.transformPoint(new DOMPoint(nodeX, nodeY));
}

// Функция для преобразования точки из координат страницы в координаты элемента
export function convertPointFromPageToNodeM(element: Element, pageX: number, pageY: number): Point {
    // Получаем инвертированную матрицу трансформации элемента относительно страницы
    const inverseMatrix = getNodeFullTransformManual(element).inverse();
    // Преобразуем точку
    return inverseMatrix.applyToPoint(new DOMPoint(pageX, pageY));
}

// Функция для преобразования точки из координат элемента в координаты страницы
export function convertPointFromNodeToPageM(element: Element, nodeX: number, nodeY: number): Point {
    // Получаем матрицу трансформации элемента относительно страницы
    const matrix = getNodeFullTransformManual(element);
    // Преобразуем точку
    return matrix.applyToPoint(new DOMPoint(nodeX, nodeY));
}
