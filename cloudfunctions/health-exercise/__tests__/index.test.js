// Mock wx-server-sdk before requiring the module
const mockAdd = jest.fn()
const mockGet = jest.fn()
const mockUpdate = jest.fn()
const mockRemove = jest.fn()
const mockWhere = jest.fn()
const mockOrderBy = jest.fn()
const mockDoc = jest.fn()

const mockCollection = jest.fn(() => ({
  add: mockAdd,
  where: mockWhere,
  doc: mockDoc,
}))

mockWhere.mockReturnValue({ orderBy: mockOrderBy })
mockOrderBy.mockReturnValue({ get: mockGet })
mockDoc.mockReturnValue({ get: mockGet, update: mockUpdate, remove: mockRemove })

const mockDb = { collection: mockCollection }

jest.mock('wx-server-sdk', () => {
  const sdk = {
    DYNAMIC_CURRENT_ENV: 'test-env',
    init: jest.fn(),
    getWXContext: jest.fn(() => ({ OPENID: 'test-openid' })),
    database: jest.fn(() => mockDb),
  }
  return sdk
})

const { main } = require('../index')
const cloud = require('wx-server-sdk')

beforeEach(() => {
  jest.clearAllMocks()
  // Re-setup chained mocks after clear
  mockCollection.mockReturnValue({
    add: mockAdd,
    where: mockWhere,
    doc: mockDoc,
  })
  mockWhere.mockReturnValue({ orderBy: mockOrderBy })
  mockOrderBy.mockReturnValue({ get: mockGet })
  mockDoc.mockReturnValue({ get: mockGet, update: mockUpdate, remove: mockRemove })
  cloud.getWXContext.mockReturnValue({ OPENID: 'test-openid' })
})

// ==================== ADD 操作 ====================
describe('add action', () => {
  const validEvent = {
    action: 'add',
    exerciseType: '跑步',
    duration: 30,
    calories: 200,
    date: '2024-01-15',
  }

  test('should add an exercise record successfully', async () => {
    mockAdd.mockResolvedValue({ _id: 'new-id-123' })

    const result = await main(validEvent)

    expect(result.code).toBe(0)
    expect(result.message).toBe('success')
    expect(result.data._id).toBe('new-id-123')
    expect(mockCollection).toHaveBeenCalledWith('health_exercise')
    expect(mockAdd).toHaveBeenCalledWith({
      data: expect.objectContaining({
        _openid: 'test-openid',
        exerciseType: '跑步',
        duration: 30,
        calories: 200,
        date: '2024-01-15',
      }),
    })
  })

  test('should add record without optional calories', async () => {
    mockAdd.mockResolvedValue({ _id: 'new-id-456' })

    const result = await main({
      action: 'add',
      exerciseType: '游泳',
      duration: 60,
      date: '2024-01-15',
    })

    expect(result.code).toBe(0)
    const addedData = mockAdd.mock.calls[0][0].data
    expect(addedData.calories).toBeUndefined()
  })

  test('should return 1001 when exerciseType is missing', async () => {
    const result = await main({ action: 'add', duration: 30, date: '2024-01-15' })

    expect(result.code).toBe(1001)
    expect(result.data).toBeNull()
    expect(mockAdd).not.toHaveBeenCalled()
  })

  test('should return 1001 when duration is missing', async () => {
    const result = await main({ action: 'add', exerciseType: '跑步', date: '2024-01-15' })

    expect(result.code).toBe(1001)
    expect(result.data).toBeNull()
    expect(mockAdd).not.toHaveBeenCalled()
  })

  test('should return 1001 when duration is 0', async () => {
    const result = await main({
      action: 'add',
      exerciseType: '跑步',
      duration: 0,
      date: '2024-01-15',
    })

    expect(result.code).toBe(1001)
    expect(mockAdd).not.toHaveBeenCalled()
  })

  test('should return 1001 when duration is negative', async () => {
    const result = await main({
      action: 'add',
      exerciseType: '跑步',
      duration: -10,
      date: '2024-01-15',
    })

    expect(result.code).toBe(1001)
    expect(mockAdd).not.toHaveBeenCalled()
  })

  test('should return 1001 when calories is negative', async () => {
    const result = await main({
      action: 'add',
      exerciseType: '跑步',
      duration: 30,
      calories: -100,
      date: '2024-01-15',
    })

    expect(result.code).toBe(1001)
    expect(mockAdd).not.toHaveBeenCalled()
  })

  test('should return 1001 when date is missing', async () => {
    const result = await main({
      action: 'add',
      exerciseType: '跑步',
      duration: 30,
    })

    expect(result.code).toBe(1001)
    expect(mockAdd).not.toHaveBeenCalled()
  })

  test('should allow zero calories', async () => {
    mockAdd.mockResolvedValue({ _id: 'id-zero-cal' })

    const result = await main({
      action: 'add',
      exerciseType: '散步',
      duration: 15,
      calories: 0,
      date: '2024-01-15',
    })

    expect(result.code).toBe(0)
  })
})

