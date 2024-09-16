/**
 * Функция для получения полной цепочки родительских узлов элемента,
 * включая переходы через Shadow DOM, от самого элемента до <body> или <html>.
 * @param element Начальный элемент DOM.
 * @returns Массив элементов, представляющих цепочку предков.
 */
function getParentChain(element: Element): Element[] {
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
        if (current && (current.tagName.toLowerCase() === 'body' || current.tagName.toLowerCase() === 'html')) {
            parents.push(current as Element);
            break;
        }
    }

    return parents;
}
