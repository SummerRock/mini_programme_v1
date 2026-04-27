/**
 * 体重记录表单页面（Weight Form）
 * 用于新增或编辑体重记录
 */

var healthUtils = require('../../utils/health-utils.js')
var validateWeight = healthUtils.validateWeight

/**
 * 创建表单处理器（可测试的纯逻辑）
 * @param {object} data - 表单数据对象
 * @returns {object} 包含 validate、buildSubmitData、handleResponse 方法
 */
function createFormHandler(data) {
  return {
    /**
     * 前端表单校验
     * @returns {{ valid: boolean, message: string }}
     */
    validate: function () {
      if (data.weight === '' || data.weight === undefined || data.weight === null) {
        return { valid: false, message: '请输入体重' }
      }
      if (!validateWeight(Number(data.weight))) {
        return { valid: false, message: '体重须在 20 到 300 kg 之间' }
      }
      return { valid: true, message: '' }
    },

    /**
     * 构建提交数据
     * @returns {object}
     */
    buildSubmitData: function () {
      var submitData = {
        action: 'add',
        weight: Number(data.weight),
        date: data.date
      }
      return submitData
    },

    /**
     * 处理提交响应
     * @param {object} result - 云函数返回结果
     * @returns {{ success: boolean, message: string }}
     */
    handleResponse: function (result) {
      if (result && result.code === 0) {
        return { success: true, message: '操作成功' }
      }
      var msg = (result && result.message) ? result.message : '提交失败'
      return { success: false, message: msg }
    }
  }
}


Page({
  data: {
    mode: 'add',
    id: '',
    date: '',
    weight: '',
    submitting: false
  },

  onLoad: function (options) {
    var that = this
    var mode = options.mode || 'add'
    var date = options.date || ''
    var id = options.id || ''

    that.setData({
      mode: mode,
      date: date,
      id: id
    })

    // 编辑模式：通过 eventChannel 接收记录数据
    if (mode === 'edit') {
      var eventChannel = that.getOpenerEventChannel()
      eventChannel.on('recordData', function (data) {
        var record = data.record
        that.setData({
          weight: record.weight !== undefined && record.weight !== null ? String(record.weight) : '',
          date: record.date || ''
        })
      })
    }
  },

  /**
   * 处理体重输入变化
   */
  onInputChange: function (e) {
    var field = e.currentTarget.dataset.field
    var value = e.detail.value
    var updateData = {}
    updateData[field] = value
    this.setData(updateData)
  },

  /**
   * 处理日期 picker 选择
   */
  onDateChange: function (e) {
    this.setData({
      date: e.detail.value
    })
  },

  /**
   * 前端表单校验
   * @returns {boolean}
   */
  validate: function () {
    var handler = createFormHandler(this.data)
    var result = handler.validate()
    if (!result.valid) {
      wx.showToast({ title: result.message, icon: 'none', duration: 1500 })
      return false
    }
    return true
  },

  /**
   * 提交表单
   */
  submitForm: function () {
    var that = this

    // 前端校验
    if (!that.validate()) return

    // 防重复提交
    if (that.data.submitting) return
    that.setData({ submitting: true })

    var handler = createFormHandler(that.data)
    var submitData = handler.buildSubmitData()

    wx.showLoading({ title: '提交中' })

    wx.cloud.callFunction({
      name: 'health-weight',
      data: submitData
    }).then(function (res) {
      wx.hideLoading()
      var response = handler.handleResponse(res.result)
      if (response.success) {
        wx.showToast({ title: '操作成功', icon: 'success', duration: 1500 })
        setTimeout(function () {
          wx.navigateBack()
        }, 1500)
      } else {
        wx.showToast({ title: response.message, icon: 'none', duration: 1500 })
      }
    }).catch(function () {
      wx.hideLoading()
      wx.showToast({ title: '网络异常，请稍后重试', icon: 'none', duration: 1500 })
    }).finally(function () {
      that.setData({ submitting: false })
    })
  }
})

module.exports = {
  createFormHandler: createFormHandler
}
