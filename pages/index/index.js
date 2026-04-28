// pages/index/index.js
var homepageUtils = require('../../utils/homepage-utils')
var requestApi = require('../../network/requestApi')
var wxCloud = requestApi.wxCloud

// Module-level cache for full data arrays
var allTips = []
var allQuotes = []
var tipsLoadFailed = false
var quotesLoadFailed = false

Page({
  data: {
    greeting: '',
    displayDate: '',
    currentQuote: null,
    tipsList: [],
    expandedTipId: null,
    tipsLoadError: false,
    quotesLoadError: false,
    loading: true
  },

  onLoad: function () {
    // Immediately render greeting and date (local computation, no cloud dependency)
    var now = new Date()
    var hour = now.getHours()
    var greeting = homepageUtils.getGreeting(hour)
    var displayDate = homepageUtils.formatDisplayDate(now)

    this.setData({
      greeting: greeting,
      displayDate: displayDate
    })

    // Async load cloud data
    this.loadCloudData()
  },

  onPullDownRefresh: function () {
    var self = this
    this.loadCloudData().then(function () {
      wx.stopPullDownRefresh()
    }).catch(function () {
      wx.stopPullDownRefresh()
    })
  },

  loadCloudData: function () {
    var self = this
    return wxCloud('get-homepage-data', { action: 'getAll' }).then(function (result) {
      if (result && result.code === 0 && result.data) {
        allTips = result.data.tips || []
        allQuotes = result.data.quotes || []
        tipsLoadFailed = false
        quotesLoadFailed = false
        self.refreshData()
      } else {
        throw new Error('云函数返回异常')
      }
    }).catch(function (err) {
      self.loadLocalFallback()
    })
  },

  loadLocalFallback: function () {
    tipsLoadFailed = false
    quotesLoadFailed = false

    try {
      var loadedTips = require('../../data/health-tips.json')
      if (!Array.isArray(loadedTips)) throw new Error('Invalid format')
      allTips = loadedTips
    } catch (e) {
      tipsLoadFailed = true
    }

    try {
      var loadedQuotes = require('../../data/motivational-quotes.json')
      if (!Array.isArray(loadedQuotes)) throw new Error('Invalid format')
      allQuotes = loadedQuotes
    } catch (e) {
      quotesLoadFailed = true
    }

    this.refreshData()
  },

  refreshData: function () {
    var tipsList = homepageUtils.getRandomTips(allTips, 5)
    var currentQuote = homepageUtils.getRandomQuote(allQuotes, this.data.currentQuote ? this.data.currentQuote.id : undefined)

    this.setData({
      currentQuote: currentQuote || null,
      tipsList: tipsList,
      expandedTipId: null,
      tipsLoadError: tipsLoadFailed,
      quotesLoadError: quotesLoadFailed,
      loading: false
    })
  },

  onTipTap: function (e) {
    var tipId = e.currentTarget.dataset.id
    this.setData({
      expandedTipId: this.data.expandedTipId === tipId ? null : tipId
    })
  }
})
