// pages/mine/index.js
const requestApi = require('../../network/requestApi');
const api = require('../../network/api');

Page({

  /**
   * 页面的初始数据
   */
  data: {
    username: '未登录',
    myRank: null,
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onUserInfoClick: function (options) {
    var hasLogin = requestApi.getNickName();
    if (!hasLogin || hasLogin.length < 1) {
      wx.navigateTo({
        url: '/pages/login/index',
        events: {
          // 为指定事件添加一个监听器，获取被打开页面传送到当前页面的数据
          acceptDataFromOpenedPage: (resultData) => {
            const { data } = resultData;
            if (data === 'success') {
              this.checkLoginStatus();
            }
          },
        },
      })
    } else {
      wx.chooseImage({
        success: chooseResult => {
          // 将图片上传至云存储空间
          wx.cloud.uploadFile({
            // 指定上传到的云路径
            cloudPath: 'my-photo-test.png',
            // 指定要上传的文件的小程序临时文件路径
            filePath: chooseResult.tempFilePaths[0],
            // 成功回调
            success: res => {
              console.log('上传成功', res)
            },
          })
        },
      })
    }
  },

  getRankInfo: function () {
    requestApi.get(api.UserRank).then((res) => {
      this.setData({
        myRank: res
      })
    }).catch((errMsg) => {
      if (errMsg === "-1001") {
        this.setData({
          username: '未登录',
          myRank: null
        })
      }
    });
  },

  jumpToTest: function () {
    wx.navigateTo({
      url: '/pages/test/index',
    })
  },

  /**
   * 跳转到食物转盘页面
   */
  jumpToFoodWheel: function () {
    wx.navigateTo({
      url: '/pages/food-wheel/index',
    })
  },

  /**
   * 退出登陆
   */
  loginout: function () {
    wx.showModal({
      title: '提示',
      content: '确定要退出当前登录吗？',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({
            title: '正在退出账号',
          })
          requestApi.get(api.logout)
            .then((res) => {
              this.setData({
                username: '未登录',
                myRank: null
              })
              requestApi.clearLogin()
              wx.hideLoading({
                success: (res) => {
                  wx.showToast({
                    title: '退出成功',
                    icon: 'success',
                    duration: 200
                  })
                },
              })
            }).catch((errMsg) => {
              wx.hideLoading({
                success: (res) => {
                  wx.showToast({
                    title: '退出失败',
                    icon: 'none',
                    duration: 200
                  })
                },
              })
            });
        } else if (res.cancel) {
          console.log('用户点击取消')
        }
      }
    })
  },

  showMyCollect: function () {
    wx.navigateTo({
      url: '/pages/collect/index',
    })
  },
  showAboutAuthor: function () {
    wx.showModal({
      title: '提示',
      content: '喜欢学点新东西的终端开发，感谢玩Android提供的API',
      showCancel: false,
      success(res) {
        if (res.confirm) {
          console.log('用户点击确定')
        } else if (res.cancel) {
          console.log('用户点击取消')
        }
      }
    })
  },

  checkLoginStatus: function () {
    let localUserName = requestApi.getNickName()
    if (!localUserName || localUserName.length < 1) {
      this.setData({
        username: '未登录'
      })
    } else {
      this.setData({
        username: localUserName
      })
      this.getRankInfo()
    }
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    this.checkLoginStatus()
    wx.cloud.init({
      env: 'cloud1-6gxdfav8a53f9552'
    })
  },
})