<template>
    <el-dialog
      v-model="visible.attr"
      title="用户注册"
      width="480px"
      :before-close="handleClose"
      class="user-register-style"
    >
      <el-form :model="userForm" ref="userRuleFormRef" :rules="userRules" label-width="100px">
        <el-form-item label="用户名" prop="username">
          <el-input v-model="userForm.username" placeholder="请输入用户名" />
        </el-form-item>
        <el-form-item label="昵称" prop="nickname">
          <el-input v-model="userForm.nickname" placeholder="请输入昵称（可选）" />
        </el-form-item>
        <el-form-item label="手机号" prop="phone">
          <el-input v-model="userForm.phone" placeholder="请输入手机号（可选）" />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input type="password" v-model="userForm.password" placeholder="请输入密码" />
        </el-form-item>
        <el-form-item label="确认密码" prop="check_password">
          <el-input type="password" v-model="userForm.check_password" placeholder="请再次输入密码" />
        </el-form-item>
        <!-- <el-form-item label="用户权限" prop="role">
          <el-select v-model="userForm.role" placeholder="请选择用户类型">
            <el-option v-for="item in user_authority" :label="item.label" :value="item.value" :key="item.value"/>
          </el-select>
        </el-form-item> -->
        <el-form-item label="图形验证码" prop="captcha">
          <div class="captcha-row">
            <el-input v-model="userForm.captcha" placeholder="请输入验证码" />
            <img
              v-if="captchaImg"
              :src="captchaImg"
              alt="验证码"
              class="captcha-img"
              @click="loadCaptcha"
            />
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="closeDialog">取消</el-button>
          <el-button type="success" @click="registerUser(userRuleFormRef)">
            确认注册
          </el-button>
        </span>
      </template>
    </el-dialog>
</template>

<script lang="js" setup>
  import { defineProps, toRef, ref, reactive, watch } from 'vue'
  import { ElMessage, ElMessageBox } from 'element-plus'
  import { registerReq, getCaptcha } from '@/apis/userApis.js'
  // import { user_authority } from '@/common/plugins/user_config.js'
  
  

  const props = defineProps({
    dialogVisible: {
      type: Object,
      default: () => {},
    },
  });
  // toRef toRefs 会产生一个新的引用变量
  const visible = toRef(props,'dialogVisible')
  console.log(visible,'visible')

  const userForm = reactive({
    username: '',
    nickname: '',
    phone: '',
    password: '',
    check_password: '',
    role: '',
    description: '',
    captcha: '',
    captchaId: '',
  })

  const captchaImg = ref('')

  const loadCaptcha = async () => {
    // 直接用图片地址，添加时间戳防缓存
    const res = await getCaptcha()
    const payload = (res && res.data) ? res.data : res
    const nextCaptchaId = payload && payload.captchaId ? payload.captchaId : ''
    const svg = payload && payload.svg ? payload.svg : ''

    userForm.captchaId = nextCaptchaId
    userForm.captcha = ''
    captchaImg.value = svg ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}` : ''
  }
  
  const registerUser = async  (formEl) => {
    console.log(formEl,'formEl')
    if (!formEl) return
    await formEl.validate(async (valid, fields)=>{
      console.log(userRuleFormRef)
      if (valid) {
        console.log('submit!')
        // 校验通过，执行提交逻辑
        registerReq(userForm)
        ElMessage({
            message: '注册成功',
            type: 'success',
        })
        closeDialog()
      } else {
        console.log('error submit!', fields)
        // 校验不通过，提示错误信息 ...
      }
    })
  }

  const handleClose = (done) => {
    ElMessageBox.confirm('确定要关闭注册窗口吗？', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })
      .then(() => {
        done()
      })
      .catch(() => {
        // 用户点击取消，不做处理
      })
  }

  // const emit = defineEmits(['update-my-visible']);
  const closeDialog = () =>{
    visible.value.attr = false
    // emit('update-my-visible')
  }

  const userRuleFormRef = ref(null)
  const userRules = reactive({
    username: [
      { required: true, message: '请输入用户名', trigger: 'blur' },
      { min: 2, max: 16, message: '用户名长度应为 2-16 个字符', trigger: 'blur' },
    ],
    // 昵称、手机号为非必填，这里暂不做强校验；如需校验可按需补充
    password: [
      {
        required: true,
        message: '请输入密码',
        trigger: 'blur',
      },
    ],
    check_password: [
      {
        required: true,
        message: '请再次输入密码',
        trigger: 'blur',
      },
    ],
    captcha: [
      {
        required: true,
        message: '请输入图形验证码',
        trigger: 'blur',
      },
    ],
  })

  watch(
    () => visible.value.attr,
    (isOpen) => {
      if (isOpen) {
        loadCaptcha()
      }
    }
  )

  

</script>

<style lang="scss">
.dialog-footer button:first-child {
  margin-right: 10px;
}
.user-register-style{
  margin-top: 30vh;
  border-radius: 8px;

  .el-dialog__body {
    padding: 12px 0 20px;
  }

  .el-form {
    width: 100%;
    padding: 0 50px; // 左右各保留至少 50px 留白
  }

  .el-form-item__label {
    text-align: right;
    padding-right: 8px;
    color: #374151;
    font-size: 14px;
  }

  .captcha-row {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .captcha-img {
    height: 32px;
    border-radius: 4px;
    cursor: pointer;
    border: 1px solid #d1d5db;
  }
}
</style>
