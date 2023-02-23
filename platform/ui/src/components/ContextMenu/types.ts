import { Types } from '@ohif/core';
import { Predicate } from '../../types/Predicate';

/**
 * A MenuEntry is a single line item within a menu, and specifies a selectable
 * value for the menu.
 */
export interface MenuEntry {
  id?: string;
  // The uiType can be used to specify inheriting values from another
  // registered customization so that the display of the item can be customzied
  // or managed.
  uiType?: string;
  // The label is the value to show in the menu for this item
  label?: string;
  // Some menu entries use a separate code value to define some of the
  // attributes, which are shared between multiple uses of that attribute.
  code?: string;
  // The ref is filled out with the actual menu item chosen
  ref?: Record<string, unknown>;
  // Delegating items are used to include other sub-menus inline within
  // this menu.  That allows sharing part of the menu structure.
  delegating?: boolean;
  // A sub-menu is shown when this item is selected.  This item gives the
  // name of the sub-menu.
  subMenu?: string;
  // The checkFunction is used to determine if this menu entry will be shown
  // or more importantly, if the delegating subMenu will be included.
  checkFunction?: Predicate;

  commands?: Types.Command[];
}

/**
 * A menu is a list of menu items, plus a selector.
 * The selector is used to determine whether the menu should be displayed
 * in a given context.  The parameters passed to the selector come from
 * the 'checkProps' value in the options, and are intended to be context
 * specific values containing things like the selected object, the currently
 * displayed study etc so that the context menu can dynamically choose which
 * view to show.
 */
export interface Menu {
  id: string;
  // The entire menu content value can be chosen by selecting an alternate
  // uiType.
  uiType?: string;
  // Choose whether this menu applies.
  selector?: Types.Predicate;

  items: MenuEntry[];
}

export type Point = {
  x: number;
  y: number;
};
