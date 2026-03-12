// pages/login/index.js
const util = require('../../network/requestApi');
const api = require('../../network/api');
Page({

  /**
   * 页面的初始数据
   */
  data: {
    form: {
      userName: '',
      password: '',
    },
    errorMsg: '',
    loadingStatus: 0,
    rules: [
      {
        name: 'userName',
        rules: { required: true, message: '用户名不能为空!', minlength: 1 },
        message: 'asdf',
      },
      {
        name: 'password',
        rules: { required: true, message: '密码不能为空!', minlength: 8 }
      },
    ],
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {

  },

  closePage: function (options) {
    wx.navigateBack({
      delta: 1
    })
  },

  formInputChange(e) {
    const { field } = e.currentTarget.dataset
    this.setData({
      [`form.${field}`]: e.detail.value
    })
  },

  /**
   * 点击登录
   */
  clicklogin: function () {
    this.setData({
      loadingStatus: 1,
    })
    util.post(api.login, {
      username: this.data.form.userName,
      password: this.data.form.password,
    })
      .then((res) => {
        this.setData({
          loadingStatus: 0,
        })
        wx.showToast({
          title: '登陆成功',
          icon: 'success',
          duration: 1000
        })
        wx.setStorage({
          key: "nickname",
          data: res.username
        })
        wx.setStorage({
          key: "password",
          data: res.password
        })
        wx.setStorage({
          key: "userid",
          data: res.id
        })
        const eventChannel = this.getOpenerEventChannel()
        eventChannel.emit('acceptDataFromOpenedPage', {data: 'success'});
        wx.navigateBack({
          delta: 1
        })
      }).catch((errMsg) => {
        this.setData({
          loadingStatus: 0,
        })
        wx.showToast({
          title: errMsg,
          icon: 'none',
          duration: 1000
        })
      });
  },

  submitForm: function () {
    this.selectComponent('#form').validate((valid, errors) => {
      if (!valid) {
        const firstError = Object.keys(errors)
        if (firstError.length) {
          this.setData({
            errorMsg: errors[firstError[0]].message
          })
        }
      } else {
        console.log('开始登陆')
        this.clicklogin();
      }
    })
  },
  forgetPassword: function () {
    const url = 'https://www.wanandroid.com/blog/show/2947'; // 跳转的外链
    const navtitle = '忘记密码'; // 这个标题是你自己可以设置的
    wx.navigateTo({
      // 跳转到webview页面
      url: `/pages/webview/index?url=${url}&nav=${navtitle}`,
    });
  },
  registerAccount: function () {
    wx.navigateTo({
      url: `/pages/register/index`,
    });
  },
})
