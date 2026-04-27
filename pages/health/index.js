/**
 * 健康管理主页面（Health Dashboard）
 * 以日期为维度展示当日饮食、运动、体重记录的汇总视图
 */

var healthUtils = require('../../utils/health-utils.js')
var formatDate = healthUtils.formatDate

/**
 * 从列表中移除指定 id 的记录，返回新列表
 * @param {Array} list - 记录列表
 * @param {string} id - 要移除的记录 _id
 * @returns {Array} 移除后的新列表
 */
function removeRecordFromList(list, id) {
  return list.filter(function (item) {
    return item._id !== id
  })
}

Page({
  data: {
    currentDate: '',
    dietList: [],
    exerciseList: [],
    weightList: [],
    loading: false
  },

  onLoad: function () {
    var today = formatDate(new Date())
    this.setData({ currentDate: today })

    // 初始化云环境
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
      return
    }
    wx.cloud.init({ traceUser: true })

    // 检查登录状态
    var isLoggedIn = wx.getStorageSync('health_logged_in')
    if (!isLoggedIn) {
      wx.redirectTo({ url: '/pages/login/index' })
      return
    }

    this.loadAllData()
  },

  onShow: function () {
    // 从表单页返回时刷新数据
    if (this.data.currentDate) {
      this.loadAllData()
    }
  },

  /**
   * 日期切换事件处理
   */
  onDateChange: function (e) {
    var newDate = e.detail.value
    this.setData({ currentDate: newDate })
    this.loadAllData()
  },

  /**
   * 并行调用三个云函数查询当前日期数据
   */
  loadAllData: function () {
    var that = this
    var date = that.data.currentDate

    that.setData({ loading: true })
    wx.showLoading({ title: '加载中' })

    var dietPromise = wx.cloud.callFunction({
      name: 'health-diet',
      data: { action: 'query', date: date }
    }).then(function (res) {
      if (res.result.code === 0) {
        that.setData({ dietList: res.result.data })
      }
    }).catch(function () {
      console.error('查询饮食记录失败')
    })

    var exercisePromise = wx.cloud.callFunction({
      name: 'health-exercise',
      data: { action: 'query', date: date }
    }).then(function (res) {
      if (res.result.code === 0) {
        that.setData({ exerciseList: res.result.data })
      }
    }).catch(function () {
      console.error('查询运动记录失败')
    })

    var weightPromise = wx.cloud.callFunction({
      name: 'health-weight',
      data: { action: 'query', startDate: date, endDate: date }
    }).then(function (res) {
      if (res.result.code === 0) {
        that.setData({ weightList: res.result.data })
      }
    }).catch(function () {
      console.error('查询体重记录失败')
    })

    Promise.all([dietPromise, exercisePromise, weightPromise])
      .then(function () {
        wx.hideLoading()
        that.setData({ loading: false })
      })
      .catch(function () {
        wx.hideLoading()
        that.setData({ loading: false })
        wx.showToast({ title: '网络异常，请稍后重试', icon: 'none', duration: 1500 })
      })
  },

  /**
   * 跳转饮食表单页面（新增模式）
   */
  navigateToDietForm: function () {
    wx.navigateTo({
      url: '/pages/health/diet-form?mode=add&date=' + this.data.currentDate
    })
  },

  /**
   * 跳转运动表单页面（新增模式）
   */
  navigateToExerciseForm: function () {
    wx.navigateTo({
      url: '/pages/health/exercise-form?mode=add&date=' + this.data.currentDate
    })
  },

  /**
   * 跳转体重表单页面（新增模式）
   */
  navigateToWeightForm: function () {
    wx.navigateTo({
      url: '/pages/health/weight-form?mode=add&date=' + this.data.currentDate
    })
  },

  /**
   * 点击记录卡片，跳转编辑模式
   */
  onRecordTap: function (e) {
    var record = e.currentTarget.dataset.record
    var type = e.currentTarget.dataset.type

    var urlMap = {
      diet: '/pages/health/diet-form',
      exercise: '/pages/health/exercise-form',
      weight: '/pages/health/weight-form'
    }

    var url = urlMap[type]
    if (!url) return

    wx.navigateTo({
      url: url + '?mode=edit&id=' + record._id,
      success: function (res) {
        res.eventChannel.emit('recordData', { record: record })
      }
    })
  },

  /**
   * 长按记录卡片，弹出删除确认
   */
  onRecordLongPress: function (e) {
    var that = this
    var record = e.currentTarget.dataset.record
    var type = e.currentTarget.dataset.type

    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条记录吗？',
      success: function (res) {
        if (res.confirm) {
          that.deleteRecord({ id: record._id, type: type })
        }
      }
    })
  },

  /**
   * 调用对应云函数删除记录，成功后从列表移除
   */
  deleteRecord: function (params) {
    var that = this
    var id = params.id
    var type = params.type

    var cloudFunctionMap = {
      diet: 'health-diet',
      exercise: 'health-exercise',
      weight: 'health-weight'
    }

    var listKeyMap = {
      diet: 'dietList',
      exercise: 'exerciseList',
      weight: 'weightList'
    }

    var functionName = cloudFunctionMap[type]
    var listKey = listKeyMap[type]
    if (!functionName || !listKey) return

    wx.showLoading({ title: '删除中' })

    wx.cloud.callFunction({
      name: functionName,
      data: { action: 'delete', id: id }
    }).then(function (res) {
      wx.hideLoading()
      if (res.result.code === 0) {
        var currentList = that.data[listKey]
        var newList = removeRecordFromList(currentList, id)
        var updateData = {}
        updateData[listKey] = newList
        that.setData(updateData)
        wx.showToast({ title: '删除成功', icon: 'success', duration: 1500 })
      } else {
        wx.showToast({ title: res.result.message, icon: 'none', duration: 1500 })
      }
    }).catch(function () {
      wx.hideLoading()
      wx.showToast({ title: '网络异常，请稍后重试', icon: 'none', duration: 1500 })
    })
  }
})

module.exports = {
  removeRecordFromList: removeRecordFromList
}
