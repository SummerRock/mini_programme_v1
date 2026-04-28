// Mock wx-server-sdk before requiring the module
const mockGet = jest.fn()

const mockCollection = jest.fn(() => ({
  get: mockGet,
}))

const mockDb = { collection: mockCollection }

jest.mock('wx-server-sdk', () => {
  const sdk = {
    DYNAMIC_CURRENT_ENV: 'test-env',
    init: jest.fn(),
    database: jest.fn(() => mockDb),
  }
  return sdk
})

const { main, success, fail } = require('../index')
const cloud = require('wx-server-sdk')

beforeEach(() => {
  jest.clearAllMocks()
  // Re-setup chained mocks after clear
  mockCollection.mockReturnValue({
    get: mockGet,
  })
})

// ==================== success / fail 辅助函数 ====================
describe('success and fail helper functions', () => {
  test('success returns { code: 0, message: "success", data }', () => {
    const data = [{ id: 'tip_001', title: '喝水', content: '每天8杯水' }]
    const result = success(data)

    expect(result).toEqual({ code: 0, message: 'success', data })
  })

  test('success with null data returns { code: 0, message: "success", data: null }', () => {
    const result = success(null)

    expect(result).toEqual({ code: 0, message: 'success', data: null })
  })

  test('fail returns { code, message, data: null }', () => {
    const result = fail(1001, '无效的 action: unknown')

    expect(result).toEqual({ code: 1001, message: '无效的 action: unknown', data: null })
  })

  test('fail with code 5000 returns server error', () => {
    const result = fail(5000, '服务器内部错误')

    expect(result).toEqual({ code: 5000, message: '服务器内部错误', data: null })
  })
})

// ==================== getTips action ====================
describe('getTips action', () => {
  test('should query health_tips collection and return data', async () => {
    const mockTips = [
      { id: 'tip_001', title: '每天喝8杯水', content: '保持充足的水分摄入' },
      { id: 'tip_002', title: '规律作息', content: '早睡早起身体好' },
    ]
    mockGet.mockResolvedValue({ data: mockTips })

    const result = await main({ action: 'getTips' })

    expect(result.code).toBe(0)
    expect(result.message).toBe('success')
    expect(result.data).toEqual(mockTips)
    expect(mockCollection).toHaveBeenCalledWith('health_tips')
    expect(mockGet).toHaveBeenCalledTimes(1)
  })

  test('should return empty array when collection is empty', async () => {
    mockGet.mockResolvedValue({ data: [] })

    const result = await main({ action: 'getTips' })

    expect(result.code).toBe(0)
    expect(result.data).toEqual([])
  })
})

// ==================== getQuotes action ====================
describe('getQuotes action', () => {
  test('should query motivational_quotes collection and return data', async () => {
    const mockQuotes = [
      { id: 'quote_001', text: '健康是最大的财富', author: '维吉尔' },
      { id: 'quote_002', text: '生命在于运动', author: null },
    ]
    mockGet.mockResolvedValue({ data: mockQuotes })

    const result = await main({ action: 'getQuotes' })

    expect(result.code).toBe(0)
    expect(result.message).toBe('success')
    expect(result.data).toEqual(mockQuotes)
    expect(mockCollection).toHaveBeenCalledWith('motivational_quotes')
    expect(mockGet).toHaveBeenCalledTimes(1)
  })

  test('should return empty array when collection is empty', async () => {
    mockGet.mockResolvedValue({ data: [] })

    const result = await main({ action: 'getQuotes' })

    expect(result.code).toBe(0)
    expect(result.data).toEqual([])
  })
})

// ==================== getAll action ====================
describe('getAll action', () => {
  test('should query both collections and return { tips, quotes }', async () => {
    const mockTips = [{ id: 'tip_001', title: '喝水', content: '每天8杯水' }]
    const mockQuotes = [{ id: 'quote_001', text: '加油', author: '佚名' }]

    // getAll calls collection('health_tips').get() and collection('motivational_quotes').get()
    // via Promise.all, so mockGet is called twice
    mockGet
      .mockResolvedValueOnce({ data: mockTips })
      .mockResolvedValueOnce({ data: mockQuotes })

    const result = await main({ action: 'getAll' })

    expect(result.code).toBe(0)
    expect(result.message).toBe('success')
    expect(result.data).toEqual({ tips: mockTips, quotes: mockQuotes })
    expect(mockCollection).toHaveBeenCalledWith('health_tips')
    expect(mockCollection).toHaveBeenCalledWith('motivational_quotes')
    expect(mockGet).toHaveBeenCalledTimes(2)
  })

  test('should return empty arrays when both collections are empty', async () => {
    mockGet
      .mockResolvedValueOnce({ data: [] })
      .mockResolvedValueOnce({ data: [] })

    const result = await main({ action: 'getAll' })

    expect(result.code).toBe(0)
    expect(result.data).toEqual({ tips: [], quotes: [] })
  })
})

