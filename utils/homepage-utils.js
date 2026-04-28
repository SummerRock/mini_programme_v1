/**
 * 首页工具函数模块
 * 提供问候语、日期格式化、随机选取、内容截取等纯函数
 */

/**
 * 根据小时数返回对应时段的问候语
 * @param {number} hour - 0-23 的整数
 * @returns {string} 问候语文本
 */
function getGreeting(hour) {
  if (hour >= 6 && hour <= 11) {
    return '早上好，今天也要元气满满 ☀️'
  }
  if (hour >= 12 && hour <= 13) {
    return '中午好，记得好好吃饭 🍚'
  }
  if (hour >= 14 && hour <= 17) {
    return '下午好，保持活力 💪'
  }
  if (hour >= 18 && hour <= 22) {
    return '晚上好，注意休息 🌙'
  }
  return '夜深了，早点休息吧 😴'
}

/**
 * 将 Date 对象格式化为"M月D日 星期X"格式
 * @param {Date} date
 * @returns {string}
 */
function formatDisplayDate(date) {
  var dayNames = ['日', '一', '二', '三', '四', '五', '六']
  var month = date.getMonth() + 1
  var day = date.getDate()
  var weekDay = dayNames[date.getDay()]
  return month + '月' + day + '日 星期' + weekDay
}

/**
 * 从数组中随机选取一条 quote，可排除指定 ID
 * @param {Array} quotes - quote 数组
 * @param {string} [excludeId] - 要排除的 quote ID
 * @returns {object} 随机选取的 quote 对象
 */
function getRandomQuote(quotes, excludeId) {
  var pool = quotes
  if (excludeId !== undefined && quotes.length >= 2) {
    pool = quotes.filter(function (q) { return q.id !== excludeId })
  }
  var index = Math.floor(Math.random() * pool.length)
  return pool[index]
}

/**
 * 从数组中随机选取指定数量的 tips，无重复
 * @param {Array} tips - tip 数组
 * @param {number} count - 需要选取的数量
 * @returns {Array} 随机选取的 tip 数组
 */
function getRandomTips(tips, count) {
  var available = tips.slice()
  var result = []
  var n = Math.min(count, available.length)
  for (var i = 0; i < n; i++) {
    var index = Math.floor(Math.random() * available.length)
    result.push(available[index])
    available.splice(index, 1)
  }
  return result
}

/**
 * 截取内容前 N 个字符，超出部分添加"..."
 * @param {string} content - 原始内容
 * @param {number} maxLength - 最大字符数
 * @returns {string} 截取后的内容
 */
function truncateContent(content, maxLength) {
  if (content.length > maxLength) {
    return content.substring(0, maxLength) + '...'
  }
  return content
}

module.exports = {
  getGreeting: getGreeting,
  formatDisplayDate: formatDisplayDate,
  getRandomQuote: getRandomQuote,
  getRandomTips: getRandomTips,
  truncateContent: truncateContent
}
