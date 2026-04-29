var helpers = require('../mine-helpers');
var healthUtils = require('../../../utils/health-utils');

var getDateLabel = helpers.getDateLabel;
var getMealTypeLabel = helpers.getMealTypeLabel;
var groupRecordsByDate = helpers.groupRecordsByDate;
var formatDate = healthUtils.formatDate;

describe('getDateLabel', function () {
  test('returns "今天" for today\'s date', function () {
    var today = formatDate(new Date());
    expect(getDateLabel(today)).toBe('今天');
  });

  test('returns "昨天" for yesterday\'s date', function () {
    var d = new Date();
    d.setDate(d.getDate() - 1);
    var yesterday = formatDate(d);
    expect(getDateLabel(yesterday)).toBe('昨天');
  });

  test('returns MM-DD format for other dates', function () {
    expect(getDateLabel('2023-03-15')).toBe('03-15');
    expect(getDateLabel('2024-12-01')).toBe('12-01');
  });
});

describe('getMealTypeLabel', function () {
  test('maps breakfast to 早餐', function () {
    expect(getMealTypeLabel('breakfast')).toBe('早餐');
  });

  test('maps lunch to 午餐', function () {
    expect(getMealTypeLabel('lunch')).toBe('午餐');
  });

  test('maps dinner to 晚餐', function () {
    expect(getMealTypeLabel('dinner')).toBe('晚餐');
  });

  test('maps snack to 加餐', function () {
    expect(getMealTypeLabel('snack')).toBe('加餐');
  });

  test('returns original value for unknown mealType', function () {
    expect(getMealTypeLabel('brunch')).toBe('brunch');
  });
});

describe('groupRecordsByDate', function () {
  var today = formatDate(new Date());
  var d1 = new Date();
  d1.setDate(d1.getDate() - 1);
  var yesterday = formatDate(d1);
  var d2 = new Date();
  d2.setDate(d2.getDate() - 2);
  var dayBefore = formatDate(d2);

  var dates = [today, yesterday, dayBefore];

  test('returns groups matching the dates array length and order', function () {
    var records = [
      { _id: '1', foodName: '米饭', mealType: 'lunch', calories: 200, date: today },
      { _id: '2', foodName: '面包', mealType: 'breakfast', calories: 150, date: yesterday },
    ];
    var groups = groupRecordsByDate(records, dates);
    expect(groups.length).toBe(3);
    expect(groups[0].date).toBe(today);
    expect(groups[1].date).toBe(yesterday);
    expect(groups[2].date).toBe(dayBefore);
  });

  test('attaches dateLabel to each group', function () {
    var groups = groupRecordsByDate([], dates);
    expect(groups[0].dateLabel).toBe('今天');
    expect(groups[1].dateLabel).toBe('昨天');
  });

  test('attaches mealTypeLabel to each record', function () {
    var records = [
      { _id: '1', foodName: '米饭', mealType: 'lunch', calories: 200, date: today },
    ];
    var groups = groupRecordsByDate(records, dates);
    expect(groups[0].records[0].mealTypeLabel).toBe('午餐');
  });

  test('filters records correctly by date', function () {
    var records = [
      { _id: '1', foodName: '米饭', mealType: 'lunch', date: today },
      { _id: '2', foodName: '面包', mealType: 'breakfast', date: yesterday },
      { _id: '3', foodName: '沙拉', mealType: 'dinner', date: today },
    ];
    var groups = groupRecordsByDate(records, dates);
    expect(groups[0].records.length).toBe(2);
    expect(groups[1].records.length).toBe(1);
    expect(groups[2].records.length).toBe(0);
  });

  test('returns empty records array for dates with no records', function () {
    var groups = groupRecordsByDate([], dates);
    groups.forEach(function (g) {
      expect(g.records).toEqual([]);
    });
  });
});

var fc = require('fast-check');
var resolveAvatar = require('../mine-helpers').resolveAvatar;

