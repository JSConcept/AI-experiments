import { Matrix3x3, Point } from "./Matrix.ts";

/**
 * Разбирает строку transform-origin и возвращает координаты в пикселях.
 * @param origin Строка transform-origin.
 * @param element Элемент DOM.
 * @returns Кортеж [originX, originY].
 */
export function parseOrigin(origin: string, element: Element): Point {
    const values = origin.split(' ');
    const x = parseLength(values[0], element.clientWidth);
    const y = parseLength(values[1], element.clientHeight);
    return new DOMPoint(x, y);
}

//
export function parseTransformWithOrigin(transform: string, transformOrigin: string, element: Element): Matrix3x3 {
    // Парсим transform как ранее
    const transformMatrix = parseTransform(transform);

    // Парсим transform-origin
    const origin = parseOrigin(transformOrigin, element);

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

// Функция для разбора строки transform и получения матрицы
export function parseTransform(transform: string): Matrix3x3 {
    // Упрощённый парсер, поддерживающий только matrix и matrix3d
    const matrixRegex = /matrix\(([^)]+)\)/;
    const matrix3dRegex = /matrix3d\(([^)]+)\)/;

    //
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
                values[2], values[6], values[14]
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

/**
 * Разбирает значение длины и возвращает его в пикселях.
 * @param value Строка длины (например, '50%', '10px').
 * @param size Относительный размер (ширина или высота элемента).
 * @returns Значение в пикселях.
 */
export function parseLength(value: string, size: number): number {
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
 * Функция для получения полной цепочки родительских узлов элемента,
 * включая переходы через Shadow DOM, от самого элемента до <body> или <html>.
 * @param element Начальный элемент DOM.
 * @returns Массив элементов, представляющих цепочку предков.
 */
export function getParentChain(element: Element): Element[] {
    const parents: Element[] = [];
    let current: Node | null = element;
    while (current) {
        if (current.parentElement) {
            // Если текущий элемент имеет родителя в обычном DOM
            parents.push(current.parentElement);
            current = current.parentElement;
        } else if (current instanceof ShadowRoot) {
            // Если текущий узел является ShadowRoot, переход к его хосту
            const host = current.host;
            if (host) {
                parents.push(host);
                current = host;
            } else {
                // Если ShadowRoot не имеет хоста, заканчиваем цикл
                current = null;
            }
        } else if (current.parentNode) {
            // Обработка других типов родительских узлов, если необходимо
            parents.push(current.parentNode as Element);
            current = current.parentNode;
        } else {
            // Если нет родительских узлов, заканчиваем цикл
            current = null;
        }

        // Опционально: остановка при достижении <body> или <html>
        if (current && (current instanceof HTMLBodyElement || current instanceof HTMLHtmlElement)) {
            parents.push(current as Element);
            break;
        }
    }
    return parents;
}

/**
 * Получает текущий zoom элемента, учитывая новые стандарты.
 * @param element Элемент DOM.
 * @returns Значение zoom.
 */
//
export function getElementZoom(element: Element): number {
    let zoom = 1;
    let currentElement: Element | null = element;

    //
    while (currentElement) {
        // Проверяем наличие текущего CSS Zoom (новый стандарт)
        if ('currentCSSZoom' in (currentElement as any)) {
            const currentCSSZoom = (currentElement as any).currentCSSZoom;
            if (typeof currentCSSZoom === 'number') {
                zoom *= currentCSSZoom;
                return zoom; // why not skipped here?!
            }
        }

        // Проверяем старое свойство zoom через стили
        const style = getComputedStyle(currentElement);
        if (style.zoom && style.zoom !== 'normal') {
            zoom *= parseFloat(style.zoom);
            return zoom; // don't over...
        }

        // Если zoom был установлен явно, прекращаем поиск в родителях
        if ((style.zoom && style.zoom !== 'normal') || 'currentCSSZoom' in (currentElement as any)) {
            return zoom; // don't extra computations...
        }

        // Переходим к родительскому элементу для наследования zoom
        currentElement = currentElement.parentElement;
    }

    //
    return zoom;
}

