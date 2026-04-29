var fc = require('fast-check');
var generateDateRange = require('../stats-helpers').generateDateRange;

/**
 * Feature: health-stats-page, Property 1: 日期范围生成正确性
 * Validates: Requirements 5.1, 6.1
 *
 * 对任意当前日期和正整数天数，generateDateRange 返回的 dateList 应满足：
 * - 长度恰好等于 days
 * - 第一个元素是最近的日期（endDate），最后一个元素是最远的日期（startDate）
 * - 列表中的日期连续递减（相邻日期相差恰好 1 天）
 * - startDate 和 endDate 分别等于列表的最后和第一个元素
 */
describe('Feature: health-stats-page, Property 1: 日期范围生成正确性', function () {
  it('dateList 长度等于 days、日期连续递减、startDate/endDate 与列表首尾一致', function () {
    fc.assert(
      fc.property(
        fc.date({
          min: new Date('2000-01-01'),
          max: new Date('2099-12-31')
        }),
        fc.integer({ min: 1, max: 365 }),
        function (today, days) {
          var result = generateDateRange(today, days);
          var dateList = result.dateList;
          var startDate = result.startDate;
          var endDate = result.endDate;

          // 1. dateList 长度等于 days
          expect(dateList.length).toBe(days);

          // 2. endDate 等于 dateList 第一个元素（最近日期）
          expect(endDate).toBe(dateList[0]);

          // 3. startDate 等于 dateList 最后一个元素（最远日期）
          expect(startDate).toBe(dateList[dateList.length - 1]);

          // 4. 日期连续递减：相邻日期相差恰好 1 天
          for (var i = 0; i < dateList.length - 1; i++) {
            var current = new Date(dateList[i] + 'T00:00:00');
            var next = new Date(dateList[i + 1] + 'T00:00:00');
            var diffMs = current.getTime() - next.getTime();
            var diffDays = diffMs / (1000 * 60 * 60 * 24);
            expect(diffDays).toBe(1);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

var aggregateDailyCalories = require('../stats-helpers').aggregateDailyCalories;

/**
 * Feature: health-stats-page, Property 2: 每日热量累加正确性
 * Validates: Requirements 6.2
 *
 * 对任意饮食记录数组和日期列表，aggregateDailyCalories 返回的每日汇总应满足：
 * - 返回数组长度等于 dateList 长度
 * - 每个日期的 totalCalories 等于该日期下所有记录 calories 的算术和
 * - 没有记录的日期，totalCalories 为 0
 * - 返回数组的日期顺序与输入 dateList 一致
 */
describe('Feature: health-stats-page, Property 2: 每日热量累加正确性', function () {
  /**
   * Helper: format a Date to YYYY-MM-DD string (mirrors formatDate behaviour)
   */
  function toDateStr(d) {
    var yyyy = d.getFullYear();
    var mm = ('0' + (d.getMonth() + 1)).slice(-2);
    var dd = ('0' + d.getDate()).slice(-2);
    return yyyy + '-' + mm + '-' + dd;
  }

  // Arbitrary for a unique dateList of YYYY-MM-DD strings
  var dateListArb = fc.uniqueArray(
    fc.date({ min: new Date('2000-01-01'), max: new Date('2099-12-31') }).map(function (d) {
      return toDateStr(d);
    }),
    { minLength: 1, maxLength: 30, comparator: function (a, b) { return a === b; } }
  );

  // Given a dateList, generate records whose dates may or may not belong to dateList
  function recordsArb(dateList) {
    // Pick date either from dateList or a completely random date string
    var dateFromList = fc.constantFrom.apply(fc, dateList);
    var randomDate = fc.date({ min: new Date('2000-01-01'), max: new Date('2099-12-31') }).map(function (d) {
      return toDateStr(d);
    });
    var dateArb = fc.oneof(dateFromList, randomDate);

    return fc.array(
      fc.record({
        date: dateArb,
        calories: fc.integer({ min: 0, max: 10000 })
      }),
      { minLength: 0, maxLength: 50 }
    );
  }

  it('返回长度等于 dateList 长度、每日 totalCalories 等于该日所有 calories 之和、无记录日期为 0、顺序一致', function () {
    fc.assert(
      fc.property(
        dateListArb.chain(function (dateList) {
          return recordsArb(dateList).map(function (records) {
            return { dateList: dateList, records: records };
          });
        }),
        function (input) {
          var dateList = input.dateList;
          var records = input.records;
          var result = aggregateDailyCalories(records, dateList);

          // 1. 返回数组长度等于 dateList 长度
          expect(result.length).toBe(dateList.length);

          // 2. 返回数组的日期顺序与输入 dateList 一致
          for (var i = 0; i < dateList.length; i++) {
            expect(result[i].date).toBe(dateList[i]);
          }

          // 3. 每个日期的 totalCalories 等于该日期下所有记录 calories 的算术和
          //    没有记录的日期，totalCalories 为 0
          var expectedMap = {};
          for (var j = 0; j < dateList.length; j++) {
            expectedMap[dateList[j]] = 0;
          }
          for (var k = 0; k < records.length; k++) {
            var r = records[k];
            if (expectedMap[r.date] !== undefined) {
              expectedMap[r.date] += r.calories;
            }
          }

          for (var m = 0; m < result.length; m++) {
            expect(result[m].totalCalories).toBe(expectedMap[result[m].date]);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

var normalizeChartData = require('../stats-helpers').normalizeChartData;

/**
 * Feature: health-stats-page, Property 3: 图表数据归一化正确性
 * Validates: Requirements 5.3, 5.6, 6.4
 *
 * 对任意非空数值数组，normalizeChartData(items, valueKey) 返回的归一化结果应满足：
 * - 所有 heightPercent 值在 [0, 1] 闭区间内
 * - 最大值对应的 heightPercent 为 1，isMax 为 true
 * - 当 max ≠ min 时：最小值对应的 heightPercent 为 0，isMin 为 true
 * - 当所有值相等时：所有 heightPercent 为 1
 * - 原始数据的相对大小关系保持不变
 * - 恰好有一个元素的 isMax 为 true，恰好有一个元素的 isMin 为 true
 */
describe('Feature: health-stats-page, Property 3: 图表数据归一化正确性', function () {
  it('heightPercent 在 [0,1] 区间、最大值 heightPercent 为 1、相对大小关系保持不变、恰好一个 isMax 和一个 isMin', function () {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({ value: fc.double({ min: 0, max: 10000, noNaN: true }) }),
          { minLength: 1, maxLength: 50 }
        ),
        function (items) {
          var result = normalizeChartData(items, 'value');

          // Result length matches input length
          expect(result.length).toBe(items.length);

          // Find max and min values from input
          var maxVal = items[0].value;
          var minVal = items[0].value;
          for (var i = 1; i < items.length; i++) {
            if (items[i].value > maxVal) maxVal = items[i].value;
            if (items[i].value < minVal) minVal = items[i].value;
          }
          var allEqual = maxVal === minVal;

          // 1. All heightPercent values are in [0, 1] closed interval
          for (var a = 0; a < result.length; a++) {
            expect(result[a].heightPercent).toBeGreaterThanOrEqual(0);
            expect(result[a].heightPercent).toBeLessThanOrEqual(1);
          }

          // 2. The max value item has heightPercent === 1 and isMax === true
          var maxItems = result.filter(function (r) { return r.value === maxVal; });
          var hasMaxWithHeightOne = maxItems.some(function (r) {
            return r.heightPercent === 1 && r.isMax === true;
          });
          expect(hasMaxWithHeightOne).toBe(true);

          // 3. When max ≠ min: min value item has heightPercent === 0 and isMin === true
          if (!allEqual) {
            var minItems = result.filter(function (r) { return r.value === minVal; });
            var hasMinWithHeightZero = minItems.some(function (r) {
              return r.heightPercent === 0 && r.isMin === true;
            });
            expect(hasMinWithHeightZero).toBe(true);
          }

          // 4. When all values equal: all heightPercent === 1
          if (allEqual) {
            for (var b = 0; b < result.length; b++) {
              expect(result[b].heightPercent).toBe(1);
            }
          }

          // 5. Relative order preserved: if items[i].value > items[j].value
          //    then result[i].heightPercent >= result[j].heightPercent
          for (var p = 0; p < items.length; p++) {
            for (var q = p + 1; q < items.length; q++) {
              if (items[p].value > items[q].value) {
                expect(result[p].heightPercent).toBeGreaterThanOrEqual(result[q].heightPercent);
              } else if (items[q].value > items[p].value) {
                expect(result[q].heightPercent).toBeGreaterThanOrEqual(result[p].heightPercent);
              }
            }
          }

          // 6. Exactly one isMax === true and exactly one isMin === true
          var isMaxCount = 0;
          var isMinCount = 0;
          for (var c = 0; c < result.length; c++) {
            if (result[c].isMax === true) isMaxCount++;
            if (result[c].isMin === true) isMinCount++;
          }
          expect(isMaxCount).toBe(1);
          expect(isMinCount).toBe(1);
        }
      ),
      { numRuns: 100 }
    );
  });
});