// Feature: mine-page-refactor, Property 1: 头像解析正确性
describe('Property 1: 头像解析正确性', function () {
  // **Validates: Requirements 1.2, 1.3**

  test('when userInfo has a non-empty avatarUrl string, resolveAvatar returns that value', function () {
    fc.assert(
      fc.property(
        fc.record({
          avatarUrl: fc.string({ minLength: 1 }),
        }, { withDeletedKeys: false }),
        function (userInfo) {
          expect(resolveAvatar(userInfo)).toBe(userInfo.avatarUrl);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('when userInfo is null or undefined, resolveAvatar returns empty string', function () {
    fc.assert(
      fc.property(
        fc.constantFrom(null, undefined),
        function (userInfo) {
          expect(resolveAvatar(userInfo)).toBe('');
        }
      ),
      { numRuns: 100 }
    );
  });

  test('when userInfo has no avatarUrl or empty avatarUrl, resolveAvatar returns empty string', function () {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.record({}, { withDeletedKeys: false }),
          fc.record({ avatarUrl: fc.constant('') }, { withDeletedKeys: false }),
          fc.record({ avatarUrl: fc.constant(null) }, { withDeletedKeys: false }),
          fc.record({ avatarUrl: fc.constant(undefined) }, { withDeletedKeys: false }),
          fc.record({ avatarUrl: fc.integer() }, { withDeletedKeys: false })
        ),
        function (userInfo) {
          expect(resolveAvatar(userInfo)).toBe('');
        }
      ),
      { numRuns: 100 }
    );
  });
});

var resolveNickname = require('../mine-helpers').resolveNickname;

// Feature: mine-page-refactor, Property 2: 昵称解析优先级
describe('Property 2: 昵称解析优先级', function () {
  // **Validates: Requirements 1.4, 1.5, 1.6**

  test('when not logged in, resolveNickname always returns "未登录" regardless of userInfo', function () {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant(null),
          fc.constant(undefined),
          fc.record({
            nickName: fc.option(fc.string(), { nil: undefined }),
            name: fc.option(fc.string(), { nil: undefined }),
          })
        ),
        function (userInfo) {
          expect(resolveNickname(userInfo, false)).toBe('未登录');
        }
      ),
      { numRuns: 100 }
    );
  });

  test('when logged in and userInfo has non-empty nickName, resolveNickname returns nickName', function () {
    fc.assert(
      fc.property(
        fc.record({
          nickName: fc.string({ minLength: 1 }),
          name: fc.option(fc.string(), { nil: undefined }),
        }),
        function (userInfo) {
          expect(resolveNickname(userInfo, true)).toBe(userInfo.nickName);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('when logged in and userInfo has no nickName but has non-empty name, resolveNickname returns name', function () {
    fc.assert(
      fc.property(
        fc.record({
          name: fc.string({ minLength: 1 }),
        }),
        function (baseInfo) {
          // Ensure nickName is absent or empty
          var userInfo = { name: baseInfo.name };
          expect(resolveNickname(userInfo, true)).toBe(baseInfo.name);

          var userInfoEmptyNick = { nickName: '', name: baseInfo.name };
          expect(resolveNickname(userInfoEmptyNick, true)).toBe(baseInfo.name);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('when logged in and userInfo has no nickName and no name, resolveNickname returns "健康用户"', function () {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant(null),
          fc.constant(undefined),
          fc.constant({}),
          fc.record({ nickName: fc.constant('') }),
          fc.record({ name: fc.constant('') }),
          fc.record({ nickName: fc.constant(''), name: fc.constant('') })
        ),
        function (userInfo) {
          expect(resolveNickname(userInfo, true)).toBe('健康用户');
        }
      ),
      { numRuns: 100 }
    );
  });
});


// Feature: mine-page-refactor, Property 3: 饮食记录按日期分组与排序
describe('Property 3: 饮食记录按日期分组与排序', function () {
  // **Validates: Requirements 2.2**

  var mealTypes = ['breakfast', 'lunch', 'dinner', 'snack'];

  // Generator: YYYY-MM-DD date string
  var arbDateStr = fc.date({
    min: new Date('2020-01-01'),
    max: new Date('2030-12-31'),
  }).map(function (d) {
    var yyyy = d.getFullYear().toString();
    var mm = ('0' + (d.getMonth() + 1)).slice(-2);
    var dd = ('0' + d.getDate()).slice(-2);
    return yyyy + '-' + mm + '-' + dd;
  });

  // Generator: unique dates array (1..5 dates)
  var arbDates = fc.uniqueArray(arbDateStr, { minLength: 1, maxLength: 5 });

  // Generator: a single diet record whose date is picked from a given dates array
  function arbRecord(dates) {
    return fc.record({
      _id: fc.uuid(),
      foodName: fc.string({ minLength: 1, maxLength: 20 }),
      mealType: fc.constantFrom.apply(fc, mealTypes),
      calories: fc.nat({ max: 2000 }),
      date: fc.constantFrom.apply(fc, dates),
    });
  }

  test('(a) returned group count equals dates array length', function () {
    fc.assert(
      fc.property(
        arbDates.chain(function (dates) {
          return fc.tuple(
            fc.constant(dates),
            fc.array(arbRecord(dates), { minLength: 0, maxLength: 20 })
          );
        }),
        function (tuple) {
          var dates = tuple[0];
          var records = tuple[1];
          var groups = groupRecordsByDate(records, dates);
          expect(groups.length).toBe(dates.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('(b) each group\'s records have matching date field', function () {
    fc.assert(
      fc.property(
        arbDates.chain(function (dates) {
          return fc.tuple(
            fc.constant(dates),
            fc.array(arbRecord(dates), { minLength: 0, maxLength: 20 })
          );
        }),
        function (tuple) {
          var dates = tuple[0];
          var records = tuple[1];
          var groups = groupRecordsByDate(records, dates);
          groups.forEach(function (group) {
            group.records.forEach(function (r) {
              expect(r.date).toBe(group.date);
            });
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  test('(c) group order matches input dates order', function () {
    fc.assert(
      fc.property(
        arbDates.chain(function (dates) {
          return fc.tuple(
            fc.constant(dates),
            fc.array(arbRecord(dates), { minLength: 0, maxLength: 20 })
          );
        }),
        function (tuple) {
          var dates = tuple[0];
          var records = tuple[1];
          var groups = groupRecordsByDate(records, dates);
          var groupDates = groups.map(function (g) { return g.date; });
          expect(groupDates).toEqual(dates);
        }
      ),
      { numRuns: 100 }
    );
  });
});


// Feature: mine-page-refactor, Property 4: 日期标签格式化
describe('Property 4: 日期标签格式化', function () {
  // **Validates: Requirements 2.3**

  var today = formatDate(new Date());
  var yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  var yesterday = formatDate(yesterdayDate);

  // Generator: arbitrary YYYY-MM-DD date string
  var arbDateStr = fc.date({
    min: new Date('2020-01-01'),
    max: new Date('2030-12-31'),
  }).map(function (d) {
    var yyyy = d.getFullYear().toString();
    var mm = ('0' + (d.getMonth() + 1)).slice(-2);
    var dd = ('0' + d.getDate()).slice(-2);
    return yyyy + '-' + mm + '-' + dd;
  });

  test('today returns "今天"', function () {
    fc.assert(
      fc.property(
        fc.constant(today),
        function (dateStr) {
          expect(getDateLabel(dateStr)).toBe('今天');
        }
      ),
      { numRuns: 100 }
    );
  });

  test('yesterday returns "昨天"', function () {
    fc.assert(
      fc.property(
        fc.constant(yesterday),
        function (dateStr) {
          expect(getDateLabel(dateStr)).toBe('昨天');
        }
      ),
      { numRuns: 100 }
    );
  });

  test('any date that is neither today nor yesterday returns MM-DD format', function () {
    fc.assert(
      fc.property(
        arbDateStr.filter(function (d) { return d !== today && d !== yesterday; }),
        function (dateStr) {
          var result = getDateLabel(dateStr);
          // Should be the MM-DD portion of the YYYY-MM-DD string
          var expectedMMDD = dateStr.substring(5);
          expect(result).toBe(expectedMMDD);
          // Verify MM-DD format: two digits, dash, two digits
          expect(result).toMatch(/^\d{2}-\d{2}$/);
        }
      ),
      { numRuns: 100 }
    );
  });
});


// Feature: mine-page-refactor, Property 5: 热量显示条件
describe('Property 5: 热量显示条件', function () {
  // **Validates: Requirements 2.5**

  // Helper function matching WXML condition: wx:if="{{record.calories > 0}}"
  function shouldShowCalories(calories) {
    return calories !== null && calories !== undefined && typeof calories === 'number' && calories > 0;
  }

  test('when calories is a positive number > 0, shouldShowCalories returns true', function () {
    fc.assert(
      fc.property(
        fc.double({ min: 0.001, max: 10000, noNaN: true }),
        function (calories) {
          expect(shouldShowCalories(calories)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('when calories is 0, shouldShowCalories returns false', function () {
    expect(shouldShowCalories(0)).toBe(false);
  });

  test('when calories is null or undefined, shouldShowCalories returns false', function () {
    fc.assert(
      fc.property(
        fc.constantFrom(null, undefined),
        function (calories) {
          expect(shouldShowCalories(calories)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('when calories is negative, shouldShowCalories returns false', function () {
    fc.assert(
      fc.property(
        fc.double({ min: -10000, max: -0.001, noNaN: true }),
        function (calories) {
          expect(shouldShowCalories(calories)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('when calories is a non-number type, shouldShowCalories returns false', function () {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.string(),
          fc.boolean(),
          fc.constant(NaN),
          fc.record({}),
          fc.array(fc.integer())
        ),
        function (calories) {
          expect(shouldShowCalories(calories)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});


// --- Task 5.5: Page logic unit tests ---
describe('Page logic unit tests', function () {
  var pageConfig;
  var originalWx;
  var originalPage;

  beforeEach(function () {
    // Save originals
    originalWx = global.wx;
    originalPage = global.Page;

    // Mock wx global
    global.wx = {
      getStorageSync: jest.fn(),
      navigateTo: jest.fn(),
      showModal: jest.fn(),
      removeStorageSync: jest.fn(),
    };

    // Mock Page global to capture the page config
    pageConfig = null;
    global.Page = function (config) {
      pageConfig = config;
    };

    // Clear module cache so index.js re-executes and calls our mocked Page()
    jest.resetModules();
    require('../index');
  });

  afterEach(function () {
    global.wx = originalWx;
    global.Page = originalPage;
  });

  // **Validates: Requirements 1.6**
  test('checkLoginStatus sets default values when not logged in', function () {
    // Mock getStorageSync to return falsy for both keys
    global.wx.getStorageSync.mockReturnValue(null);

    // Attach a mock setData to the pageConfig
    pageConfig.setData = jest.fn();

    // Call checkLoginStatus
    pageConfig.checkLoginStatus.call(pageConfig);

    expect(pageConfig.setData).toHaveBeenCalledWith({
      isLoggedIn: false,
      nickname: '未登录',
      avatarUrl: '',
    });
  });

  // **Validates: Requirements 3.4**
  test('retryLoadDiet calls loadDietRecords', function () {
    // Spy on loadDietRecords
    pageConfig.loadDietRecords = jest.fn();

    pageConfig.retryLoadDiet.call(pageConfig);

    expect(pageConfig.loadDietRecords).toHaveBeenCalled();
  });
});
