<template>
  <div class="menu-mobile">
    <div class="menu-mobile__bar">
      <div class="menu-mobile__title">
        <span class="menu-mobile__title-main">{{ currentMenuTitle }}</span>
        <!-- <span class="menu-mobile__title-sub">移动端菜单</span> -->
      </div>

      <el-button class="menu-mobile__trigger" circle @click="drawerVisible = true">
        <el-icon><Operation /></el-icon>
      </el-button>
    </div>

    <el-drawer
      v-model="drawerVisible"
      direction="ltr"
      size="84%"
      :with-header="false"
      class="menu-mobile__drawer"
    >
      <div class="menu-mobile__drawer-content">
        <div
          v-for="group in mobileMenuList"
          :key="group.value"
          class="menu-mobile__group"
        >
          <button
            class="menu-mobile__group-title"
            :class="{ 'is-active': String(group.value) === activeTopMenuValue }"
            type="button"
            @click="handleGroupClick(group)"
          >
            <el-icon class="menu-mobile__group-icon">
              <component :is="group.icon" />
            </el-icon>
            <span>{{ group.label }}</span>
          </button>

          <div v-if="group.children && group.children.length" class="menu-mobile__items">
            <button
              v-for="item in group.children"
              :key="item.value"
              class="menu-mobile__item"
              :class="{ 'is-active': String(item.value) === activeMenuValue }"
              type="button"
              @click="navigateByMenu(group, item)"
            >
              <el-icon class="menu-mobile__item-icon">
                <component :is="item.icon" />
              </el-icon>
              <span>{{ item.label }}</span>
            </button>
          </div>
        </div>
      </div>
    </el-drawer>
  </div>
</template>

<script setup>
import { computed, defineEmits, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Operation } from '@element-plus/icons-vue'
import { menu_mobile_config } from '@/common/config/menu_mobile_config'
import { menu_permission_config, resolveUserRoles } from '@/common/config/menu_permission_config'

const emit = defineEmits(['update-menu-value'])
const router = useRouter()
const route = useRoute()

const drawerVisible = ref(false)
const activeMenuValue = ref('')
const activeTopMenuValue = ref(String(localStorage.getItem('topMenuValue') || '1'))

