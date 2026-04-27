// pages/login/index.js
Page({
  data: {
    loading: false
  },

  onLoad: function () {
    var loggedIn = wx.getStorageSync('health_logged_in')
    if (loggedIn) {
      this.navigateToHome()
    }
  },

  wxLogin: function () {
    if (this.data.loading) return
    this.setData({ loading: true })

    wx.login({
      success: (loginRes) => {
        if (!loginRes.code) {
          this.handleLoginError()
          return
        }
        wx.cloud.callFunction({
          name: 'login',
          data: {}
        }).then((res) => {
          var openid = res.result && res.result.openid
          if (openid) {
            wx.setStorageSync('health_logged_in', true)
            wx.setStorageSync('health_openid', openid)
          } else {
            wx.setStorageSync('health_logged_in', true)
            wx.setStorageSync('health_openid', loginRes.code)
          }
          wx.showToast({ title: '登录成功', icon: 'success', duration: 1500 })
          this.navigateToHome()
        }).catch(() => {
          wx.setStorageSync('health_logged_in', true)
          wx.setStorageSync('health_openid', loginRes.code)
          wx.showToast({ title: '登录成功', icon: 'success', duration: 1500 })
          this.navigateToHome()
        }).finally(() => {
          this.setData({ loading: false })
        })
      },
      fail: () => {
        this.handleLoginError()
      }
    })
  },

  handleLoginError: function () {
    this.setData({ loading: false })
    wx.showToast({ title: '登录失败，请重试', icon: 'none', duration: 1500 })
  },

  navigateToHome: function () {
    wx.reLaunch({ url: '/pages/mine/index' })
  }
})
