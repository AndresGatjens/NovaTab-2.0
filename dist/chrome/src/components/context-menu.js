import { el } from '../utils/dom.js';

/** Menú contextual personalizado (clic derecho sobre tarjetas). */
let currentMenu = null;

export function showContextMenu(items, x, y, anchor) {
  hideContextMenu();
  const menu = el('div', 'context-menu');
  menu.setAttribute('role', 'menu');
  menu.setAttribute('aria-label', 'Menú contextual');
  menu.style.left = '0px';
  menu.style.top = '0px';

  for (const item of items) {
    if (!item) continue;
    if (item.separator) {
      menu.appendChild(el('div', 'context-sep'));
      continue;
    }
    const btn = el('button', 'context-item');
    btn.type = 'button';
    btn.setAttribute('role', 'menuitem');
    btn.textContent = item.label;
    if (item.danger) btn.classList.add('danger');
    if (item.submenu) {
      btn.className += ' has-sub';
      const sub = el('div', 'context-menu sub');
      for (const subItem of item.submenu) {
        if (!subItem) continue;
        if (subItem.separator) {
          sub.appendChild(el('div', 'context-sep'));
          continue;
        }
        const subBtn = el('button', 'context-item');
        subBtn.type = 'button';
        subBtn.textContent = subItem.label;
        if (subItem.danger) subBtn.classList.add('danger');
        subBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          hideContextMenu();
          subItem.onClick();
        });
        sub.appendChild(subBtn);
      }
      btn.appendChild(sub);
    }
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      hideContextMenu();
      item.onClick();
    });
    menu.appendChild(btn);
  }

  document.body.appendChild(menu);
  currentMenu = menu;

  const rect = menu.getBoundingClientRect();
  const maxX = window.innerWidth - rect.width - 8;
  const maxY = window.innerHeight - rect.height - 8;
  const px = Math.max(4, Math.min(x, maxX));
  const py = Math.max(4, Math.min(y, maxY));
  menu.style.left = `${px}px`;
  menu.style.top = `${py}px`;
  menu.style.opacity = 1;

  setTimeout(() => {
    document.addEventListener('mousedown', onDocMouse, true);
    document.addEventListener('keydown', onKey);
    menu.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      hideContextMenu();
    });
  }, 0);
}

function onDocMouse(e) {
  if (currentMenu && !currentMenu.contains(e.target)) hideContextMenu();
}

function onKey(e) {
  if (e.key === 'Escape') hideContextMenu();
}

export function hideContextMenu() {
  if (currentMenu) {
    currentMenu.remove();
    currentMenu = null;
    document.removeEventListener('mousedown', onDocMouse, true);
    document.removeEventListener('keydown', onKey);
  }
}