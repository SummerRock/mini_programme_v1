// pages/test/index.js
Page({

  /**
   * 页面的初始数据
   */
  data: {

  },

  onMainOpClick() {
    wx.cloud.callFunction({
      // 云函数名称
      name: 'add',
      // 传给云函数的参数
      data: {
        a: 1,
        b: 2,
      },
    })
      .then(res => {
        console.log('xiayan', res.result)
      })
      .catch(console.error)
  },

  tryToAddPostMessage() {
    var myDate = new Date();
    var mytime = myDate.toLocaleDateString() + '-' + myDate.toLocaleTimeString()
    wx.cloud.callFunction({
      // 云函数名称
      name: 'add-moment',
      // 传给云函数的参数
      data: {
        message: '第2条朋友圈',
        sendTime: mytime,
      },
    })
      .then(res => {
        console.log('xiayan-add-moment', res)
      })
      .catch(console.error)
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {

  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady() {

  }
})