// Символ для хранения кешированных матриц у элементов
const transformationMatrixSymbol = Symbol('transformationMatrix');
type Point = { x: number; y: number };

// Класс для работы с матрицами 3x3
class Matrix3x3 {
    m: number[];

    constructor(m: number[]) {
        this.m = m;
    }

    // Метод для умножения матрицы на другую матрицу
    multiply(other: Matrix3x3): Matrix3x3 {
        const a = this.m;
        const b = other.m;
        const result = [
            a[0]*b[0] + a[1]*b[3] + a[2]*b[6],
            a[0]*b[1] + a[1]*b[4] + a[2]*b[7],
            a[0]*b[2] + a[1]*b[5] + a[2]*b[8],

            a[3]*b[0] + a[4]*b[3] + a[5]*b[6],
            a[3]*b[1] + a[4]*b[4] + a[5]*b[7],
            a[3]*b[2] + a[4]*b[5] + a[5]*b[8],

            a[6]*b[0] + a[7]*b[3] + a[8]*b[6],
            a[6]*b[1] + a[7]*b[4] + a[8]*b[7],
            a[6]*b[2] + a[7]*b[5] + a[8]*b[8],
        ];
        return new Matrix3x3(result);
    }

    // Метод для инвертирования матрицы
    inverse(): Matrix3x3 {
        const m = this.m;
        const det =
            m[0]*(m[4]*m[8] - m[5]*m[7]) -
            m[1]*(m[3]*m[8] - m[5]*m[6]) +
            m[2]*(m[3]*m[7] - m[4]*m[6]);

        if (det === 0) {
            throw new Error('Матрица не обратима');
        }

        const invDet = 1 / det;
        const result = [
            (m[4]*m[8] - m[5]*m[7]) * invDet,
            (m[2]*m[7] - m[1]*m[8]) * invDet,
            (m[1]*m[5] - m[2]*m[4]) * invDet,

            (m[5]*m[6] - m[3]*m[8]) * invDet,
            (m[0]*m[8] - m[2]*m[6]) * invDet,
            (m[2]*m[3] - m[0]*m[5]) * invDet,

            (m[3]*m[7] - m[4]*m[6]) * invDet,
            (m[1]*m[6] - m[0]*m[7]) * invDet,
            (m[0]*m[4] - m[1]*m[3]) * invDet,
        ];
        return new Matrix3x3(result);
    }
}

// Функция для применения матрицы к точке
function applyMatrixToPoint(matrix: Matrix3x3, point: Point): Point {
    const x = point.x, y = point.y;
    const m = matrix.m;
    const newX = m[0]*x + m[1]*y + m[2];
    const newY = m[3]*x + m[4]*y + m[5];
    const w = m[6]*x + m[7]*y + m[8];

    if (w !== 1 && w !== 0) {
        return { x: newX / w, y: newY / w };
    } else {
        return { x: newX, y: newY };
    }
}

//
function parseLength(value: string, size: number): number {
    if (value.endsWith('%')) {
        return (parseFloat(value) / 100) * size;
    } else if (value.endsWith('px')) {
        return parseFloat(value);
    } else {
        // Дополнительный разбор единиц измерения
        return parseFloat(value);
    }
}

//
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






//
const matrixCache = new WeakMap<Element, Matrix3x3>();

//
function getElementToPageMatrix_FromCache(element: Element): Matrix3x3 {
    // Проверяем наличие в кеша
    let matrix = matrixCache.get(element);
    if (matrix) {
        return matrix;
    }

    // Вычисляем матрицу (код как ранее)
    matrix = getElementToPageMatrix_Calculate(element);

    // Кешируем матрицу
    matrixCache.set(element, matrix);
    return matrix;
}


//
const transformationMatrixCache = new WeakMap<Element, Matrix3x3>();

// Изменение функции getElementToPageMatrix для использования WeakMap
function getElementToPageMatrix_FromCache_Dub(element: Element): Matrix3x3 {
    // Проверяем, есть ли кешированная матрица
    let matrix = transformationMatrixCache.get(element);
    if (matrix) {
        return matrix;
    }

    // Остальной код функции остаётся без изменений...
    matrix = getElementToPageMatrix_Calculate(element);

    // Кешируем матрицу
    transformationMatrixCache.set(element, matrix);
    return matrix;
}

// Функция для получения матрицы трансформации элемента относительно страницы
function getElementToPageMatrix_Calculate(element: Element): Matrix3x3 {
    // Проверяем, есть ли кешированная матрица
    let matrix = (element as any)[transformationMatrixSymbol] as Matrix3x3;
    if (matrix) {
        return matrix;
    }

    // Начинаем с единичной матрицы
    matrix = new Matrix3x3([
        1, 0, 0,
        0, 1, 0,
        0, 0, 1
    ]);

    //
    let el: Element | null = element;

    while (el) {
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
            const transformMatrix = parseTransform_Manual(transform);
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
        // Переходим к родительскому элементу
        el = el.parentElement;
    }

    // Кешируем матрицу
    (element as any)[transformationMatrixSymbol] = matrix;

    return matrix;
}

//
function parseTransform_Origin(transformOrigin: string, element: Element): Point {
    const values = transformOrigin.split(' ');
    let x = parseLength(values[0], element.clientWidth);
    let y = parseLength(values[1], element.clientHeight);
    return { x, y };
}


