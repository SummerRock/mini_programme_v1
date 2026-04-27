/**
 * 饮食记录表单页面（Diet Form）
 * 用于新增或编辑饮食记录
 */

var healthUtils = require('../../utils/health-utils.js')
var MEAL_TYPES = healthUtils.MEAL_TYPES
var validateRequired = healthUtils.validateRequired
var validateMealType = healthUtils.validateMealType

/**
 * 创建表单处理器（可测试的纯逻辑）
 * @param {object} data - 表单数据对象
 * @returns {object} 包含 validate 和 buildSubmitData 方法
 */
function createFormHandler(data) {
  return {
    /**
     * 前端表单校验
     * @returns {{ valid: boolean, message: string }}
     */
    validate: function () {
      if (!validateRequired(data.foodName)) {
        return { valid: false, message: '请输入食物名称' }
      }
      if (!validateMealType(data.mealType)) {
        return { valid: false, message: '请选择用餐类型' }
      }
      return { valid: true, message: '' }
    },

    /**
     * 构建提交数据
     * @returns {object}
     */
    buildSubmitData: function () {
      var submitData = {
        action: data.mode === 'edit' ? 'update' : 'add',
        foodName: data.foodName,
        mealType: data.mealType,
        date: data.date
      }
      if (data.mode === 'edit') {
        submitData.id = data.id
      }
      if (data.calories !== '' && data.calories !== undefined && data.calories !== null) {
        submitData.calories = Number(data.calories)
      }
      if (data.note !== '' && data.note !== undefined && data.note !== null) {
        submitData.note = data.note
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
    foodName: '',
    mealType: '',
    mealTypeIndex: -1,
    calories: '',
    note: '',
    submitting: false,
    mealTypeLabels: ['早餐', '午餐', '晚餐', '加餐']
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
        // 找到 mealType 对应的 picker 索引
        var mealTypeIndex = -1
        for (var i = 0; i < MEAL_TYPES.length; i++) {
          if (MEAL_TYPES[i].value === record.mealType) {
            mealTypeIndex = i
            break
          }
        }
        that.setData({
          foodName: record.foodName || '',
          mealType: record.mealType || '',
          mealTypeIndex: mealTypeIndex,
          calories: record.calories !== undefined && record.calories !== null ? String(record.calories) : '',
          note: record.note || ''
        })
      })
    }
  },

  /**
   * 处理表单字段输入变化
   */
  onInputChange: function (e) {
    var field = e.currentTarget.dataset.field
    var value = e.detail.value
    var updateData = {}
    updateData[field] = value
    this.setData(updateData)
  },

  /**
   * 处理用餐类型 picker 选择
   */
  onMealTypeChange: function (e) {
    var index = Number(e.detail.value)
    this.setData({
      mealTypeIndex: index,
      mealType: MEAL_TYPES[index].value
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
      name: 'health-diet',
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
