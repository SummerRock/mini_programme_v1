// pages/mine/index.js
var mineHelpers = require('./mine-helpers');
var resolveAvatar = mineHelpers.resolveAvatar;
var resolveNickname = mineHelpers.resolveNickname;
var groupRecordsByDate = mineHelpers.groupRecordsByDate;

var requestApi = require('../../network/requestApi');
var wxCloud = requestApi.wxCloud;

var healthUtils = require('../../utils/health-utils');
var formatDate = healthUtils.formatDate;

Page({
  data: {
    isLoggedIn: false,
    avatarUrl: '',
    nickname: '未登录',
    dietLoading: false,
    dietError: false,
    dayGroups: [],
    showPrivacyModal: false,
    privacySections: [
      {
        title: '一、引言',
        content: '欢迎使用"轻体记"小程序。我们非常重视您的个人隐私和数据安全。本隐私政策旨在向您说明我们如何收集、使用和保护您的个人信息，请您在使用本小程序前仔细阅读。'
      },
      {
        title: '二、信息收集范围',
        content: '为了向您提供健康管理服务，我们可能会收集以下信息：微信昵称、头像、体重记录、饮食记录、运动记录。以上信息均在您主动使用相关功能时收集，我们不会在您不知情的情况下收集任何个人信息。'
      },
      {
        title: '三、信息使用方式',
        content: '我们收集的所有信息仅用于为您提供健康管理服务功能，包括记录和展示您的健康数据、生成健康统计报告等。我们不会将您的个人信息用于与健康管理服务无关的其他目的。'
      },
      {
        title: '四、信息存储与保护',
        content: '您的数据通过微信云开发平台进行存储，我们采取合理的安全措施来保护您的个人信息，防止数据丢失、泄露或被未经授权的访问。'
      },
      {
        title: '五、用户权利',
        content: '您有权随时查看、修改和删除您的个人数据。您可以在小程序内的相关功能页面中管理您的个人信息。如需帮助，请通过本政策中的联系方式与我们取得联系。'
      },
      {
        title: '六、未成年人保护',
        content: '我们非常重视未成年人的隐私保护。如果您是未满18周岁的未成年人，请在监护人的指导下使用本小程序，并在监护人同意的前提下提供个人信息。'
      },
      {
        title: '七、政策更新',
        content: '我们可能会不定期更新本隐私政策。政策发生变更时，我们会在小程序内以适当方式通知您。建议您定期查阅本政策以了解最新内容。'
      },
      {
        title: '八、联系方式',
        content: '如果您对本隐私政策有任何疑问或建议，欢迎通过小程序内的反馈功能与我们联系，我们将尽快为您解答。'
      }
    ]
  },

  onShow: function () {
    this.checkLoginStatus();
    if (this.data.isLoggedIn) {
      this.loadDietRecords();
    }
  },

  checkLoginStatus: function () {
    var isLoggedIn = !!wx.getStorageSync('health_logged_in');
    var userInfo = wx.getStorageSync('health_user_info') || null;
    var avatarUrl = resolveAvatar(userInfo);
    var nickname = resolveNickname(userInfo, isLoggedIn);
    this.setData({
      isLoggedIn: isLoggedIn,
      avatarUrl: avatarUrl,
      nickname: nickname
    });
  },

  loadDietRecords: function () {
    var self = this;
    var today = new Date();
    var yesterdayDate = new Date();
    yesterdayDate.setDate(today.getDate() - 1);
    var dayBeforeDate = new Date();
    dayBeforeDate.setDate(today.getDate() - 2);

    var todayStr = formatDate(today);
    var yesterdayStr = formatDate(yesterdayDate);
    var dayBeforeStr = formatDate(dayBeforeDate);
    var dates = [todayStr, yesterdayStr, dayBeforeStr];

    self.setData({ dietLoading: true, dietError: false });

    Promise.all([
      wxCloud('health-diet', { action: 'query', date: todayStr }),
      wxCloud('health-diet', { action: 'query', date: yesterdayStr }),
      wxCloud('health-diet', { action: 'query', date: dayBeforeStr })
    ]).then(function (results) {
      var allRecords = [];
      for (var i = 0; i < results.length; i++) {
        if (results[i] && results[i].code === 0 && Array.isArray(results[i].data)) {
          allRecords = allRecords.concat(results[i].data);
        }
      }
      var dayGroups = groupRecordsByDate(allRecords, dates);
      self.setData({ dayGroups: dayGroups });
    }).catch(function () {
      self.setData({ dietError: true });
    }).then(function () {
      // finally block equivalent
      self.setData({ dietLoading: false });
    });
  },

  onProfileTap: function () {
    if (!this.data.isLoggedIn) {
      wx.navigateTo({ url: '/pages/login/index' });
    }
  },

  jumpToHealth: function () {
    wx.navigateTo({ url: '/pages/health/index' });
  },

  retryLoadDiet: function () {
    this.loadDietRecords();
  },

  openPrivacyModal: function () {
    this.setData({ showPrivacyModal: true });
  },

  closePrivacyModal: function () {
    this.setData({ showPrivacyModal: false });
  },

  loginout: function () {
    wx.showModal({
      title: '提示',
      content: '确定要退出当前登录吗？',
      success: function (res) {
        if (res.confirm) {
          wx.removeStorageSync('health_logged_in');
          wx.removeStorageSync('health_openid');
          wx.removeStorageSync('health_user_info');
          wx.navigateTo({ url: '/pages/login/index' });
        }
      }
    });
  }
});
