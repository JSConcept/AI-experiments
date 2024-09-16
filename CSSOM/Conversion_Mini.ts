// Определяем тип для точки, используя DOMPoint
type Point = DOMPoint;

// Кеширование матриц трансформации элементов с помощью WeakMap
const transformationMatrixCache = new WeakMap<Element, DOMMatrix>();

/**
 * Получает общую матрицу трансформации элемента относительно страницы.
 * @param element Элемент DOM.
 * @returns DOMMatrix представляющая трансформацию элемента.
 */
function getElementToPageMatrix(element: Element): DOMMatrix {
    if (transformationMatrixCache.has(element)) {
        return transformationMatrixCache.get(element)!;
    }

    // Создаем начальную единичную матрицу
    let matrix = new DOMMatrix();

    let el: Element | null = element;

    while (el && el instanceof HTMLElement) {
        const computedStyle = getComputedStyle(el);

        // Получаем текущие трансформации
        const transform = computedStyle.transform || 'none';
        let elementMatrix = new DOMMatrix(transform);

        // Учитываем преобразования origin
        const origin = computedStyle.transformOrigin || '0 0';
        const [originX, originY] = parseOrigin(origin, el);

        // Смещаем матрицу к origin
        const originMatrix = new DOMMatrix().translate(originX, originY);
        const inverseOriginMatrix = new DOMMatrix().translate(-originX, -originY);

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

        el = el.parentElement;
    }

    // Кешируем матрицу
    transformationMatrixCache.set(element, matrix);

    return matrix;
}

/**
 * Разбирает строку transform-origin и возвращает координаты в пикселях.
 * @param origin Строка transform-origin.
 * @param element Элемент DOM.
 * @returns Кортеж [originX, originY].
 */
function parseOrigin(origin: string, element: Element): [number, number] {
    const values = origin.split(' ');
    const x = parseLength(values[0], element.clientWidth);
    const y = parseLength(values[1], element.clientHeight);
    return [x, y];
}

/**
 * Разбирает значение длины и возвращает его в пикселях.
 * @param value Строка длины (например, '50%', '10px').
 * @param size Относительный размер (ширина или высота элемента).
 * @returns Значение в пикселях.
 */
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

/**
 * Получает текущий zoom элемента, учитывая новые стандарты.
 * @param element Элемент DOM.
 * @returns Значение zoom.
 */
function getElementZoom(element: Element): number {
    const style = getComputedStyle(element);
    let zoom = 1;
    if (style.zoom && style.zoom !== 'normal') {
        zoom = parseFloat(style.zoom);
    }
    if ('currentCSSZoom' in (element as any)) {
        zoom *= (element as any).currentCSSZoom;
    }
    return zoom;
}

/**
 * Преобразует точку из координат страницы в координаты элемента.
 * @param element Элемент DOM.
 * @param pagePoint Точка в координатах страницы.
 * @returns Точка в координатах элемента.
 */
function convertPointFromPageToNode(element: Element, pagePoint: Point): Point {
    const matrix = getElementToPageMatrix(element).inverse();
    return matrix.transformPoint(pagePoint);
}

/**
 * Преобразует точку из координат элемента в координаты страницы.
 * @param element Элемент DOM.
 * @param nodePoint Точка в координатах элемента.
 * @returns Точка в координатах страницы.
 */
function convertPointFromNodeToPage(element: Element, nodePoint: Point): Point {
    const matrix = getElementToPageMatrix(element);
    return matrix.transformPoint(nodePoint);
}

// Пример использования
/*const element = document.getElementById('myElement');
if (element) {
    const pagePoint = new DOMPoint(100, 200);
    const nodePoint = convertPointFromPageToNode(element, pagePoint);
    console.log('Координаты внутри элемента:', nodePoint);

    const backToPagePoint = convertPointFromNodeToPage(element, nodePoint);
    console.log('Возврат к координатам страницы:', backToPagePoint);
}*/