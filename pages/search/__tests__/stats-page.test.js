// pages/search/__tests__/stats-page.test.js
// Unit tests for stats page logic (pages/search/index.js)

describe('Stats page logic', function () {
  var pageConfig;
  var originalWx;
  var originalPage;
  var mockWxCloud;
  var mockGenerateDateRange;
  var mockBuildWeightChartData;
  var mockBuildCalorieChartData;

  beforeEach(function () {
    // Save originals
    originalWx = global.wx;
    originalPage = global.Page;

    // Mock wx global
    global.wx = {
      getStorageSync: jest.fn(),
      navigateTo: jest.fn(),
      showToast: jest.fn()
    };

    // Mock Page global to capture the page config
    pageConfig = null;
    global.Page = function (config) {
      pageConfig = config;
    };

    // Mock stats-helpers module
    mockGenerateDateRange = jest.fn().mockReturnValue({
      startDate: '2024-01-01',
      endDate: '2024-01-30',
      dateList: ['2024-01-30', '2024-01-29']
    });
    mockBuildWeightChartData = jest.fn().mockReturnValue([]);
    mockBuildCalorieChartData = jest.fn().mockReturnValue([]);

    jest.mock('../stats-helpers', function () {
      return {
        generateDateRange: mockGenerateDateRange,
        buildWeightChartData: mockBuildWeightChartData,
        buildCalorieChartData: mockBuildCalorieChartData
      };
    });

    // Mock requestApi module
    mockWxCloud = jest.fn().mockResolvedValue({ code: 0, data: [] });
    jest.mock('../../../network/requestApi', function () {
      return {
        wxCloud: mockWxCloud
      };
    });

    // Clear module cache so index.js re-executes and calls our mocked Page()
    jest.resetModules();
    require('../index');
  });

  afterEach(function () {
    global.wx = originalWx;
    global.Page = originalPage;
    jest.restoreAllMocks();
  });

  // Helper: attach setData mock to pageConfig
  function setupPageInstance() {
    var dataStore = Object.assign({}, pageConfig.data);
    pageConfig.setData = jest.fn(function (obj) {
      Object.assign(dataStore, obj);
      Object.assign(pageConfig.data, obj);
    });
    return dataStore;
  }

  // --- Test: onShow when not logged in ---
  // **Validates: Requirements 8.1, 8.2**
  test('onShow sets isLoggedIn false and loading false when not logged in, does NOT call loadAllData', function () {
    setupPageInstance();

    // Spy on loadAllData to verify it is NOT called
    pageConfig.loadAllData = jest.fn();

    // getStorageSync returns falsy for 'health_logged_in'
    global.wx.getStorageSync.mockReturnValue('');

    pageConfig.onShow.call(pageConfig);

    expect(global.wx.getStorageSync).toHaveBeenCalledWith('health_logged_in');
    expect(pageConfig.setData).toHaveBeenCalledWith({ isLoggedIn: false, loading: false });
    expect(pageConfig.loadAllData).not.toHaveBeenCalled();
  });

  // --- Test: onShow when logged in ---
  // **Validates: Requirements 7.1, 8.1**
  test('onShow sets isLoggedIn true and calls loadAllData when logged in', function () {
    setupPageInstance();

    // Spy on loadAllData
    pageConfig.loadAllData = jest.fn();

    // getStorageSync returns truthy for 'health_logged_in'
    global.wx.getStorageSync.mockReturnValue(true);

    pageConfig.onShow.call(pageConfig);

    expect(global.wx.getStorageSync).toHaveBeenCalledWith('health_logged_in');
    expect(pageConfig.setData).toHaveBeenCalledWith({ isLoggedIn: true });
    expect(pageConfig.loadAllData).toHaveBeenCalled();
  });

  // --- Test: loadCalorieTips success ---
  // **Validates: Requirements 3.1**
  test('loadCalorieTips sets calorieTips and tipsLoadError false on success', function () {
    setupPageInstance();

    var tipsData = [
      { foodName: '米饭', portion: '100g', calories: 116 },
      { foodName: '鸡蛋', portion: '1个(50g)', calories: 72 }
    ];
    mockWxCloud.mockResolvedValue({ code: 0, data: tipsData });

    return pageConfig.loadCalorieTips.call(pageConfig).then(function () {
      expect(mockWxCloud).toHaveBeenCalledWith('get-food-calorie-tips', { action: 'getAll' });
      expect(pageConfig.setData).toHaveBeenCalledWith({ calorieTips: tipsData, tipsLoadError: false });
    });
  });

  // --- Test: loadCalorieTips failure ---
  // **Validates: Requirements 7.3**
  test('loadCalorieTips sets tipsLoadError true on failure', function () {
    setupPageInstance();

    mockWxCloud.mockRejectedValue(new Error('network error'));

    return pageConfig.loadCalorieTips.call(pageConfig).catch(function () {
      expect(pageConfig.setData).toHaveBeenCalledWith({ tipsLoadError: true });
    });
  });

  // --- Test: loadWeightData empty data ---
  // **Validates: Requirements 5.4**
  test('loadWeightData sets weightEmpty true when data is empty', function () {
    setupPageInstance();

    mockWxCloud.mockResolvedValue({ code: 0, data: [] });

    return pageConfig.loadWeightData.call(pageConfig).then(function () {
      expect(pageConfig.setData).toHaveBeenCalledWith({ weightEmpty: true, weightChartData: [] });
    });
  });

  // --- Test: loadCalorieData empty data ---
  // **Validates: Requirements 6.5**
  test('loadCalorieData sets calorieEmpty true when all days have empty data', function () {
    setupPageInstance();

    // All daily queries return empty data
    mockWxCloud.mockResolvedValue({ code: 0, data: [] });

    return pageConfig.loadCalorieData.call(pageConfig).then(function () {
      expect(pageConfig.setData).toHaveBeenCalledWith({ calorieEmpty: true, calorieChartData: [] });
    });
  });

  // --- Test: goToLogin ---
  // **Validates: Requirements 8.3**
  test('goToLogin navigates to login page', function () {
    pageConfig.goToLogin.call(pageConfig);

    expect(global.wx.navigateTo).toHaveBeenCalledWith({ url: '/pages/login/index' });
  });
});
