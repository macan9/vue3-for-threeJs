<template>
    <el-dialog
    v-model="visible.attr"
    title="用户编辑"
    width="80%"
    :before-close="handleClose"
    :modal="false"
    class="user-edit-style"
  >
    <el-form :model="userForm" ref="userRuleFormRef" :rules="userRules" label-width="120px">
      <el-form-item label="用户名" prop="username">
        <el-input v-model="userForm.username" style="width: 200px"/>
      </el-form-item>
      <el-form-item label="昵称" prop="nickname">
        <el-input v-model="userForm.nickname" style="width: 200px"/>
      </el-form-item>
      <!-- <el-form-item label="新密码" prop="password">
        <el-input type="password" v-model="userForm.password" style="width: 200px" />
      </el-form-item>
      <el-form-item label="确认密码" prop="password">
        <el-input type="password" v-model="userForm.check_password" style="width: 200px" />
      </el-form-item> -->
      <el-form-item label="邮箱" prop="email">
        <el-input v-model="userForm.email" style="width: 200px" />
      </el-form-item>
      <el-form-item label="手机号" prop="mobile">
        <el-input v-model="userForm.mobile" style="width: 200px" />
      </el-form-item>
      <el-form-item label="个性签名" prop="mobile">
        <el-input v-model="userForm.description" type="textarea" style="width: 300px" />
      </el-form-item>

      <el-form-item label="用户权限" prop="role">
        <el-select v-model="userForm.role" placeholder="请选择用户类型">
          <el-option v-for="item in user_authority" :label="item.label" :value="item.value" :key="item.value"/>
        </el-select>
      </el-form-item>
    </el-form>
    <template #footer>
      <span class="dialog-footer">
        <el-button type="primary" round @click="closeDialog" >取消</el-button>
        <el-button type="success" round @click="registerUser(userRuleFormRef)" >
            确认修改
        </el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script lang="js" setup>
  import { defineProps, toRef, ref,reactive,defineEmits} from 'vue'
  import { ElMessage, ElMessageBox } from 'element-plus'
  import { userInfoGet, userInfoPut } from '@/apis/userApis.js'
  import { user_authority } from '@/common/plugins/user_config.js'

  
  
  const props = defineProps({
    dialogVisible: {
      type: Object,
      default: () => {},
    },
    userId: {
      type:String,
      default:''
    }
  });
  const visible = toRef(props,'dialogVisible')
  const userId = toRef(props,'userId')
  console.log(visible,'visible')


  let userForm = reactive({})
  let userOldData = {}
  const getUserInfo = async() => {
    const { data } = await userInfoGet(userId.value)
    userOldData = data
    Object.assign(userForm, data);
  }

  const handleClose = (done) => {
    ElMessageBox.confirm('确定要关闭编辑窗口吗？', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })
      .then(() => {
        done()
      })
      .catch(() => {
        // 用户取消关闭
      })
  }

  const emit = defineEmits(['update-user-data']);
  const closeDialog = () =>{
    emit('update-user-data')
    visible.value.attr = false
  }

  const userRuleFormRef = ref(null)

  const userRules = reactive({
    username: [
      { required: true, message: '请输入用户名', trigger: 'blur' },
      { min: 2, max: 16, message: '用户名长度应为 2-16 个字符', trigger: 'blur' },
    ],
  })

  const registerUser = async  (formEl) => {
    console.log(formEl,'formEl')
    if (!formEl) return
    await formEl.validate(async (valid, fields)=>{
      console.log(userRuleFormRef)
      if (valid) {
        console.log('submit!')
        // 对比 userOldData 和 userForm 的不同项
        const newData = findDifProperties(userOldData,userForm)
        await userInfoPut(userId.value,newData)

        ElMessage({
            message: '修改成功',
            type: 'success',
        })
        closeDialog()
      } else {
        console.log('error submit!', fields)
        // 校验不通过，提示错误信息
        // ...
      }
    })
  }

  const findDifProperties = (o,u) => {
    const diffObj = {};

    for (let key in u) {
        if (Object.prototype.hasOwnProperty.call(o, key) && o[key] !== u[key]) {
        diffObj[key] = u[key];
        }
    }

    return diffObj;
  }

  getUserInfo()

</script>

<style lang="scss">
.dialog-footer button:first-child {
  margin-right: 10px;
}
.user-edit-style{
    margin-top: 15vh;
    border-radius: 5px;
  .el-form{
    width: 400px;
    margin: 0 auto;
  }
  .el-input{
    width: 200px;
  }
}
</style>