// ==================== QUERY 操作 ====================
describe('query action', () => {
  test('should query records by date successfully', async () => {
    const mockRecords = [
      { _id: '1', exerciseType: '跑步', duration: 30, date: '2024-01-15' },
      { _id: '2', exerciseType: '游泳', duration: 60, date: '2024-01-15' },
    ]
    mockGet.mockResolvedValue({ data: mockRecords })

    const result = await main({ action: 'query', date: '2024-01-15' })

    expect(result.code).toBe(0)
    expect(result.data).toEqual(mockRecords)
    expect(mockWhere).toHaveBeenCalledWith({ _openid: 'test-openid', date: '2024-01-15' })
    expect(mockOrderBy).toHaveBeenCalledWith('createdAt', 'asc')
  })

  test('should return empty array when no records found', async () => {
    mockGet.mockResolvedValue({ data: [] })

    const result = await main({ action: 'query', date: '2024-12-31' })

    expect(result.code).toBe(0)
    expect(result.data).toEqual([])
  })

  test('should return 1001 when date is missing', async () => {
    const result = await main({ action: 'query' })

    expect(result.code).toBe(1001)
    expect(mockWhere).not.toHaveBeenCalled()
  })
})

// ==================== UPDATE 操作 ====================
describe('update action', () => {
  test('should update a record successfully', async () => {
    mockGet.mockResolvedValue({ data: { _id: 'rec-1', _openid: 'test-openid' } })
    mockUpdate.mockResolvedValue({ stats: { updated: 1 } })

    const result = await main({
      action: 'update',
      id: 'rec-1',
      exerciseType: '骑行',
      duration: 45,
    })

    expect(result.code).toBe(0)
    expect(result.data._id).toBe('rec-1')
    expect(mockDoc).toHaveBeenCalledWith('rec-1')
    expect(mockUpdate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        exerciseType: '骑行',
        duration: 45,
      }),
    })
  })

  test('should return 1001 when id is missing', async () => {
    const result = await main({ action: 'update', exerciseType: '骑行' })

    expect(result.code).toBe(1001)
    expect(mockDoc).not.toHaveBeenCalled()
  })

  test('should return 1001 when duration is 0 on update', async () => {
    const result = await main({
      action: 'update',
      id: 'rec-1',
      duration: 0,
    })

    expect(result.code).toBe(1001)
  })

  test('should return 1001 when duration is negative on update', async () => {
    const result = await main({
      action: 'update',
      id: 'rec-1',
      duration: -5,
    })

    expect(result.code).toBe(1001)
  })

  test('should return 1001 when calories is negative on update', async () => {
    const result = await main({
      action: 'update',
      id: 'rec-1',
      calories: -50,
    })

    expect(result.code).toBe(1001)
  })

  test('should return 1002 when updating another user record', async () => {
    mockGet.mockResolvedValue({ data: { _id: 'rec-1', _openid: 'other-user' } })

    const result = await main({
      action: 'update',
      id: 'rec-1',
      exerciseType: '骑行',
    })

    expect(result.code).toBe(1002)
    expect(mockUpdate).not.toHaveBeenCalled()
  })
})

// ==================== DELETE 操作 ====================
describe('delete action', () => {
  test('should delete a record successfully', async () => {
    mockGet.mockResolvedValue({ data: { _id: 'rec-1', _openid: 'test-openid' } })
    mockRemove.mockResolvedValue({ stats: { removed: 1 } })

    const result = await main({ action: 'delete', id: 'rec-1' })

    expect(result.code).toBe(0)
    expect(result.data._id).toBe('rec-1')
    expect(mockRemove).toHaveBeenCalled()
  })

  test('should return 1001 when id is missing', async () => {
    const result = await main({ action: 'delete' })

    expect(result.code).toBe(1001)
    expect(mockDoc).not.toHaveBeenCalled()
  })

  test('should return 1002 when deleting another user record', async () => {
    mockGet.mockResolvedValue({ data: { _id: 'rec-1', _openid: 'other-user' } })

    const result = await main({ action: 'delete', id: 'rec-1' })

    expect(result.code).toBe(1002)
    expect(mockRemove).not.toHaveBeenCalled()
  })
})

// ==================== UNKNOWN ACTION & ERROR ====================
describe('unknown action and error handling', () => {
  test('should return 1001 for unknown action', async () => {
    const result = await main({ action: 'unknown' })

    expect(result.code).toBe(1001)
    expect(result.data).toBeNull()
  })

  test('should return 5000 when an exception is thrown', async () => {
    cloud.getWXContext.mockImplementation(() => {
      throw new Error('unexpected error')
    })

    const result = await main({ action: 'add', exerciseType: '跑步', duration: 30, date: '2024-01-15' })

    expect(result.code).toBe(5000)
    expect(result.message).toBe('服务器内部错误')
    expect(result.data).toBeNull()
  })

  test('should return 5000 when database operation throws', async () => {
    mockAdd.mockRejectedValue(new Error('db error'))

    const result = await main({
      action: 'add',
      exerciseType: '跑步',
      duration: 30,
      calories: 200,
      date: '2024-01-15',
    })

    expect(result.code).toBe(5000)
    expect(result.data).toBeNull()
  })
})