const safeParseJson = (str) => {
  const text = String(str || '').trim()
  if (!text) return null

  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

const normalizePath = (path) => String(path || '').trim().split('?')[0]

const getRouteLocation = (path, source) => {
  const targetPath = String(path || '').trim()
  if (!targetPath) return ''
  if (targetPath !== '/DontHitTheSpike') return targetPath

  return {
    path: targetPath,
    query: {
      menuSource: source,
    },
  }
}

const mobileMenuList = computed(() => {
  const userInfoObj = safeParseJson(localStorage.getItem('userInfo')) || {}
  const user = userInfoObj?.user || {}
  const roles = resolveUserRoles(user)

  const canShow = (item) => {
    const rule = menu_permission_config?.[String(item?.value || '')]
    if (!rule) return true
    const allowed = Array.isArray(rule.roles) ? rule.roles : []
    if (!allowed.length) return true
    return roles.some((role) => allowed.includes(role))
  }

  return menu_mobile_config
    .map((group) => ({
      ...group,
      children: (Array.isArray(group?.children) ? group.children : []).filter(canShow),
    }))
    .filter((group) => {
      if (Array.isArray(group.children) && group.children.length > 0) return true
      return Boolean(String(group?.path || '').trim())
    })
})

const syncActiveMenuByRoute = () => {
  const currentPath = normalizePath(route.path)
  let matchedGroup = null
  let matchedItem = null

  mobileMenuList.value.some((group) => {
    const children = Array.isArray(group?.children) ? group.children : []
    const targetItem = children.find((item) => normalizePath(item?.path) === currentPath)
    if (targetItem) {
      matchedGroup = group
      matchedItem = targetItem
      return true
    }

    if (normalizePath(group?.path) === currentPath) {
      matchedGroup = group
      return true
    }

    return false
  })

  if (matchedGroup) {
    activeTopMenuValue.value = String(matchedGroup.value)
    localStorage.setItem('topMenuValue', activeTopMenuValue.value)
    emit('update-menu-value', activeTopMenuValue.value)
  }

  activeMenuValue.value = matchedItem ? String(matchedItem.value) : ''
}

const currentMenuTitle = computed(() => {
  const group = mobileMenuList.value.find((item) => String(item.value) === activeTopMenuValue.value)
  if (!group) return '菜单'

  if (!activeMenuValue.value) return group.label

  const child = (group.children || []).find((item) => String(item.value) === activeMenuValue.value)
  return child?.label || group.label
})

const navigateByMenu = (group, item) => {
  activeTopMenuValue.value = String(group.value)
  activeMenuValue.value = String(item.value)
  localStorage.setItem('topMenuValue', activeTopMenuValue.value)
  localStorage.setItem('activeLeftMenu', activeMenuValue.value)
  emit('update-menu-value', activeTopMenuValue.value)
  drawerVisible.value = false
  router.push(getRouteLocation(item.path, 'mobile'))
}

const handleGroupClick = (group) => {
  activeTopMenuValue.value = String(group.value)
  localStorage.setItem('topMenuValue', activeTopMenuValue.value)
  emit('update-menu-value', activeTopMenuValue.value)

  const children = Array.isArray(group?.children) ? group.children : []
  if (children.length > 0) {
    navigateByMenu(group, children[0])
    return
  }

  if (group?.path) {
    activeMenuValue.value = ''
    drawerVisible.value = false
    router.push(getRouteLocation(group.path, 'mobile'))
  }
}

watch(
  () => route.path,
  () => {
    syncActiveMenuByRoute()
  },
  { immediate: true }
)
</script>

<style lang="scss">
.menu-mobile {
  height: 64px;
  padding: 10px 12px 0;
  box-sizing: border-box;

  .menu-mobile__bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 54px;
    padding: 0 10px 0 16px;
    border: 1px solid rgba(198, 213, 225, 0.85);
    border-radius: 18px;
    background: linear-gradient(180deg, rgba(252, 254, 255, 0.98), rgba(239, 246, 252, 0.96));
    box-shadow: 0 10px 26px rgba(111, 144, 176, 0.1);
  }

  .menu-mobile__title {
    min-width: 0;
    display: flex;
    flex-direction: column;
  }

  .menu-mobile__title-main {
    font-size: 15px;
    font-weight: 700;
    color: #314255;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .menu-mobile__title-sub {
    margin-top: 2px;
    font-size: 12px;
    color: #7b90a4;
  }

  .menu-mobile__trigger {
    border: none;
    color: #2d5f90;
    background: rgba(160, 207, 255, 0.18);
  }
}

.menu-mobile__drawer {
  .el-drawer {
    background: linear-gradient(180deg, #f9fbff 0%, #eef5fb 100%);
  }

  .menu-mobile__drawer-content {
    padding: 18px 14px 28px;
  }

  .menu-mobile__group + .menu-mobile__group {
    margin-top: 14px;
  }

  .menu-mobile__group-title,
  .menu-mobile__item {
    width: 100%;
    display: flex;
    align-items: center;
    border: 0;
    text-align: left;
    cursor: pointer;
    box-sizing: border-box;
  }

  .menu-mobile__group-title {
    height: 46px;
    padding: 0 14px;
    border-radius: 16px;
    font-size: 14px;
    font-weight: 700;
    color: #38546f;
    background: rgba(255, 255, 255, 0.9);
    box-shadow: 0 8px 20px rgba(111, 144, 176, 0.08);
  }

  .menu-mobile__group-title.is-active {
    color: #2368a2;
    background: linear-gradient(135deg, #dcedff 0%, #eef7ff 100%);
  }

  .menu-mobile__items {
    margin-top: 10px;
    padding-left: 10px;
  }

  .menu-mobile__item {
    height: 42px;
    padding: 0 12px;
    border-radius: 14px;
    color: #506274;
    background: transparent;
  }

  .menu-mobile__item.is-active {
    color: #2368a2;
    background: rgba(160, 207, 255, 0.18);
  }

  .menu-mobile__group-icon,
  .menu-mobile__item-icon {
    margin-right: 10px;
    font-size: 18px;
  }
}
</style>
