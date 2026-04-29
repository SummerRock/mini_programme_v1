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
    dayGroups: []
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
