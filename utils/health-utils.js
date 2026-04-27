/**
 * 健康管理共享工具函数模块
 */

/**
 * 用餐类型枚举映射
 */
const MEAL_TYPES = [
  { value: 'breakfast', label: '早餐' },
  { value: 'lunch', label: '午餐' },
  { value: 'dinner', label: '晚餐' },
  { value: 'snack', label: '加餐' }
]

/**
 * 将 Date 对象格式化为 YYYY-MM-DD 字符串
 * @param {Date} date
 * @returns {string}
 */
function formatDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * 必填文本字段校验 - 至少包含一个非空白字符
 * @param {*} value
 * @returns {boolean}
 */
function validateRequired(value) {
  return typeof value === 'string' && value.trim().length > 0
}

/**
 * 用餐类型校验 - 仅允许合法枚举值
 * @param {*} value
 * @returns {boolean}
 */
function validateMealType(value) {
  return ['breakfast', 'lunch', 'dinner', 'snack'].includes(value)
}

/**
 * 运动时长校验 - 必须为正数
 * @param {*} value
 * @returns {boolean}
 */
function validateDuration(value) {
  return typeof value === 'number' && !isNaN(value) && value > 0
}

/**
 * 体重范围校验 - 必须在 [20, 300] 闭区间内
 * @param {*} value
 * @returns {boolean}
 */
function validateWeight(value) {
  return typeof value === 'number' && !isNaN(value) && value >= 20 && value <= 300
}

/**
 * 云函数调用封装（含 loading 和错误处理）
 * @param {string} name - 云函数名称
 * @param {object} data - 调用参数
 * @returns {Promise<object>} 云函数返回结果
 */
function callCloudFunction(name, data) {
  wx.showLoading({ title: '加载中' })
  return wx.cloud.callFunction({ name: name, data: data })
    .then(function (res) {
      wx.hideLoading()
      return res
    })
    .catch(function (err) {
      wx.hideLoading()
      wx.showToast({ title: '网络异常，请稍后重试', icon: 'none', duration: 1500 })
      throw err
    })
}

module.exports = {
  MEAL_TYPES: MEAL_TYPES,
  formatDate: formatDate,
  validateRequired: validateRequired,
  validateMealType: validateMealType,
  validateDuration: validateDuration,
  validateWeight: validateWeight,
  callCloudFunction: callCloudFunction
}