// Функция для разбора строки transform и получения матрицы
function parseTransform_Manual(transform: string): Matrix3x3 {
    // Упрощённый парсер, поддерживающий только matrix и matrix3d
    const matrixRegex = /matrix\(([^)]+)\)/;
    const matrix3dRegex = /matrix3d\(([^)]+)\)/;

    let m: number[];

    if (matrixRegex.test(transform)) {
        const matches = transform.match(matrixRegex);
        if (matches) {
            const values = matches[1].split(',').map(parseFloat);
            m = [
                values[0], values[2], values[4],
                values[1], values[3], values[5],
                0, 0, 1
            ];
            return new Matrix3x3(m);
        }
    } else if (matrix3dRegex.test(transform)) {
        const matches = transform.match(matrix3dRegex);
        if (matches) {
            const values = matches[1].split(',').map(parseFloat);
            // Преобразуем матрицу 4x4 в 3x3, отбрасывая третье измерение
            m = [
                values[0], values[4], values[12],
                values[1], values[5], values[13],
                0, 0, 1
            ];
            return new Matrix3x3(m);
        }
    }

    // Если не удалось распознать, возвращаем единичную матрицу
    return new Matrix3x3([
        1, 0, 0,
        0, 1, 0,
        0, 0, 1
    ]);
}

//
function parseTransform_ManualOrigin(transform: string, transformOrigin: string, element: Element): Matrix3x3 {
    // Парсим transform как ранее
    const transformMatrix = parseTransform_Manual(transform);

    // Парсим transform-origin
    const origin = parseTransform_Origin(transformOrigin, element);

    // Создаём матрицу переноса к origin
    const originMatrix = new Matrix3x3([
        1, 0, -origin.x,
        0, 1, -origin.y,
        0, 0, 1
    ]);

    // Создаём обратную матрицу переноса
    const inverseOriginMatrix = new Matrix3x3([
        1, 0, origin.x,
        0, 1, origin.y,
        0, 0, 1
    ]);

    // Итоговая матрица: обратный перенос * трансформация * перенос
    return inverseOriginMatrix.multiply(transformMatrix).multiply(originMatrix);
}




//
function convertPointFromPageToNode_RelateOnlyParent(element: Element, pageX: number, pageY: number): { x: number; y: number } {
    // Получаем границы элемента относительно окна просмотра
    const rect = element.getBoundingClientRect();
    // Вычисляем координаты внутри элемента без учета трансформаций
    let x = pageX - rect.left - window.scrollX;
    let y = pageY - rect.top - window.scrollY;

    // Получаем матрицу трансформации элемента
    const style = getComputedStyle(element);
    const transform = style.transform;

    if (transform && transform !== 'none') {
        // Преобразуем строку трансформации в объект DOMMatrix
        const matrix = new DOMMatrix(transform).inverse();
        // Применяем инвертированную матрицу к точке
        const point = matrix.transformPoint(new DOMPoint(x, y));
        x = point.x;
        y = point.y;
    }

    return { x, y };
}

//
function convertPointFromNodeToPage_RelateOnlyParent(element: Element, nodeX: number, nodeY: number): { x: number; y: number } {
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

//
function getCumulativeTransformFromPage(element: Element): DOMMatrix {
    let matrix = new DOMMatrix();
    let node: Element | null = element;

    while (node && node instanceof Element) {
        const style = getComputedStyle(node);

        // Получаем матрицу трансформации элемента
        const transform = style.transform;
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



//
function convertPointFromPageToNode_Short(element: Element, pageX: number, pageY: number): { x: number; y: number } {
    // Создаем точку в системе координат страницы
    const point = new DOMPoint(pageX, pageY);

    // Получаем накопленную матрицу трансформации от элемента до страницы
    const matrix = getCumulativeTransformFromPage(element);

    // Инвертируем матрицу для преобразования из координат страницы в координаты элемента
    const inverseMatrix = matrix.inverse();

    // Преобразуем точку
    const transformedPoint = inverseMatrix.transformPoint(point);

    //
    return { x: transformedPoint.x, y: transformedPoint.y };
}

//
function convertPointFromNodeToPage_Short(element: Element, nodeX: number, nodeY: number): { x: number; y: number } {
    // Создаем точку в системе координат элемента
    const point = new DOMPoint(nodeX, nodeY);

    // Получаем накопленную матрицу трансформации от элемента до страницы
    const matrix = getCumulativeTransformFromPage(element);

    // Преобразуем точку
    const transformedPoint = matrix.transformPoint(point);

    //
    return { x: transformedPoint.x, y: transformedPoint.y };
}



// Функция для преобразования точки из координат страницы в координаты элемента
function convertPointFromPageToNode_Manual(element: Element, pageX: number, pageY: number): Point {
    // Получаем инвертированную матрицу трансформации элемента относительно страницы
    const inverseMatrix = getElementToPageMatrix_Calculate(element).inverse();
    // Преобразуем точку
    return applyMatrixToPoint(inverseMatrix, { x: pageX, y: pageY });
}

// Функция для преобразования точки из координат элемента в координаты страницы
function convertPointFromNodeToPage_Manual(element: Element, nodeX: number, nodeY: number): Point {
    // Получаем матрицу трансформации элемента относительно страницы
    const matrix = getElementToPageMatrix_Calculate(element);
    // Преобразуем точку
    return applyMatrixToPoint(matrix, { x: nodeX, y: nodeY });
}