// ==================== RESPONSE FORMAT ====================
describe('response format consistency', () => {
  test('success response has code, message, data fields', async () => {
    mockAdd.mockResolvedValue({ _id: 'id-1' })

    const result = await main({
      action: 'add',
      exerciseType: '跑步',
      duration: 30,
      date: '2024-01-15',
    })

    expect(result).toHaveProperty('code')
    expect(result).toHaveProperty('message')
    expect(result).toHaveProperty('data')
    expect(typeof result.code).toBe('number')
    expect(typeof result.message).toBe('string')
  })

  test('error response has code, message, data fields', async () => {
    const result = await main({ action: 'add' })

    expect(result).toHaveProperty('code')
    expect(result).toHaveProperty('message')
    expect(result).toHaveProperty('data')
    expect(typeof result.code).toBe('number')
    expect(typeof result.message).toBe('string')
  })
})


// ==================== 属性测试：无效输入拒绝 ====================
// **Feature: health-tracker, Property 3: 无效输入拒绝**
// **Validates: Requirements 2.5, 2.6, 2.7, 5.3**

const fc = require('fast-check')

describe('Property 3: 无效输入拒绝 (exercise records)', () => {
  // Arbitraries for valid fields (used as base when only one field is invalid)
  const validExerciseTypeArb = fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0)
  const validDurationArb = fc.integer({ min: 1, max: 1440 })
  const validCaloriesArb = fc.nat({ max: 10000 })
  const validDateArb = fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') })
    .map(d => d.toISOString().slice(0, 10))

  // **Validates: Requirement 2.5** - missing exerciseType rejects with 1001
  test('should reject add when exerciseType is missing (undefined, null, or empty string)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(undefined, null, ''),
        validDurationArb,
        validCaloriesArb,
        validDateArb,
        async (exerciseType, duration, calories, date) => {
          mockAdd.mockClear()
          const result = await main({
            action: 'add',
            exerciseType,
            duration,
            calories,
            date,
          })
          expect(result.code).toBe(1001)
          expect(result.data).toBeNull()
          expect(mockAdd).not.toHaveBeenCalled()
        }
      ),
      { numRuns: 100 }
    )
  })

  // **Validates: Requirement 2.6** - missing or non-positive duration rejects with 1001
  test('should reject add when duration is missing or non-positive (undefined, null, 0, negative)', async () => {
    const invalidDurationArb = fc.oneof(
      fc.constant(undefined),
      fc.constant(null),
      fc.constant(0),
      fc.integer({ min: -100000, max: -1 })
    )

    await fc.assert(
      fc.asyncProperty(
        validExerciseTypeArb,
        invalidDurationArb,
        validCaloriesArb,
        validDateArb,
        async (exerciseType, duration, calories, date) => {
          mockAdd.mockClear()
          const result = await main({
            action: 'add',
            exerciseType,
            duration,
            calories,
            date,
          })
          expect(result.code).toBe(1001)
          expect(result.data).toBeNull()
          expect(mockAdd).not.toHaveBeenCalled()
        }
      ),
      { numRuns: 100 }
    )
  })

  // **Validates: Requirement 2.7** - negative calories rejects with 1001
  test('should reject add when calories is negative', async () => {
    const negativeCaloriesArb = fc.integer({ min: -100000, max: -1 })

    await fc.assert(
      fc.asyncProperty(
        validExerciseTypeArb,
        validDurationArb,
        negativeCaloriesArb,
        validDateArb,
        async (exerciseType, duration, calories, date) => {
          mockAdd.mockClear()
          const result = await main({
            action: 'add',
            exerciseType,
            duration,
            calories,
            date,
          })
          expect(result.code).toBe(1001)
          expect(result.data).toBeNull()
          expect(mockAdd).not.toHaveBeenCalled()
        }
      ),
      { numRuns: 100 }
    )
  })

  // **Validates: Requirement 5.3** - missing date rejects with 1001
  test('should reject add when date is missing (undefined, null, or empty string)', async () => {
    await fc.assert(
      fc.asyncProperty(
        validExerciseTypeArb,
        validDurationArb,
        validCaloriesArb,
        fc.constantFrom(undefined, null, ''),
        async (exerciseType, duration, calories, date) => {
          mockAdd.mockClear()
          const result = await main({
            action: 'add',
            exerciseType,
            duration,
            calories,
            date,
          })
          expect(result.code).toBe(1001)
          expect(result.data).toBeNull()
          expect(mockAdd).not.toHaveBeenCalled()
        }
      ),
      { numRuns: 100 }
    )
  })
})
