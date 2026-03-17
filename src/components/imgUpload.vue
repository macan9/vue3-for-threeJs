<template>
    <div class="img-upload">
      <el-button class="img-upload-config" type="success" :icon="Plus" @click="openSettingPage">配置</el-button>
      <el-upload 
          class="el-upload-for-use"
          drag
          action="#"
          list-type="picture"
          :file-list="fileList"
          :before-upload="beforeAvatarUpload"
          :http-request="sendImgToBed"
      >
        <!-- <el-button type="success" :icon="Plus">新增</el-button> -->
        <div class="el-upload__text">
            拖拽文件到此处 <em>或者点击上传</em>
        </div>
        <template #file="{ file }">
          <div style="display:flex">
            <img class="el-upload-list__item-thumbnail" :src="file.download_url" alt="" />
            <div class="file__info">
              <div class="flie__info__name"> {{file.name}}</div>
              <span class="el-upload-list__item-actions">
                <span @click="handlePictureCardPreview(file)">
                  <el-icon><zoom-in /></el-icon>
                </span>
                <span @click="handleDownload(file)">
                  <el-icon><Download /></el-icon>
                </span>
                <span @click="handleRemove(file)">
                  <el-icon><Delete /></el-icon>
                </span>
                <span @click="handleCopy(file)">
                  <el-icon><CopyDocument /></el-icon>
                </span>
              </span>
            </div>
          </div>
        </template>
      </el-upload>

      <el-dialog v-model="preDialogVisible">
        <img w-full style="width: 100%;height: 100%;" :src="dialogImageUrl" alt="Preview Image" />
      </el-dialog>

      <GiteeSetting v-if="settingVisible.attr" :dialogVisible="settingVisible" @update-img-list="init"></GiteeSetting>
    </div>
</template>

<script setup>
    import { ref, reactive } from 'vue'
    import { ElMessage } from 'element-plus'
    import { Plus } from '@element-plus/icons-vue'
    import { uploadUserAvatarReq,getGiteeImgList,delGiteeImg } from '@/apis/giteeApis.js'
    import GiteeSetting from '@/components/GiteeSetting.vue'

    const dialogImageUrl = ref('')
    const preDialogVisible = ref(false)
    const fileList = ref([])
    const settingVisible = reactive({attr:false})
    const openSettingPage = () => {
      settingVisible.attr = true
    }

    const handleRemove = async (file) => {
      console.log(file)
      await delGiteeImg(file.sha,file.name)
      ElMessage.success(`${file.name}删除成功！`)
      init()
    }

    const handlePictureCardPreview = (file) => {
      dialogImageUrl.value = file.download_url
      preDialogVisible.value = true
    }

    const handleDownload = (file) => {
      console.log(file)
      const a = document.createElement('a');
      a.href = file.download_url;
      a.download = file.name; // 下载的图片文件名，可以根据实际情况修改
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      // downloadPicture(file.type, file.name, file.download_url)
    }

    // function downloadPicture(type, name, url) {
    //     var image = new Image()
    //     // 解决跨域 Canvas 污染问题
    //     image.setAttribute('crossOrigin', 'anonymous');

    //     image.src = url;
    //     image.onload = function () {
    //         // 创建一个canvas标签
    //         var canvas = document.createElement('canvas')
    //         // 设置canvas的宽高

    //         canvas.width = image.naturalWidth;
    //         canvas.height = image.naturalHeight;
    //         var context = canvas.getContext('2d')
    //         context.drawImage(image, 0, 0);

    //         // 把canvas的内容转化为base64格式
    //         var imageType = type === "png" ? "image/png" : "image/jpeg";
    //         var base64url = canvas.toDataURL(imageType)

    //         // 生成一个a元素
    //         var a = document.createElement('a');
    //         a.download = name || '文件下载'
    //         a.href = base64url
    //         // 创建一个单击事件
    //         var event = new MouseEvent('click');

    //         // 触发a的单击事件
    //         a.dispatchEvent(event)
    //     }
    // }

    const handleCopy = (file) => {
      const newText = '![img](' + file.download_url + ')';
      // 重写剪切板
      navigator.clipboard.writeText(newText)
        .then(function() {
          ElMessage.success(`${file.name}文件 md代码 已复制`)
        })
        .catch(function(err) {
          console.error("无法更新剪切板内容:", err);
        });
    }

    const beforeAvatarUpload = async (rawFile) => {
      if (rawFile.type !== 'image/jpeg' && rawFile.type !== 'image/png') {
          ElMessage.error('Avatar picture must be JPG or PNG format!')
          return false
      } else if (rawFile.size / 1024 / 1024 > 2) {
          ElMessage.error('Avatar picture size can not exceed 2MB!')
          return false
      }
      return true
    }

    const sendImgToBed = (options) => {
      console.log(options,'options')
      const rawFile = options.file
      const reader = new FileReader();
      reader.readAsBinaryString(rawFile);
      reader.onload = async () => {
        const binaryString = reader.result;
        const base64String = btoa(binaryString);

        console.log(base64String);
        await uploadUserAvatarReq(base64String,rawFile.name)
        ElMessage.success(`${rawFile.name}上传成功！`)
        init()
      };
      
    }

    const init = async () => {
      fileList.value = await getGiteeImgList()
    }

    init()

    
  
</script>
<style lang="scss">
.img-upload{
  height: 100%;
  position: relative;
  .img-upload-config{
      position: absolute;
      right: 10px;
      top: 10px;
    }
  .el-upload-for-use{
    height: 95%;
    margin: 0 auto;
    .el-upload--picture{
      width: 500px;
      margin: 0 auto;
    }
    
    .file__info{
      width: 300px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      margin-left: 15px;
      .flie__info__name{
        width: 100%;
        text-align: left;
        margin: 10px 0
      }
      .el-upload-list__item-actions{
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: space-between;
        >span{
          font-size: 23px;
          display: block;
          margin-right: 30px;
        }
        .el-icon{
          cursor: pointer;
        }
      }
    }
    .el-upload-list{
      height: calc(100% - 100px);
      overflow: auto;
      >li{
        width: 40%;
        min-width: 400px;
        margin: 10px auto;
      }
      
    }
  }
}
</style>

