// app.js
App({
  onLaunch: function () {
    if (wx.cloud) {
      wx.cloud.init({
        traceUser: true
      })
    }

    var loggedIn = wx.getStorageSync('health_logged_in')
    if (!loggedIn) {
      wx.navigateTo({
        url: '/pages/login/index'
      })
    }
  }
})
