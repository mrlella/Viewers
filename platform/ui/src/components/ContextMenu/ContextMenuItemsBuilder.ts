import { Types } from '@ohif/ui';
import Menu from './types';

/**
 * Context menu items builder is a collection of classes to help determine
 * which context menu to show, based on a set of properties.
 */
// menus category to be skipped when doing a depth search.
const menuCategoryBlacklist = ['history'];

/**
 * Finds menu by menu id
 * It is usually used for submenu cases.
 *
 * @param {Object[]} menus List of menus.
 * @param {string} menuId
 * @returns
 */
export function findMenuByMenuId(menus, menuId): Menu {
  if (!menuId) {
    return;
  }

  return menus.find(menu => menu.id === menuId);
}

/**
 * Default finding menu method.
 *
 * @param {Object[]} menus List of menus
 * @param {*} subProps
 * @returns
 */
export function findMenuDefault(menus: Menu[], subProps: Types.IProps): Menu {
  if (!menus) {
    return null;
  }
  return menus.find(
    menu => !menu.selector || menu.selector(subProps.checkProps)
  );
}

/**
 * Finds the menu to be used for different scenarios:
 * 1. In case on any leaf menu (submenu)
 * 2. In case on root menu
 *
 * @param {Object[]} menus List of menus
 * @param {Object} props root props
 * @param {Object} props sub
 * @param {string} [menuIdFilter] menu id identifier (to be considered on selection)
 * @returns
 */
export function findMenu(
  menus: Menu[],
  props?: Types.IProps,
  menuIdFilter?: string
) {
  const { subMenu } = props;

  function* findMenuIterator() {
    yield findMenuByMenuId(menus, menuIdFilter || subMenu);
    yield findMenuDefault(menus, props);
  }

  const findIt = findMenuIterator();

  let current = findIt.next();
  let menu = current.value;

  while (!current.done) {
    menu = current.value;

    if (menu) {
      findIt.return();
    }
    current = findIt.next();
  }

  console.log('Menu chosen', menu?.id || 'NONE');

  return menu;
}

/**
 * Returns the menu from a list of possible menus, based on the actual state of component props and tool data nearby.
 *
 * @param checkProps
 * @param {*} event event that originates the context menu
 * @param {*} menus List of menus
 * @param {*} menuIdFilter
 * @returns
 */
export function getMenuItems(
  checkProps: Types.IProps,
  event,
  menus,
  menuIdFilter
) {
  // Include both the check props and the ...check props as one is used
  // by the child menu and the other used by the selector function
  const subProps = { checkProps, event };

  const menu = findMenu(menus, subProps, menuIdFilter);

  if (!menu) {
    return undefined;
  }

  if (!menu.items) {
    console.warn('Must define items in menu', menu);
    return [];
  }

  let menuItems = [];
  menu.items.forEach(item => {
    const { delegating, checkFunction, subMenu } = item;

    if (!checkFunction || checkFunction(checkProps)) {
      if (delegating) {
        menuItems = [
          ...menuItems,
          ...getMenuItems(checkProps, event, menus, subMenu),
        ];
      } else {
        const toAdd = adaptItem(item, subProps);
        menuItems.push(toAdd);
      }
    }
  });

  return menuItems;
}

/**
 * Returns item adapted to be consumed by ContextMenu component
 *
 * @param {Object} item
 * @param {Object} subProps
 * @returns
 */
export function adaptItem(item, subProps: Types.IProps = {}) {
  const newItem = item.adaptItem?.(item, subProps) || {
    ...item,
    value: subProps.checkProps?.value,
  };

  if (!item.action) {
    newItem.action = (itemRef, componentProps) => {
      const { event = {} } = componentProps;
      const { detail = {} } = event;
      newItem.element = detail.element;

      componentProps.onClose();
      const action = componentProps[`on${itemRef.actionType || 'Default'}`];
      if (action) {
        action.call(componentProps, newItem, itemRef, subProps);
      } else {
        console.warn('No action defined for', itemRef);
      }
    };
  }

  return newItem;
}
