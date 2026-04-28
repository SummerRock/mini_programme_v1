/**
 * 首页页面逻辑单元测试 — 适配异步云端数据加载
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 5.1, 5.2, 5.3, 5.4, 5.5
 */

// --- Shared test data ---
var mockTips = [
  { id: 'tip_001', title: '每天喝8杯水', content: '保持充足的水分摄入...' },
  { id: 'tip_002', title: '规律作息', content: '每天保持固定的睡眠时间...' },
  { id: 'tip_003', title: '每天运动30分钟', content: '世界卫生组织建议...' },
  { id: 'tip_004', title: '多吃蔬菜水果', content: '每天摄入至少五份...' },
  { id: 'tip_005', title: '保持好心情', content: '积极的心态有助于健康...' },
  { id: 'tip_006', title: '定期体检', content: '每年至少进行一次全面体检...' }
]

var mockQuotes = [
  { id: 'quote_001', text: '健康是最大的财富', author: '维吉尔' },
  { id: 'quote_002', text: '早睡早起', author: '富兰克林' },
  { id: 'quote_003', text: '生命在于运动', author: '伏尔泰' }
]

// Helper: flush all pending microtasks (resolved promises)
function flushPromises() {
  return new Promise(function (resolve) {
    setTimeout(resolve, 0)
  })
}

// Helper: create a page instance from a captured Page config
function createPageInstance(config) {
  var instance = Object.create(null)
  instance.data = JSON.parse(JSON.stringify(config.data))
  var keys = Object.keys(config)
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i]
    if (typeof config[key] === 'function') {
      instance[key] = config[key].bind(instance)
    }
  }
  instance.setData = jest.fn(function (obj) {
    var dataKeys = Object.keys(obj)
    for (var j = 0; j < dataKeys.length; j++) {
      instance.data[dataKeys[j]] = obj[dataKeys[j]]
    }
  })
  return instance
}

