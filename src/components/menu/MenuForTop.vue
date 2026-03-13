<template>
    <el-menu :default-active="activeIndex" class="el-menu-for-top" mode="horizontal" background-color="#ECF5FF"
        @select="handleSelect">
        <el-menu-item v-for="item in menu_top_config" :key="item.value" :index="item.value.toString()"
            @click="updateValue(item.value)">
            <el-icon>
                <component :is="item.icon" style="width: 20px; height:20px;" />
            </el-icon>
            <span>{{ item.label }}</span>
        </el-menu-item>

        <el-sub-menu index="99" class="position-left">
            <template #title>
                <el-icon>
                    <UserFilled />
                </el-icon>
                {{ username }}
            </template>
            <!-- <el-menu-item  index="99-1" @click="loginOut">用户编辑</el-menu-item> -->
            <el-menu-item class="el-menu-item-center" index="99-2" @click="loginOut">退出登录</el-menu-item>
        </el-sub-menu>

    </el-menu>
</template>

<script lang="js" setup>
// import { useStore } from 'vuex'
import { ref, defineEmits } from 'vue'
import { loginOut } from '@/common/plugins/user_manage_methods'

import { menu_top_config } from '@/common/config/menu_top_config'


// const store = useStore()

const menuVal = localStorage.getItem('topMenuValue')
const activeIndex = menuVal ? ref(menuVal) : ref('1')
// const username = store.state.userInfo.username

const emit = defineEmits(['update-menu-value']);
const updateValue = (val) => {
    emit('update-menu-value', val);
}
const handleSelect = () => {
    // console.log(key, keyPath)
}

const userInfo = localStorage.getItem('userInfo');
const username = JSON.parse(userInfo)?.user?.username


</script>

<style lang="scss">
.el-menu-for-top {
    position: relative;

    .position-left {
        position: absolute;
        right: 0;
        height: 100%;
    }
}

.el-popper {
    .el-menu--popup {
        min-width: 120px;
    }
    .el-menu-item-center{
        justify-content: center;
    }
}
</style>