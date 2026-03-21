<template>
    <div class="home-view-page user-table">
        <div class="home-view-title">
            <div class="page-title">用户管理</div>
        </div>

        <div class="user-main">
            <div class="user-header">
                <div class="header-search">
                    <el-input v-model="search" placeholder="输入用户名过滤" />
                </div>
                <div class="header-actions">
                    <el-button type="success" @click="handleAdd()">新增用户</el-button>
                    <el-button type="primary" @click="getUserData()">刷新列表</el-button>
                </div>
            </div>

            <div class="table-wrap">
                <el-table :data="filterTableData" height="100%" style="width: 100%">
                    <el-table-column label="用户名" prop="username" />
                    <el-table-column label="昵称" prop="nickname" />
                    <el-table-column label="邮箱" prop="email" width="200" />
                    <el-table-column label="手机号" prop="mobile" />
                    <el-table-column label="个性签名" prop="description" />
                    <el-table-column align="right" width="200">
                        <template #default="scope">
                            <el-button size="small" @click="handleEdit(scope.$index, scope.row)">
                                编辑
                            </el-button>
                            <el-button
                                size="small"
                                type="danger"
                                :disabled="isAdminUser(scope.row)"
                                @click="handleDelete(scope.$index, scope.row)"
                            >
                                删除
                            </el-button>
                        </template>
                    </el-table-column>
                </el-table>
            </div>
        </div>

        <div class="user-bottom"></div>

        <UserRegister @update-user-data="getUserData" :dialogVisible="dialogAddVisible"></UserRegister>

        <UserEdit
            v-if="dialogEditVisible.attr"
            :userId="userId"
            :dialogVisible="dialogEditVisible"
            @update-user-data="getUserData"
        >
        </UserEdit>
    </div>
</template>

<script lang="js" setup>
    import { userListGet, userDelete } from "@/apis/userApis.js"
    import { ensureApiSuccess } from '@/common/requests/requests.js'
    import { computed, ref, reactive } from 'vue'
    import { ElMessage, ElMessageBox } from 'element-plus'
    import UserRegister from '@/components/user/UserRegister.vue'
    import UserEdit from '../../components/user/UserEdit.vue'

    const search = ref('')
    const tableData = ref([]);
    const userId = ref('')
    let dialogAddVisible = reactive({attr:false})
    let dialogEditVisible = reactive({attr:false})

    const filterTableData = computed(() =>
        tableData.value.filter(
            (data) =>
                !search.value ||
                data.username.toLowerCase().includes(search.value.toLowerCase())
        )
    )

    const getUserData = async () => {
        try {
            const  { data } = await userListGet()
            tableData.value = Array.isArray(data) ? data : []
        } catch (e) {
            console.error('getUserData failed', e)
            tableData.value = []
        }
    }

    const handleEdit = (index, row) => {
        console.log(index, row)
        dialogEditVisible.attr = true
        userId.value = row.id
    }

    const isAdminUser = (row) => {
        const auth = row?.auth ?? row?.authority ?? row?.role
        return Number(auth) === 1
    }

    const handleDelete = async (index, row) => {
        console.log(index, row)
        if (isAdminUser(row)) {
            ElMessage.warning('管理员用户不允许删除')
            return
        }
        ElMessageBox.confirm('确定要删除该用户吗？', '首次确认', {
            confirmButtonText: '继续',
            cancelButtonText: '取消',
            type: 'warning',
        })
        .then(() => {
            return ElMessageBox.confirm(`请再次确认删除用户「${row?.username || row?.nickname || row?.id}」`, '二次确认', {
                confirmButtonText: '确认删除',
                cancelButtonText: '取消',
                type: 'error',
                confirmButtonClass: 'el-button--danger',
            })
        })
        .then(async () => {
            const res = await userDelete(row.id)
            ensureApiSuccess(res, '删除失败')
            ElMessage({
                message: '删除成功',
                type: 'success',
            })
            getUserData()
        })
        .catch(() => {
            // canceled
        })
    }

    const handleAdd = () => {
        dialogAddVisible.attr = true
    }

    getUserData()
</script>

<style lang="scss">
.user-table{
    height: 100%;
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 10px;

    .user-main{
        flex: 1;
        min-height: 0;
        display: flex;
        flex-direction: column;
        gap: 14px;
        padding: 15px;
    }

    .user-header{
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        padding: 4px 6px 0;
        flex-wrap: wrap;
    }

    .header-search {
        flex: 0 0 auto;
    }

    .header-actions {
        margin-left: auto;
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 10px;
        flex-wrap: wrap;
    }

    .table-wrap {
        flex: 1;
        min-height: 0;
        padding: 8px 6px 0;
    }

    .user-bottom {
        min-height: 16px;
    }

    :deep(.el-input) {
        width: 280px;
        max-width: 100%;
    }

    :deep(.el-table) {
        border-radius: 18px;
        overflow: hidden;
    }

    :deep(.el-table__inner-wrapper::before) {
        display: none;
    }

    @media (max-width: 900px) {
        .header-search {
            width: 100%;
        }

        .header-actions {
            margin-left: 0;
            width: 100%;
            justify-content: flex-end;
        }

        :deep(.el-input) {
            width: 100%;
        }
    }
}
</style>
