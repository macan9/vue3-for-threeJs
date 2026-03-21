export const MOBILE_BREAKPOINT = 768

export const detectMobileDevice = () => {
  if (typeof window === 'undefined') return false

  const ua = String(window.navigator?.userAgent || '')
  const isTouchDevice = /Android|iPhone|iPad|iPod|Windows Phone|Mobile/i.test(ua)
  return window.innerWidth <= MOBILE_BREAKPOINT || isTouchDevice
}

export const syncDeviceState = (store) => {
  const isMobile = detectMobileDevice()

  if (store?.commit) {
    store.commit('updateDeviceState', { isMobile })
  }

  localStorage.setItem('isMobile', String(isMobile))
  document.documentElement.setAttribute('data-device', isMobile ? 'mobile' : 'desktop')

  return isMobile
}

export const initDeviceState = (store) => {
  if (typeof window === 'undefined') return () => {}

  const update = () => syncDeviceState(store)
  update()

  window.addEventListener('resize', update, { passive: true })
  window.addEventListener('orientationchange', update, { passive: true })

  return update
}
