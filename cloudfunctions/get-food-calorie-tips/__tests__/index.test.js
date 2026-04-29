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
    const data = [{ foodName: '米饭', portion: '100g', calories: 116 }]
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

// ==================== getAll action ====================
describe('getAll action', () => {
  test('should query food_calorie_tips collection and return data', async () => {
    const mockTips = [
      { foodName: '米饭', portion: '100g', calories: 116 },
      { foodName: '鸡蛋', portion: '1个(50g)', calories: 72 },
      { foodName: '苹果', portion: '1个(200g)', calories: 104 },
    ]
    mockGet.mockResolvedValue({ data: mockTips })

    const result = await main({ action: 'getAll' })

    expect(result.code).toBe(0)
    expect(result.message).toBe('success')
    expect(result.data).toEqual(mockTips)
    expect(mockCollection).toHaveBeenCalledWith('food_calorie_tips')
    expect(mockGet).toHaveBeenCalledTimes(1)
  })

  test('should return empty array when collection is empty', async () => {
    mockGet.mockResolvedValue({ data: [] })

    const result = await main({ action: 'getAll' })

    expect(result.code).toBe(0)
    expect(result.data).toEqual([])
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

    const result = await main({ action: 'getAll' })

    expect(result.code).toBe(5000)
    expect(result.message).toBe('服务器内部错误')
    expect(result.data).toBeNull()
  })

  test('should return 5000 when cloud.database throws', async () => {
    cloud.database.mockImplementationOnce(() => {
      throw new Error('sdk init failed')
    })

    const result = await main({ action: 'getAll' })

    expect(result.code).toBe(5000)
    expect(result.data).toBeNull()
  })
})

// ==================== 响应格式一致性 ====================
describe('response format consistency', () => {
  test('success response has code, message, data fields', async () => {
    mockGet.mockResolvedValue({ data: [] })

    const result = await main({ action: 'getAll' })

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