// ==================== 无效 action ====================
describe('invalid action', () => {
  test('should return 1001 for unknown action', async () => {
    const result = await main({ action: 'unknown' })

    expect(result.code).toBe(1001)
    expect(result.message).toContain('无效的 action')
    expect(result.data).toBeNull()
  })

  test('should return 1001 for undefined action', async () => {
    const result = await main({})

    expect(result.code).toBe(1001)
    expect(result.data).toBeNull()
  })
})

// ==================== 异常处理 ====================
describe('error handling', () => {
  test('should return 5000 when database query throws', async () => {
    mockGet.mockRejectedValue(new Error('db connection failed'))

    const result = await main({ action: 'getTips' })

    expect(result.code).toBe(5000)
    expect(result.message).toBe('服务器内部错误')
    expect(result.data).toBeNull()
  })

  test('should return 5000 when getAll has a database error', async () => {
    mockGet.mockRejectedValue(new Error('timeout'))

    const result = await main({ action: 'getAll' })

    expect(result.code).toBe(5000)
    expect(result.message).toBe('服务器内部错误')
    expect(result.data).toBeNull()
  })

  test('should return 5000 when cloud.database throws', async () => {
    cloud.database.mockImplementationOnce(() => {
      throw new Error('sdk init failed')
    })

    const result = await main({ action: 'getTips' })

    expect(result.code).toBe(5000)
    expect(result.data).toBeNull()
  })
})

// ==================== 响应格式一致性 ====================
describe('response format consistency', () => {
  test('success response has code, message, data fields', async () => {
    mockGet.mockResolvedValue({ data: [] })

    const result = await main({ action: 'getTips' })

    expect(result).toHaveProperty('code')
    expect(result).toHaveProperty('message')
    expect(result).toHaveProperty('data')
    expect(typeof result.code).toBe('number')
    expect(typeof result.message).toBe('string')
  })

  test('error response has code, message, data fields', async () => {
    const result = await main({ action: 'invalid' })

    expect(result).toHaveProperty('code')
    expect(result).toHaveProperty('message')
    expect(result).toHaveProperty('data')
    expect(typeof result.code).toBe('number')
    expect(typeof result.message).toBe('string')
  })
})

// ==================== 属性测试 ====================
// **Feature: cloud-data-migration, Property 1: 响应格式一致性**
// **Validates: Requirements 2.5**
const fc = require('fast-check')

describe('Property 1: 响应格式一致性', () => {
  // Arbitrary that generates random action strings including valid and invalid values
  const actionArb = fc.oneof(
    fc.constant('getTips'),
    fc.constant('getQuotes'),
    fc.constant('getAll'),
    fc.string()
  )

  const validActions = ['getTips', 'getQuotes', 'getAll']

  it('response always contains code (number), message (string), and data fields', async () => {
    await fc.assert(
      fc.asyncProperty(actionArb, async (action) => {
        // Setup mocks for valid actions so they succeed
        if (validActions.includes(action)) {
          if (action === 'getAll') {
            mockGet
              .mockResolvedValueOnce({ data: [{ id: 'tip_001', title: 'test', content: 'test' }] })
              .mockResolvedValueOnce({ data: [{ id: 'quote_001', text: 'test', author: null }] })
          } else {
            mockGet.mockResolvedValueOnce({ data: [{ id: 'item_001' }] })
          }
        }

        const result = await main({ action })

        // Response must have all three fields
        expect(result).toHaveProperty('code')
        expect(result).toHaveProperty('message')
        expect(result).toHaveProperty('data')

        // Type checks
        expect(typeof result.code).toBe('number')
        expect(typeof result.message).toBe('string')

        // code === 0 implies data !== null
        if (result.code === 0) {
          expect(result.data).not.toBeNull()
        }

        // code !== 0 implies data === null
        if (result.code !== 0) {
          expect(result.data).toBeNull()
        }
      }),
      { numRuns: 100 }
    )
  })
})

// **Feature: cloud-data-migration, Property 2: 无效 action 拒绝**
// **Validates: Requirements 2.6**
describe('Property 2: 无效 action 拒绝', () => {
  const validActions = ['getTips', 'getQuotes', 'getAll']

  it('any action not in validActions returns code 1001 and data null', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string().filter((s) => !validActions.includes(s)),
        async (action) => {
          const result = await main({ action })

          expect(result.code).toBe(1001)
          expect(result.data).toBeNull()
        }
      ),
      { numRuns: 100 }
    )
  })
})
