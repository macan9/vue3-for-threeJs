<template>
	<div class="mark-editor">
		<el-button @click="printMdString" style="width:300px">打印value</el-button>
		<el-button @click="clearMdString" style="width:300px">清空缓存</el-button>
		<el-button @click="changeTheme" style="width:300px">切换主题</el-button>
		<div id="vditor" style="width: 60%;"></div>
		<div id="log"></div>
	</div>
</template>
<script setup>
	import { ref, onMounted } from "vue";
	import { uploadUserAvatarReq } from '@/apis/giteeApis.js'
	import { ElMessage } from 'element-plus'
	import Vditor from "vditor";
	import "vditor/dist/index.css";
	const contentEditor = ref("");
	/* 需要实现的功能 */
	/* 
	  1. 失去焦点时，做一个本地缓存 
	  2. 用户输入时，如果是图片，上传到图片服务器，并替换 svg 代码
	  3. 支持 将内容的 md 字符串存储在后台
	  4. 自定义主题 按钮
	*/
	const printMdString = ()=>{
		const value = contentEditor.value.getValue()
		localStorage.setItem('vditorCache',value)
		console.log(value,'---md value---')
	}
	const clearMdString = ()=>{
		localStorage.setItem('vditorCache','')
	}
	const changeTheme = ()=>{

	}
	// let oldValue = ""
	const upLoadToGitee = (file)=>{
		console.log(file,'---files---')
		const rawFile = file[0]
		const reader = new FileReader();
		reader.readAsBinaryString(rawFile);
		reader.onload = async () => {
			const binaryString = reader.result;
			const base64String = btoa(binaryString);

			console.log(base64String);
			await uploadUserAvatarReq(base64String,rawFile.name)
			ElMessage.success(`${rawFile.name}上传成功！`)
		};
	}
	onMounted(() => {
		const mdString = localStorage.getItem('vditorCache') || "hello,Vditor+Vue!"
		const logElement = document.getElementById('log')
		contentEditor.value = new Vditor("vditor", {
			height: 600,
			width: "60%",
			toolbarConfig: {
				pin: true,
			},
			cache: {
				enable: false,
			},
			upload: {
				accept: 'image/*,.mp3, .wav, .rar',
				max: 10*1024*1024,
				multiple: false,
				handler: async (files) => {
					upLoadToGitee(files)
				}
			},
			// 渲染完成的回调
			after: () => {
				contentEditor.value.setValue(mdString);
				logElement.innerText = '渲染完成'
			},
			ctrlEnter (md) {
				logElement.innerText = '用户按下了 Ctrl+Enter，Markdown 内容为：\n' + md
			},
			input (md) {
				logElement.innerText = '用户进行了输入，Markdown 内容为：\n' + md
			},
			blur (md) {
				logElement.innerText = '用户离开了编辑器，Markdown 内容为：\n' + md
			},
			select (md) {
				logElement.innerText = '用户选中了一段文字，内容为：\n' + md
			},
			focus (md) {
				logElement.innerText = '用户选中了编辑器，Markdown 内容为：\n' + md
				// oldValue = md
			},
			esc (md) {
				logElement.innerText = '用户按下了 ESC，Markdown 内容为：\n' + md
			},
		});
	});
</script>

<style lang="scss">
    .mark-editor{
		a {
			color: #42b983;
		}
		#vditor{
			
			margin: 0 auto;
		}
	}
</style>
  
  
