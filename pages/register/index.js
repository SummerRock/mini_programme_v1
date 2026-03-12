const util = require('../../network/requestApi');
const api = require('../../network/api');

Page({
  data: {
    showTopTips: false,
    loadingStatus: 0,
    isAgree: false,
    formData: {
      userName: '',
      password: '',
      repassword: '',
    },
    rules: [{
      name: 'userName',
      rules: { required: true, message: '用户名不能为空!', minlength: 1 },
    }, {
      name: 'password',
      rules: { required: true, message: '密码最少为8位!', minlength: 8 },
    }, {
      name: 'repassword',
      rules: {
        validator: (rule, value, param, modeels) => {
          if (!value || value.length < 8) {
            return '密码最小为8位'
          }
          if (value !== modeels.password) {
            return '密码输入不一致!'
          }
        }
      },
    }]
  },
  bindAgreeChange: function (e) {
    this.setData({
      isAgree: !!e.detail.value.length
    });
  },
  formInputChange(e) {
    const { field } = e.currentTarget.dataset
    this.setData({
      [`formData.${field}`]: e.detail.value
    })
  },
  submitForm() {
    this.selectComponent('#form').validate((valid, errors) => {
      console.log('valid', valid, errors)
      if (!valid) {
        const firstError = Object.keys(errors)
        if (firstError.length) {
          this.setData({
            error: errors[firstError[0]].message
          })

        }
      } else {
        if (this.data.isAgree) {
          this.startRegister()
        } else {
          this.setData({
            error: '请阅读并同意相关条款'
          })
        }
      }
    })
    // this.selectComponent('#form').validateField('mobile', (valid, errors) => {
    //     console.log('valid', valid, errors)
    // })
  },

  showItems: function () {
    wx.showModal({
      title: '相关条款',
      content: '兴趣使然搞的项目，非盈利，不承担任何法律风险',
      showCancel: false
    })
  },

  startRegister: function () {
    this.setData({
      loadingStatus: 1,
    })
    util.post(api.register, {
      username: this.data.formData.userName,
      password: this.data.formData.password,
      repassword: this.data.formData.repassword
    })
      .then((res) => {
        this.setData({
          loadingStatus: 0,
        })
        wx.showToast({
          title: '注册成功',
          icon: 'success',
          duration: 1000
        })
        // wx.setStorage({
        //   key: "nickname",
        //   data: res.username
        // })
        // wx.setStorage({
        //   key: "password",
        //   data: res.password
        // })
        // wx.setStorage({
        //   key: "userid",
        //   data: res.id
        // })
        const eventChannel = this.getOpenerEventChannel()
        eventChannel && eventChannel.emit('acceptDataFromOpenedPage', { data: 'success' });
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
});