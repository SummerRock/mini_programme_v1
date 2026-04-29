// pages/search/index.js
var statsHelpers = require('./stats-helpers');
var generateDateRange = statsHelpers.generateDateRange;
var buildWeightChartData = statsHelpers.buildWeightChartData;
var buildCalorieChartData = statsHelpers.buildCalorieChartData;

var requestApi = require('../../network/requestApi');
var wxCloud = requestApi.wxCloud;

Page({
  data: {
    isLoggedIn: false,
    loading: true,
    calorieTips: [],
    tipsLoadError: false,
    weightChartData: [],
    weightEmpty: false,
    calorieChartData: [],
    calorieEmpty: false
  },

  onShow: function () {
    var isLoggedIn = !!wx.getStorageSync('health_logged_in');
    if (isLoggedIn) {
      this.setData({ isLoggedIn: true });
      this.loadAllData();
    } else {
      this.setData({ isLoggedIn: false, loading: false });
    }
  },

  loadAllData: function () {
    var self = this;
    self.setData({ loading: true });

    var tipsPromise = self.loadCalorieTips().then(function () {
      return { status: 'fulfilled' };
    }).catch(function () {
      return { status: 'rejected' };
    });

    var weightPromise = self.loadWeightData().then(function () {
      return { status: 'fulfilled' };
    }).catch(function () {
      return { status: 'rejected' };
    });

    var caloriePromise = self.loadCalorieData().then(function () {
      return { status: 'fulfilled' };
    }).catch(function () {
      return { status: 'rejected' };
    });

    Promise.all([tipsPromise, weightPromise, caloriePromise]).then(function (results) {
      self.setData({ loading: false });

      var hasFailed = false;
      for (var i = 0; i < results.length; i++) {
        if (results[i].status === 'rejected') {
          hasFailed = true;
          break;
        }
      }

      if (hasFailed) {
        wx.showToast({
          title: '数据加载失败，请稍后重试',
          icon: 'none',
          duration: 1500
        });
      }
    });
  },

  loadCalorieTips: function () {
    var self = this;
    return wxCloud('get-food-calorie-tips', { action: 'getAll' }).then(function (result) {
      if (result.code === 0) {
        self.setData({ calorieTips: result.data, tipsLoadError: false });
      } else {
        self.setData({ tipsLoadError: true });
        throw new Error('tips load failed');
      }
    }).catch(function (err) {
      self.setData({ tipsLoadError: true });
      throw err;
    });
  },

  loadWeightData: function () {
    var self = this;
    var range = generateDateRange(new Date(), 30);
    return wxCloud('health-weight', { action: 'query', startDate: range.startDate, endDate: range.endDate }).then(function (result) {
      if (result.code === 0) {
        if (!result.data || result.data.length === 0) {
          self.setData({ weightEmpty: true, weightChartData: [] });
        } else {
          var chartData = buildWeightChartData(result.data, range.dateList);
          self.setData({ weightChartData: chartData, weightEmpty: false });
        }
      } else {
        self.setData({ weightEmpty: true, weightChartData: [] });
        throw new Error('weight load failed');
      }
    }).catch(function (err) {
      self.setData({ weightEmpty: true, weightChartData: [] });
      throw err;
    });
  },

  loadCalorieData: function () {
    var self = this;
    var range = generateDateRange(new Date(), 7);
    var promises = range.dateList.map(function (date) {
      return wxCloud('health-diet', { action: 'query', date: date });
    });
    return Promise.all(promises).then(function (results) {
      var allRecords = [];
      for (var i = 0; i < results.length; i++) {
        if (results[i] && results[i].code === 0 && Array.isArray(results[i].data)) {
          allRecords = allRecords.concat(results[i].data);
        }
      }
      if (allRecords.length === 0) {
        self.setData({ calorieEmpty: true, calorieChartData: [] });
      } else {
        var chartData = buildCalorieChartData(allRecords, range.dateList);
        self.setData({ calorieChartData: chartData, calorieEmpty: false });
      }
    }).catch(function (err) {
      self.setData({ calorieEmpty: true, calorieChartData: [] });
      throw err;
    });
  },

  goToLogin: function () {
    wx.navigateTo({ url: '/pages/login/index' });
  }
});
