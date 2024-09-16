// Определяем тип для точки
type Point = {
    x: number;
    y: number;
};

// Класс для работы с матрицами 3x3 (аффинные трансформации)
class Matrix3x3 {
    m: number[];

    constructor(m?: number[]) {
        this.m = m || [1, 0, 0, 0, 1, 0, 0, 0, 1];
    }

    // Умножение матрицы на другую матрицу
    multiply(other: Matrix3x3): Matrix3x3 {
        const a = this.m;
        const b = other.m;
        const result = [
            a[0] * b[0] + a[1] * b[3] + a[2] * b[6],
            a[0] * b[1] + a[1] * b[4] + a[2] * b[7],
            a[0] * b[2] + a[1] * b[5] + a[2] * b[8],

            a[3] * b[0] + a[4] * b[3] + a[5] * b[6],
            a[3] * b[1] + a[4] * b[4] + a[5] * b[7],
            a[3] * b[2] + a[4] * b[5] + a[5] * b[8],

            a[6] * b[0] + a[7] * b[3] + a[8] * b[6],
            a[6] * b[1] + a[7] * b[4] + a[8] * b[7],
            a[6] * b[2] + a[7] * b[5] + a[8] * b[8],
        ];
        return new Matrix3x3(result);
    }

    // Применение матрицы к точке
    applyToPoint(point: Point): Point {
        const x = point.x;
        const y = point.y;
        const m = this.m;
        const newX = m[0] * x + m[1] * y + m[2];
        const newY = m[3] * x + m[4] * y + m[5];
        const w = m[6] * x + m[7] * y + m[8];

        if (w !== 1 && w !== 0) {
            return { x: newX / w, y: newY / w };
        } else {
            return { x: newX, y: newY };
        }
    }

    // Инвертирование матрицы
    inverse(): Matrix3x3 {
        const m = this.m;
        const det =
            m[0] * (m[4] * m[8] - m[5] * m[7]) -
            m[1] * (m[3] * m[8] - m[5] * m[6]) +
            m[2] * (m[3] * m[7] - m[4] * m[6]);

        if (det === 0) {
            throw new Error('Матрица не обратима');
        }

        const invDet = 1 / det;
        const result = [
            (m[4] * m[8] - m[5] * m[7]) * invDet,
            (m[2] * m[7] - m[1] * m[8]) * invDet,
            (m[1] * m[5] - m[2] * m[4]) * invDet,

            (m[5] * m[6] - m[3] * m[8]) * invDet,
            (m[0] * m[8] - m[2] * m[6]) * invDet,
            (m[2] * m[3] - m[0] * m[5]) * invDet,

            (m[3] * m[7] - m[4] * m[6]) * invDet,
            (m[1] * m[6] - m[0] * m[7]) * invDet,
            (m[0] * m[4] - m[1] * m[3]) * invDet,
        ];
        return new Matrix3x3(result);
    }
}

// Символ для хранения кешированных матриц
const transformationMatrixSymbol = Symbol();

// Карта для кеширования матриц трансформации элементов
const transformationMatrixCache = new WeakMap<Element, Matrix3x3>();

// Функция для получения матрицы трансформации элемента относительно страницы
function getElementToPageMatrix(element: Element): Matrix3x3 {
    if (transformationMatrixCache.has(element)) {
        return transformationMatrixCache.get(element)!;
    }

    //
    let matrix = new Matrix3x3();
    let el: Element | null = element;
    while (el) {
        const computedStyle = getComputedStyle(el);

        // Получаем матрицу transform
        const transform = computedStyle.transform || computedStyle.webkitTransform || 'none';
        let elementMatrix = parseTransform(transform);

        // Учитываем transform-origin
        const origin = computedStyle.transformOrigin || computedStyle.webkitTransformOrigin || '0 0';
        const [originX, originY] = parseOrigin(origin, el);

        // Смещаем к origin
        const originMatrix = new Matrix3x3([1, 0, originX, 0, 1, originY, 0, 0, 1]);
        const inverseOriginMatrix = new Matrix3x3([1, 0, -originX, 0, 1, -originY, 0, 0, 1]);
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

        el = el.parentElement;
    }

    // Кешируем матрицу
    transformationMatrixCache.set(element, matrix);

    return matrix;
}

// Функция для разбора transform строки в матрицу
function parseTransform(transform: string): Matrix3x3 {
    if (transform === 'none') {
        return new Matrix3x3();
    }

    const matrixRegex = /matrix(3d)?\(([^)]+)\)/;
    const match = transform.match(matrixRegex);

    if (!match) {
        return new Matrix3x3();
    }

    const is3D = !!match[1];
    const values = match[2].split(',').map(parseFloat);

    if (is3D) {
        // Преобразуем матрицу 4x4 в 3x3, игнорируя Z
        return new Matrix3x3([
            values[0], values[1], values[12],
            values[4], values[5], values[13],
            0, 0, 1
        ]);
    } else {
        return new Matrix3x3([
            values[0], values[2], values[4],
            values[1], values[3], values[5],
            0, 0, 1
        ]);
    }
}

// Функция для разбора transform-origin
function parseOrigin(origin: string, element: Element): [number, number] {
    const values = origin.split(' ');
    const x = parseLength(values[0], element.clientWidth);
    const y = parseLength(values[1], element.clientHeight);
    return [x, y];
}

// Функция для разбора длины в пикселях
function parseLength(value: string, size: number): number {
    if (value.endsWith('%')) {
        return (parseFloat(value) / 100) * size;
    } else if (value.endsWith('px')) {
        return parseFloat(value);
    } else {
        // Дополнительная обработка единиц измерения при необходимости
        return parseFloat(value);
    }
}

// Функция для получения текущего zoom элемента
function getElementZoom(element: Element): number {
    const style = getComputedStyle(element);
    let zoom = 1;
    if (style.zoom && style.zoom !== 'normal') {
        zoom = parseFloat(style.zoom);
    }
    if ('currentCSSZoom' in element) {
        zoom *= (element as any).currentCSSZoom;
    }
    return zoom;
}

// Функция для преобразования точки из координат страницы в координаты элемента
function convertPointFromPageToNode(element: Element, pagePoint: Point): Point {
    const matrix = getElementToPageMatrix(element).inverse();
    return matrix.applyToPoint(pagePoint);
}

// Функция для преобразования точки из координат элемента в координаты страницы
function convertPointFromNodeToPage(element: Element, nodePoint: Point): Point {
    const matrix = getElementToPageMatrix(element);
    return matrix.applyToPoint(nodePoint);
}

// Пример использования
/*const element = document.getElementById('myElement');
if (element) {
    const pagePoint: Point = { x: 100, y: 200 };
    const nodePoint = convertPointFromPageToNode(element, pagePoint);
    console.log('Координаты внутри элемента:', nodePoint);

    const backToPagePoint = convertPointFromNodeToPage(element, nodePoint);
    console.log('Возврат к координатам страницы:', backToPagePoint);
}*/
