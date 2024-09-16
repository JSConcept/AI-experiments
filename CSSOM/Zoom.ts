function getElementZoom_O1Mini(element: Element): number {
    let zoom = 1;
    let currentElement: Element | null = element;

    //
    while (currentElement) {
        // Проверяем наличие текущего CSS Zoom (новый стандарт)
        if ('currentCSSZoom' in (currentElement as any)) {
            const currentCSSZoom = (currentElement as any).currentCSSZoom;
            if (typeof currentCSSZoom === 'number') {
                zoom *= currentCSSZoom;
            }
        }

        // Проверяем старое свойство zoom через стили
        const style = getComputedStyle(currentElement);
        if (style.zoom && style.zoom !== 'normal') {
            zoom *= parseFloat(style.zoom);
        }

        // Если zoom был установлен явно, прекращаем поиск в родителях
        if ((style.zoom && style.zoom !== 'normal') || 'currentCSSZoom' in (currentElement as any)) {
            break;
        }

        // Переходим к родительскому элементу для наследования zoom
        currentElement = currentElement.parentElement;
    }

    //
    return zoom;
}

//
function getElementZoom_Fixed(element: Element): number {
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
