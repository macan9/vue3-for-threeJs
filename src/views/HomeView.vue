<template>
  <div class="home">

    <MenuForTop @update-menu-value="setTopMenuValue" />

    <div class="display-flex-main">

      <MenuForLeft :topMenuValue="topMenuValue" />

      <div class="main-display" :class="hasPadding?'main-display-padding':''">
        <router-view/>
      </div>
      
    </div>
    
  </div>
</template>

<script>
// @ is an alias to /src
import MenuForTop from '@/components/menu/MenuForTop.vue'
import MenuForLeft from '@/components/menu/MenuForLeft.vue'
import { ref, watch } from 'vue';
import { useRoute } from 'vue-router';


export default {
  name: 'HomeView',
  components: {
    MenuForTop,
    MenuForLeft,
  },
  setup(){

    const menuVal = localStorage.getItem('topMenuValue')
    const topMenuValue = menuVal ? ref(menuVal) : ref('1')

	// const topMenuValue =  ref('1')

    const setTopMenuValue = (val) => {
      topMenuValue.value = val
    }

    watch(() => topMenuValue.value, () => {
        localStorage.setItem('topMenuValue',topMenuValue.value)
    });

    const route = useRoute();
    const hasPadding = ref(true)
    const noPaddingRoutes = ['/LeafletMap','/ThreeGuiBase','/ThreePlanet']

    watch(
      () => route.path,
      (newPath) => {
        // console.log(currentRoute.value,'currentRoute.value')
        // 判断当为二维，三维场景的时候  hasPadding = false
        judgePadding(newPath)
      }
    );
    const judgePadding = (newPath)=> {
      if(noPaddingRoutes.indexOf(newPath) > -1){
          hasPadding.value = false 
        }else{
          hasPadding.value = true
        }
    }




    const getMockData = () => {
    }

    judgePadding(route.path)

    return {
      topMenuValue,
      hasPadding,
      getMockData,
      setTopMenuValue,
    };
  }
}
</script>
<style lang="scss">
.home{
  height: 100%;
  .display-flex-main{
    height: calc(100% - 60px);
    display: flex;
  }
  .main-display{
    width: calc(100% - 130px);
    
  }
  .main-display-padding{
    padding: 10px;
    background: rgb(240, 240, 240);
  }
  // 子页面样式1 公共样式, 后续独立出来
  .home-view-page{
    border: 1px solid gainsboro;
    border-radius: 5px;
    box-shadow: 2px 2px 8px gray;
    height: 100%;
    background: #fff;
    .home-view-title{
      display: flex;
      align-items: center;
      position: relative;
      height: 45px;
      font-size: 18px;
      border-bottom: 1px solid #ccc;
      .page-title{
        padding-left: 25px;
        font-weight: bold;
        color: rgb(90, 88, 88);
      }
      .page-title::before {
        content: "";
        position: absolute;
        top: 0;
        left: -1px; /* 负 margin 值为正方形边长的一半 */
        width: 15px; /* 正方形边长 */
        height: 100%; /* 正方形边长 */
        background-color: #a0cfff;
      }
    }
    
  }
}
</style>
