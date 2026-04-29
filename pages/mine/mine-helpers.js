var healthUtils = require('../../utils/health-utils');
var formatDate = healthUtils.formatDate;

/**
 * 解析头像URL
 * @param {Object|null|undefined} userInfo
 * @returns {string} 头像URL，无效时返回空字符串
 */
function resolveAvatar(userInfo) {
  if (userInfo && typeof userInfo.avatarUrl === 'string' && userInfo.avatarUrl.length > 0) {
    return userInfo.avatarUrl;
  }
  return '';
}

/**
 * 解析昵称
 * @param {Object|null|undefined} userInfo
 * @param {boolean} isLoggedIn
 * @returns {string} 昵称文本
 */
function resolveNickname(userInfo, isLoggedIn) {
  if (!isLoggedIn) {
    return '未登录';
  }
  if (userInfo) {
    if (typeof userInfo.nickName === 'string' && userInfo.nickName.length > 0) {
      return userInfo.nickName;
    }
    if (typeof userInfo.name === 'string' && userInfo.name.length > 0) {
      return userInfo.name;
    }
  }
  return '健康用户';
}

/**
 * 将日期字符串转为友好标签
 * @param {string} dateStr - YYYY-MM-DD 格式
 * @returns {string} "今天" | "昨天" | "MM-DD"
 */
function getDateLabel(dateStr) {
  var today = formatDate(new Date());
  var yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  var yesterday = formatDate(yesterdayDate);

  if (dateStr === today) {
    return '今天';
  }
  if (dateStr === yesterday) {
    return '昨天';
  }
  // Return MM-DD format from YYYY-MM-DD
  return dateStr.substring(5);
}

/**
 * 获取用餐类型中文标签
 * @param {string} mealType - breakfast | lunch | dinner | snack
 * @returns {string} 中文标签
 */
function getMealTypeLabel(mealType) {
  var map = {
    breakfast: '早餐',
    lunch: '午餐',
    dinner: '晚餐',
    snack: '加餐'
  };
  return map[mealType] || mealType;
}

/**
 * 将饮食记录按日期分组
 * @param {Array} records - 饮食记录数组
 * @param {Array} dates - 需要展示的日期数组（从近到远）
 * @returns {Array} Day_Group 数组
 */
function groupRecordsByDate(records, dates) {
  return dates.map(function (date) {
    var dayRecords = records
      .filter(function (r) { return r.date === date; })
      .map(function (r) {
        return Object.assign({}, r, { mealTypeLabel: getMealTypeLabel(r.mealType) });
      });
    return {
      date: date,
      dateLabel: getDateLabel(date),
      records: dayRecords
    };
  });
}

module.exports = {
  resolveAvatar: resolveAvatar,
  resolveNickname: resolveNickname,
  getDateLabel: getDateLabel,
  getMealTypeLabel: getMealTypeLabel,
  groupRecordsByDate: groupRecordsByDate,
};
