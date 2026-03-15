<template>
    <el-menu
        :default-active="activeIndex"
        class="el-menu-for-top"
        mode="horizontal"
        background-color="#ECF5FF"
        @select="handleSelect"
    >
        <el-menu-item
            v-for="item in menu_top_config"
            :key="item.value"
            :index="item.value.toString()"
            @click="onTopMenuClick(item)"
        >
            <el-icon>
                <component :is="item.icon" style="width: 20px; height:20px;" />
            </el-icon>
            <span>{{ item.label }}</span>
        </el-menu-item>

        <el-sub-menu index="99" class="position-left">
            <template #title>
                <el-avatar :size="28" :src="avatarDisplayUrl" class="user-avatar" @error="handleAvatarError">
                    <el-icon>
                        <UserFilled />
                    </el-icon>
                </el-avatar>
                <span class="user-name">{{ displayName }}</span>
            </template>
            <el-menu-item class="el-menu-item-center" index="99-1" @click="openUserProfile">个人信息</el-menu-item>
            <el-menu-item class="el-menu-item-center" index="99-2" @click="loginOut">退出登录</el-menu-item>
        </el-sub-menu>
    </el-menu>

    <UserEdit v-if="userId" :dialogVisible="userEditDialog" :userId="userId" @update-user-data="refreshUserInfo" />
</template>

<script lang="js" setup>
import { ref, reactive, defineEmits, watch, computed } from 'vue'
import { UserFilled } from '@element-plus/icons-vue'
import { loginOut } from '@/common/plugins/user_manage_methods'
import { useRouter } from 'vue-router'
import { userInfoGet } from '@/apis/userApis.js'
import { globals_config } from '/public/config/globals_config'
import UserEdit from '@/views/userManage/UserEdit.vue'
import { menu_top_config } from '@/common/config/menu_top_config'

const menuVal = localStorage.getItem('topMenuValue')
const activeIndex = menuVal ? ref(menuVal) : ref('1')

const emit = defineEmits(['update-menu-value'])
const router = useRouter()

const onTopMenuClick = (item) => {
    const nextVal = String(item?.value ?? '')
    if (!nextVal) return

    activeIndex.value = nextVal
    localStorage.setItem('topMenuValue', nextVal)
    emit('update-menu-value', nextVal)

    const path = String(item?.path || '').trim()
    if (path) router.push(path)
}
const handleSelect = () => { }

const userEditDialog = reactive({ attr: false })

const userId = ref('')
const username = ref('')
const nickname = ref('')
const avatarUrl = ref('')
const avatarDisplayUrl = ref('')
const displayName = computed(() => nickname.value || username.value || '')

const safeParseJson = (str) => {
    const s = String(str || '').trim()
    if (!s) return null
    try {
        return JSON.parse(s)
    } catch {
        return null
    }
}

const normalizeAvatarUrl = (url) => {
    const u = String(url || '').trim()
    if (!u) return ''
    if (u.startsWith('http://') || u.startsWith('https://') || u.startsWith('data:') || u.startsWith('blob:')) return u

    const base = String(globals_config?.host_service || '').replace(/\/+$/, '')
    if (!base) return u
    if (u.startsWith('/')) return `${base}${u}`
    return `${base}/${u}`
}

const buildAvatarDisplayUrl = (url) => {
    const u = String(url || '').trim()
    if (!u) return ''
    if (u.startsWith('data:') || u.startsWith('blob:')) return u
    const sep = u.includes('?') ? '&' : '?'
    return `${u}${sep}_t=${Date.now()}`
}

const loadUserFromStorage = () => {
    const userInfoObj = safeParseJson(localStorage.getItem('userInfo')) || {}
    const u = userInfoObj?.user || {}
    userId.value = String(u?.id || '')
    username.value = String(u?.username || '')
    nickname.value = String(u?.nickname || '')
    avatarUrl.value = normalizeAvatarUrl(u?.avatar || u?.avatarUrl || u?.avatar_url || '')
}

const refreshUserInfo = async () => {
    loadUserFromStorage()
    if (!userId.value) return

    try {
        const res = await userInfoGet(userId.value)
        const nextUser = res?.data || {}

        username.value = String(nextUser?.username || username.value || '')
        nickname.value = String(nextUser?.nickname || nickname.value || '')
        avatarUrl.value = normalizeAvatarUrl(nextUser?.avatar || nextUser?.avatarUrl || nextUser?.avatar_url || '')

        const userInfoObj = safeParseJson(localStorage.getItem('userInfo')) || {}
        userInfoObj.user = { ...(userInfoObj.user || {}), ...(nextUser || {}) }
        localStorage.setItem('userInfo', JSON.stringify(userInfoObj))
    } catch (e) {
        console.error('refreshUserInfo failed', e)
        loadUserFromStorage()
    }
}

const openUserProfile = () => {
    loadUserFromStorage()
    if (!userId.value) return
    userEditDialog.attr = true
}

const handleAvatarError = () => {
    avatarUrl.value = ''
    avatarDisplayUrl.value = ''
}

watch(
    avatarUrl,
    () => {
        avatarDisplayUrl.value = buildAvatarDisplayUrl(avatarUrl.value)
    },
    { immediate: true }
)

refreshUserInfo()
</script>

<style lang="scss">
.el-menu-for-top {
    position: relative;

    .position-left {
        position: absolute;
        right: 0;
        height: 100%;
    }

    .user-avatar {
        margin-right: 8px;
        vertical-align: middle;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        text-align: center;

        .el-icon {
            width: 100%;
            height: 100%;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            line-height: 1;
            font-size: 18px;
        }

        svg {
            width: 18px;
            height: 18px;
        }
    }

    .el-sub-menu .el-icon {
        margin-right: 0;
    }

    .user-name {
        vertical-align: middle;
    }
}

.el-popper {
    .el-menu--popup {
        min-width: 120px;
    }

    .el-menu-item-center {
        justify-content: center;
    }
}
</style>
