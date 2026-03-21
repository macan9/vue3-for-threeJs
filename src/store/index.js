import { createStore } from 'vuex'

const store = createStore({
  state() {
    return {
      loginStatus: false,
      userInfo: {},
      isMobile: false,
      deviceType: 'desktop'
    }
  },
  mutations: {
    updateLoginStatus(state) {
      state.loginStatus = !state.loginStatus
    },
    updateUserInfo(state,payload) {
      state.userInfo = payload
    },
    updateDeviceState(state, payload = {}) {
      const isMobile = Boolean(payload.isMobile)
      state.isMobile = isMobile
      state.deviceType = isMobile ? 'mobile' : 'desktop'
    }
  },
})

export default store
