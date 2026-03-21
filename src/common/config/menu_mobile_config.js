import { menu_top_config } from '@/common/config/menu_top_config'
import { menu_left_config } from '@/common/config/menu_left_config'

const filterMobileVisibleMenus = (menus = []) => {
  return menus
    .filter((item) => !item?.moblieHide)
    .map((item) => ({
      ...item,
      children: Array.isArray(item?.children) ? filterMobileVisibleMenus(item.children) : item?.children,
    }))
}

export const menu_mobile_config = menu_top_config.map((topItem) => {
  const group = menu_left_config.find((item) => String(item?.pid) === String(topItem?.value))

  return {
    ...topItem,
    children: filterMobileVisibleMenus(Array.isArray(group?.children) ? group.children : []),
  }
})
