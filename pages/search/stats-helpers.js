var healthUtils = require('../../utils/health-utils');
var formatDate = healthUtils.formatDate;

/**
 * 生成日期范围
 * @param {Date} today - 当前日期
 * @param {number} days - 天数
 * @returns {{ startDate: string, endDate: string, dateList: string[] }}
 *   startDate: 最远日期（days-1 天前），endDate: 最近日期（today），
 *   dateList: 从最近到最远递减排列的日期字符串数组，长度等于 days
 */
function generateDateRange(today, days) {
  var dateList = [];
  for (var i = 0; i < days; i++) {
    var d = new Date(today.getTime());
    d.setDate(d.getDate() - i);
    dateList.push(formatDate(d));
  }
  var endDate = dateList[0];
  var startDate = dateList[dateList.length - 1];
  return {
    startDate: startDate,
    endDate: endDate,
    dateList: dateList
  };
}

/**
 * 按日期累加饮食热量
 * @param {Array<{date: string, calories: number}>} records - 饮食记录数组
 * @param {string[]} dateList - 日期列表（YYYY-MM-DD 格式）
 * @returns {Array<{date: string, label: string, totalCalories: number}>}
 *   返回与 dateList 等长的数组，每项包含日期、MM-DD 标签和当日总热量
 */
function aggregateDailyCalories(records, dateList) {
  var calorieMap = {};
  for (var i = 0; i < records.length; i++) {
    var r = records[i];
    if (calorieMap[r.date] === undefined) {
      calorieMap[r.date] = 0;
    }
    calorieMap[r.date] += r.calories;
  }
  var result = [];
  for (var j = 0; j < dateList.length; j++) {
    var date = dateList[j];
    result.push({
      date: date,
      label: date.slice(-5),
      totalCalories: calorieMap[date] || 0
    });
  }
  return result;
}

/**
 * 图表数据归一化
 * @param {Array<Object>} items - 对象数组
 * @param {string} valueKey - 数值字段名
 * @returns {Array<Object>} 返回新数组，每项浅拷贝原对象并附加 heightPercent、isMax、isMin
 *   - heightPercent 归一化到 [0, 1]，最大值为 1，最小值为 0（全等时为 1）
 *   - 恰好标注一个 isMax 和一个 isMin（取首次出现）
 *   - null/undefined 值的项：heightPercent = 0, isMax = false, isMin = false
 */
function normalizeChartData(items, valueKey) {
  if (!items || items.length === 0) {
    return [];
  }

  // 收集非 null/undefined 的值及其索引
  var validIndices = [];
  for (var i = 0; i < items.length; i++) {
    var val = items[i][valueKey];
    if (val !== null && val !== undefined) {
      validIndices.push(i);
    }
  }

  // 无有效值时，全部返回默认值
  if (validIndices.length === 0) {
    var defaultResult = [];
    for (var d = 0; d < items.length; d++) {
      var copy = {};
      var keys = Object.keys(items[d]);
      for (var k = 0; k < keys.length; k++) {
        copy[keys[k]] = items[d][keys[k]];
      }
      copy.heightPercent = 0;
      copy.isMax = false;
      copy.isMin = false;
      defaultResult.push(copy);
    }
    return defaultResult;
  }

  // 找到最大值和最小值
  var maxVal = items[validIndices[0]][valueKey];
  var minVal = items[validIndices[0]][valueKey];
  var maxIdx = validIndices[0];
  var minIdx = validIndices[0];

  for (var v = 1; v < validIndices.length; v++) {
    var idx = validIndices[v];
    var value = items[idx][valueKey];
    if (value > maxVal) {
      maxVal = value;
      maxIdx = idx;
    }
    if (value < minVal) {
      minVal = value;
      minIdx = idx;
    }
  }

  var allEqual = maxVal === minVal;
  var range = maxVal - minVal;

  // 构建结果数组
  var result = [];
  for (var j = 0; j < items.length; j++) {
    var item = items[j];
    var itemCopy = {};
    var itemKeys = Object.keys(item);
    for (var m = 0; m < itemKeys.length; m++) {
      itemCopy[itemKeys[m]] = item[itemKeys[m]];
    }

    var itemVal = item[valueKey];
    if (itemVal === null || itemVal === undefined) {
      itemCopy.heightPercent = 0;
      itemCopy.isMax = false;
      itemCopy.isMin = false;
    } else if (allEqual) {
      itemCopy.heightPercent = 1;
      itemCopy.isMax = j === maxIdx;
      itemCopy.isMin = j === minIdx;
    } else {
      itemCopy.heightPercent = (itemVal - minVal) / range;
      itemCopy.isMax = j === maxIdx;
      itemCopy.isMin = j === minIdx;
    }

    result.push(itemCopy);
  }

  return result;
}

/**
 * 构建体重图表数据
 * @param {Array<{date: string, weight: number}>} weightRecords - 体重记录数组
 * @param {string[]} dateList - 日期列表（YYYY-MM-DD 格式）
 * @returns {Array<{date: string, label: string, weight: number|null, heightPercent: number, isMax: boolean, isMin: boolean}>}
 *   将体重记录映射到日期列表，无记录日期 weight 为 null，调用 normalizeChartData 归一化
 */
function buildWeightChartData(weightRecords, dateList) {
  // 建立日期到体重的映射
  var weightMap = {};
  for (var i = 0; i < weightRecords.length; i++) {
    var r = weightRecords[i];
    weightMap[r.date] = r.weight;
  }

  // 将体重记录映射到日期列表
  var mappedItems = [];
  for (var j = 0; j < dateList.length; j++) {
    var date = dateList[j];
    var weight = weightMap[date] !== undefined ? weightMap[date] : null;
    mappedItems.push({
      date: date,
      label: date.slice(-5),
      weight: weight
    });
  }

  // 调用 normalizeChartData 归一化
  return normalizeChartData(mappedItems, 'weight');
}

/**
 * 构建热量图表数据
 * @param {Array<{date: string, calories: number}>} dietRecords - 饮食记录数组
 * @param {string[]} dateList - 日期列表（YYYY-MM-DD 格式）
 * @returns {Array<{date: string, label: string, totalCalories: number, heightPercent: number, isMax: boolean, isMin: boolean}>}
 *   先调用 aggregateDailyCalories 累加，再调用 normalizeChartData 归一化
 */
function buildCalorieChartData(dietRecords, dateList) {
  // 先累加每日热量
  var aggregated = aggregateDailyCalories(dietRecords, dateList);

  // 再归一化
  return normalizeChartData(aggregated, 'totalCalories');
}

module.exports = {
  generateDateRange: generateDateRange,
  aggregateDailyCalories: aggregateDailyCalories,
  normalizeChartData: normalizeChartData,
  buildWeightChartData: buildWeightChartData,
  buildCalorieChartData: buildCalorieChartData
};