// ============================================================
// Test suite: Cloud data loading scenarios
// ============================================================
describe('pages/index/index.js — async cloud data loading', function () {
  var mockWxCloud
  var mockStopPullDownRefresh
  var capturedPageConfig
  var page

  /**
   * Each test uses jest.isolateModules so that module-level variables
   * (allTips, allQuotes, tipsLoadFailed, quotesLoadFailed) are reset.
   */
  function loadPageModule(wxCloudImpl, opts) {
    opts = opts || {}
    capturedPageConfig = null

    // Reset module registry to prevent leaking mocks between tests
    jest.resetModules()

    jest.isolateModules(function () {
      // Mock wx global
      global.wx = {
        stopPullDownRefresh: jest.fn()
      }
      mockStopPullDownRefresh = global.wx.stopPullDownRefresh

      // Mock Page global
      global.Page = function (config) {
        capturedPageConfig = config
      }

      // Mock network/requestApi.js — wxCloud
      jest.doMock('../../../network/requestApi', function () {
        return { wxCloud: wxCloudImpl }
      })

      // Mock local JSON data files
      // To simulate load failure, return a non-array value so the source code's
      // `if (!Array.isArray(...)) throw` validation triggers the catch branch.
      if (opts.tipsThrow) {
        jest.doMock('../../../data/health-tips.json', function () {
          return 'INVALID'
        })
      } else {
        jest.doMock('../../../data/health-tips.json', function () {
          return mockTips
        })
      }

      if (opts.quotesThrow) {
        jest.doMock('../../../data/motivational-quotes.json', function () {
          return 'INVALID'
        })
      } else {
        jest.doMock('../../../data/motivational-quotes.json', function () {
          return mockQuotes
        })
      }

      require('../index')
    })

    page = createPageInstance(capturedPageConfig)
  }

  afterEach(function () {
    jest.restoreAllMocks()
  })

  // --- Requirement 5.5: Greeting_Banner renders immediately, no cloud dependency ---
  test('onLoad immediately renders greeting and displayDate without waiting for cloud data', function () {
    mockWxCloud = jest.fn(function () {
      return new Promise(function () {}) // never resolves
    })
    loadPageModule(mockWxCloud)

    page.onLoad()

    // Greeting and date are set synchronously in the first setData call
    expect(typeof page.data.greeting).toBe('string')
    expect(page.data.greeting.length).toBeGreaterThan(0)
    expect(typeof page.data.displayDate).toBe('string')
    expect(page.data.displayDate).toMatch(/\d+月\d+日 星期[日一二三四五六]/)
  })

  // --- Requirement 3.1, 3.3: Cloud function success renders cloud data ---
  test('cloud function success: renders cloud data (tips and quote)', async function () {
    mockWxCloud = jest.fn(function () {
      return Promise.resolve({
        code: 0,
        message: 'success',
        data: { tips: mockTips, quotes: mockQuotes }
      })
    })
    loadPageModule(mockWxCloud)

    page.onLoad()
    await flushPromises()

    // wxCloud was called with correct params
    expect(mockWxCloud).toHaveBeenCalledWith('get-homepage-data', { action: 'getAll' })

    // Tips rendered (5 or fewer since mockTips has 6)
    expect(Array.isArray(page.data.tipsList)).toBe(true)
    expect(page.data.tipsList.length).toBe(5)
    page.data.tipsList.forEach(function (tip) {
      expect(tip).toHaveProperty('id')
      expect(tip).toHaveProperty('title')
      expect(tip).toHaveProperty('content')
    })

    // Quote rendered
    expect(page.data.currentQuote).not.toBeNull()
    expect(page.data.currentQuote).toHaveProperty('id')
    expect(page.data.currentQuote).toHaveProperty('text')

    // No errors
    expect(page.data.tipsLoadError).toBe(false)
    expect(page.data.quotesLoadError).toBe(false)
  })

  // --- Requirement 5.1, 5.2, 3.2: loading state set and cleared ---
  test('loading is true initially and set to false after cloud data loads', async function () {
    mockWxCloud = jest.fn(function () {
      return Promise.resolve({
        code: 0,
        message: 'success',
        data: { tips: mockTips, quotes: mockQuotes }
      })
    })
    loadPageModule(mockWxCloud)

    // Before onLoad, loading should be true (initial data)
    expect(page.data.loading).toBe(true)

    page.onLoad()

    // After onLoad but before promise resolves, loading is still true
    expect(page.data.loading).toBe(true)

    await flushPromises()

    // After cloud data loads, loading is false
    expect(page.data.loading).toBe(false)
  })

  // --- Requirement 4.1, 5.3: Cloud failure triggers local fallback, no error shown ---
  test('cloud function failure: falls back to local JSON data, no error shown', async function () {
    mockWxCloud = jest.fn(function () {
      return Promise.reject(new Error('Network error'))
    })
    loadPageModule(mockWxCloud)

    page.onLoad()
    await flushPromises()

    // Data loaded from local fallback
    expect(Array.isArray(page.data.tipsList)).toBe(true)
    expect(page.data.tipsList.length).toBeGreaterThan(0)
    expect(page.data.currentQuote).not.toBeNull()

    // No error flags — fallback succeeded silently
    expect(page.data.tipsLoadError).toBe(false)
    expect(page.data.quotesLoadError).toBe(false)
    expect(page.data.loading).toBe(false)
  })

  // --- Requirement 4.1: Cloud returns non-zero code triggers fallback ---
  test('cloud function returns error code: falls back to local JSON data', async function () {
    mockWxCloud = jest.fn(function () {
      return Promise.resolve({ code: 5000, message: '服务器内部错误', data: null })
    })
    loadPageModule(mockWxCloud)

    page.onLoad()
    await flushPromises()

    expect(Array.isArray(page.data.tipsList)).toBe(true)
    expect(page.data.tipsList.length).toBeGreaterThan(0)
    expect(page.data.currentQuote).not.toBeNull()
    expect(page.data.tipsLoadError).toBe(false)
    expect(page.data.quotesLoadError).toBe(false)
  })

  // --- Requirement 4.3: Cloud fails AND local tips fail → tipsLoadError ---
  test('cloud and local tips both fail: shows tipsLoadError', async function () {
    mockWxCloud = jest.fn(function () {
      return Promise.reject(new Error('Network error'))
    })
    loadPageModule(mockWxCloud, { tipsThrow: true })

    page.onLoad()
    await flushPromises()

    expect(page.data.tipsLoadError).toBe(true)
    // quotes still loaded from local
    expect(page.data.quotesLoadError).toBe(false)
    expect(page.data.currentQuote).not.toBeNull()
    expect(page.data.loading).toBe(false)
  })

  // --- Requirement 4.3: Cloud fails AND local quotes fail → quotesLoadError ---
  test('cloud and local quotes both fail: shows quotesLoadError', async function () {
    mockWxCloud = jest.fn(function () {
      return Promise.reject(new Error('Network error'))
    })
    loadPageModule(mockWxCloud, { quotesThrow: true })

    page.onLoad()
    await flushPromises()

    expect(page.data.quotesLoadError).toBe(true)
    // tips still loaded from local
    expect(page.data.tipsLoadError).toBe(false)
    expect(page.data.tipsList.length).toBeGreaterThan(0)
    expect(page.data.loading).toBe(false)
  })

  // --- Requirement 4.3: Cloud fails AND both local files fail → both errors ---
  test('cloud and all local data fail: shows both error flags', async function () {
    mockWxCloud = jest.fn(function () {
      return Promise.reject(new Error('Network error'))
    })
    loadPageModule(mockWxCloud, { tipsThrow: true, quotesThrow: true })

    page.onLoad()
    await flushPromises()

    expect(page.data.tipsLoadError).toBe(true)
    expect(page.data.quotesLoadError).toBe(true)
    expect(page.data.loading).toBe(false)
  })

  // --- Requirement 3.4, 3.5: Pull-down refresh triggers cloud call and stopPullDownRefresh ---
  test('onPullDownRefresh triggers cloud call and calls stopPullDownRefresh', async function () {
    var callCount = 0
    mockWxCloud = jest.fn(function () {
      callCount++
      return Promise.resolve({
        code: 0,
        message: 'success',
        data: { tips: mockTips, quotes: mockQuotes }
      })
    })
    loadPageModule(mockWxCloud)

    // First load
    page.onLoad()
    await flushPromises()
    expect(callCount).toBe(1)

    // Pull down refresh
    page.onPullDownRefresh()
    await flushPromises()

    expect(callCount).toBe(2)
    expect(mockStopPullDownRefresh).toHaveBeenCalled()
  })

  // --- Requirement 3.5: stopPullDownRefresh called even when cloud fails ---
  test('onPullDownRefresh calls stopPullDownRefresh even on cloud failure', async function () {
    mockWxCloud = jest.fn(function () {
      return Promise.reject(new Error('Network error'))
    })
    loadPageModule(mockWxCloud)

    page.onLoad()
    await flushPromises()

    page.onPullDownRefresh()
    await flushPromises()

    expect(mockStopPullDownRefresh).toHaveBeenCalled()
  })

  // --- onTipTap still works ---
  test('onTipTap expands and collapses tips', async function () {
    mockWxCloud = jest.fn(function () {
      return Promise.resolve({
        code: 0,
        message: 'success',
        data: { tips: mockTips, quotes: mockQuotes }
      })
    })
    loadPageModule(mockWxCloud)

    page.onLoad()
    await flushPromises()

    var tipId = page.data.tipsList[0].id

    page.onTipTap({ currentTarget: { dataset: { id: tipId } } })
    expect(page.data.expandedTipId).toBe(tipId)

    page.onTipTap({ currentTarget: { dataset: { id: tipId } } })
    expect(page.data.expandedTipId).toBeNull()
  })
})
