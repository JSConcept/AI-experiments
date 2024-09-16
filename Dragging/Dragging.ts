// Импортируем необходимые типы
interface DragState {
  initialX: number;
  initialY: number;
  clientXOnStart: number;
  clientYOnStart: number;
  pointerId: number;
  timerId: number;
}

// Используем WeakMap для хранения состояния каждого элемента
const dragStateMap = new WeakMap<Element, DragState>();

// Ключ для хранения состояния в элементе (Symbol для уникальности)
const dragStateKey = Symbol('dragState');

// Функция для получения текущего зума элемента
function getCurrentZoom(element: Element): number {
  return (element as any).currentCSSZoom || 1;
}

// Обработчик начала перетаскивания
function onPointerDown(event: PointerEvent) {
  const target = event.target as HTMLElement;

  if (!target.classList.contains('draggable')) return;

  event.preventDefault();

  // Запускаем таймер на 100ms для инициации перетаскивания
  const timerId = window.setTimeout(() => {
    target.setPointerCapture(event.pointerId);

    // Получаем текущие значения transform
    const style = getComputedStyle(target);
    const transform = new DOMMatrixReadOnly(style.transform);
    const initialX = transform.m41; // Сдвиг по X
    const initialY = transform.m42; // Сдвиг по Y

    const state: DragState = {
      initialX,
      initialY,
      clientXOnStart: event.clientX,
      clientYOnStart: event.clientY,
      pointerId: event.pointerId,
      timerId: 0, // Таймер уже сработал, можно обнулить
    };

    dragStateMap.set(target, state);
  }, 100); // 100ms задержка

  // Сохраняем timerId, чтобы можно было его очистить при отмене
  const state: DragState = {
    initialX: 0,
    initialY: 0,
    clientXOnStart: event.clientX,
    clientYOnStart: event.clientY,
    pointerId: event.pointerId,
    timerId,
  };

  dragStateMap.set(target, state);
}

function onPointerMove(event: PointerEvent) {
  const target = event.target as HTMLElement;

  const state = dragStateMap.get(target);
  if (!state) return;

  // Если перетаскивание не инициализировано (таймер не сработал), игнорируем
  if (!target.hasPointerCapture(event.pointerId)) return;

  event.preventDefault();

  const zoom = getCurrentZoom(document.documentElement);

  // Корректировка с учетом прокрутки и зума
  const deltaX = (event.clientX - state.clientXOnStart) / zoom;
  const deltaY = (event.clientY - state.clientYOnStart) / zoom;

  // Обновляем CSS-переменные
  target.style.setProperty('--drag-x', `${state.initialX + deltaX}`);
  target.style.setProperty('--drag-y', `${state.initialY + deltaY}`);
}

function onPointerUp(event: PointerEvent) {
  const target = event.target as HTMLElement;

  const state = dragStateMap.get(target);
  if (!state) return;

  // Если таймер еще не сработал, отменяем его
  if (state.timerId) {
    clearTimeout(state.timerId);
  }

  if (target.hasPointerCapture(event.pointerId)) {
    target.releasePointerCapture(event.pointerId);
  }

  dragStateMap.delete(target);

  // Привязка к сетке и анимация
  const style = getComputedStyle(target);
  const currentX = parseFloat(style.getPropertyValue('--drag-x'));
  const currentY = parseFloat(style.getPropertyValue('--drag-y'));

  // Округляем до ближайших 50px (например, привязка к сетке)
  const gridSize = 50;
  const snappedX = Math.round(currentX / gridSize) * gridSize;
  const snappedY = Math.round(currentY / gridSize) * gridSize;

  // Анимировано обновляем координаты
  target.style.setProperty('--drag-x', `${snappedX}`);
  target.style.setProperty('--drag-y', `${snappedY}`);
}

// Добавляем обработчики событий
document.addEventListener('pointerdown', onPointerDown);
document.addEventListener('pointermove', onPointerMove);
document.addEventListener('pointerup', onPointerUp);
