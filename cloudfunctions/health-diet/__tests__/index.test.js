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
    foodName: '米饭',
    mealType: 'lunch',
    calories: 200,
    date: '2024-01-15',
  }

  test('should add a diet record successfully', async () => {
    mockAdd.mockResolvedValue({ _id: 'new-id-123' })

    const result = await main(validEvent)

    expect(result.code).toBe(0)
    expect(result.message).toBe('success')
    expect(result.data._id).toBe('new-id-123')
    expect(mockCollection).toHaveBeenCalledWith('health_diet')
    expect(mockAdd).toHaveBeenCalledWith({
      data: expect.objectContaining({
        _openid: 'test-openid',
        foodName: '米饭',
        mealType: 'lunch',
        calories: 200,
        date: '2024-01-15',
      }),
    })
  })

  test('should add record without optional calories and note', async () => {
    mockAdd.mockResolvedValue({ _id: 'new-id-456' })

    const result = await main({
      action: 'add',
      foodName: '面条',
      mealType: 'dinner',
      date: '2024-01-15',
    })

    expect(result.code).toBe(0)
    const addedData = mockAdd.mock.calls[0][0].data
    expect(addedData.calories).toBeUndefined()
    expect(addedData.note).toBeUndefined()
  })

  test('should return 1001 when foodName is missing', async () => {
    const result = await main({ action: 'add', mealType: 'lunch', date: '2024-01-15' })

    expect(result.code).toBe(1001)
    expect(result.data).toBeNull()
    expect(mockAdd).not.toHaveBeenCalled()
  })

  test('should return 1001 when mealType is invalid', async () => {
    const result = await main({
      action: 'add',
      foodName: '米饭',
      mealType: 'brunch',
      date: '2024-01-15',
    })

    expect(result.code).toBe(1001)
    expect(mockAdd).not.toHaveBeenCalled()
  })

  test('should return 1001 when mealType is missing', async () => {
    const result = await main({
      action: 'add',
      foodName: '米饭',
      date: '2024-01-15',
    })

    expect(result.code).toBe(1001)
    expect(mockAdd).not.toHaveBeenCalled()
  })

  test('should return 1001 when calories is negative', async () => {
    const result = await main({
      action: 'add',
      foodName: '米饭',
      mealType: 'lunch',
      calories: -100,
      date: '2024-01-15',
    })

    expect(result.code).toBe(1001)
    expect(mockAdd).not.toHaveBeenCalled()
  })

  test('should return 1001 when date is missing', async () => {
    const result = await main({
      action: 'add',
      foodName: '米饭',
      mealType: 'lunch',
    })

    expect(result.code).toBe(1001)
    expect(mockAdd).not.toHaveBeenCalled()
  })

  test('should allow zero calories', async () => {
    mockAdd.mockResolvedValue({ _id: 'id-zero-cal' })

    const result = await main({
      action: 'add',
      foodName: '水',
      mealType: 'snack',
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
      { _id: '1', foodName: '米饭', mealType: 'lunch', date: '2024-01-15' },
      { _id: '2', foodName: '面条', mealType: 'dinner', date: '2024-01-15' },
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
      foodName: '炒饭',
      mealType: 'lunch',
    })

    expect(result.code).toBe(0)
    expect(result.data._id).toBe('rec-1')
    expect(mockDoc).toHaveBeenCalledWith('rec-1')
    expect(mockUpdate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        foodName: '炒饭',
        mealType: 'lunch',
      }),
    })
  })

  test('should return 1001 when id is missing', async () => {
    const result = await main({ action: 'update', foodName: '炒饭' })

    expect(result.code).toBe(1001)
    expect(mockDoc).not.toHaveBeenCalled()
  })

  test('should return 1001 when mealType is invalid on update', async () => {
    const result = await main({
      action: 'update',
      id: 'rec-1',
      mealType: 'invalid-type',
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
      foodName: '炒饭',
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

    const result = await main({ action: 'add', foodName: '米饭', mealType: 'lunch', date: '2024-01-15' })

    expect(result.code).toBe(5000)
    expect(result.message).toBe('服务器内部错误')
    expect(result.data).toBeNull()
  })

  test('should return 5000 when database operation throws', async () => {
    mockAdd.mockRejectedValue(new Error('db error'))

    const result = await main({
      action: 'add',
      foodName: '米饭',
      mealType: 'lunch',
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
      foodName: '米饭',
      mealType: 'lunch',
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
// **Validates: Requirements 1.5, 1.6, 1.7, 5.3**

const fc = require('fast-check')

describe('Property 3: 无效输入拒绝 (diet records)', () => {
  // Arbitrary for valid fields (used as base for partial invalidity)
  const validMealTypes = ['breakfast', 'lunch', 'dinner', 'snack']
  const validDateArb = fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') })
    .map(d => d.toISOString().slice(0, 10))
  const validMealTypeArb = fc.constantFrom(...validMealTypes)
  const validFoodNameArb = fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0)
  const validCaloriesArb = fc.nat({ max: 10000 })

  // **Validates: Requirement 1.5** - missing foodName rejects with 1001
  test('should reject add when foodName is missing (undefined, null, or empty string)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(undefined, null, ''),
        validMealTypeArb,
        validCaloriesArb,
        validDateArb,
        async (foodName, mealType, calories, date) => {
          mockAdd.mockClear()
          const result = await main({
            action: 'add',
            foodName,
            mealType,
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

  // **Validates: Requirement 1.6** - invalid mealType rejects with 1001
  test('should reject add when mealType is not in valid enum', async () => {
    const invalidMealTypeArb = fc.string({ minLength: 1, maxLength: 30 })
      .filter(s => !validMealTypes.includes(s))

    await fc.assert(
      fc.asyncProperty(
        validFoodNameArb,
        invalidMealTypeArb,
        validCaloriesArb,
        validDateArb,
        async (foodName, mealType, calories, date) => {
          mockAdd.mockClear()
          const result = await main({
            action: 'add',
            foodName,
            mealType,
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

  // **Validates: Requirement 1.7** - negative calories rejects with 1001
  test('should reject add when calories is negative', async () => {
    const negativeCaloriesArb = fc.integer({ min: -100000, max: -1 })

    await fc.assert(
      fc.asyncProperty(
        validFoodNameArb,
        validMealTypeArb,
        negativeCaloriesArb,
        validDateArb,
        async (foodName, mealType, calories, date) => {
          mockAdd.mockClear()
          const result = await main({
            action: 'add',
            foodName,
            mealType,
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
  test('should reject add when date is missing', async () => {
    await fc.assert(
      fc.asyncProperty(
        validFoodNameArb,
        validMealTypeArb,
        validCaloriesArb,
        fc.constantFrom(undefined, null, ''),
        async (foodName, mealType, calories, date) => {
          mockAdd.mockClear()
          const result = await main({
            action: 'add',
            foodName,
            mealType,
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


// ==================== 属性测试：响应格式一致性 ====================
// **Feature: health-tracker, Property 6: 响应格式一致性**
// **Validates: Requirements 5.1, 5.2**

describe('Property 6: 响应格式一致性 (diet records)', () => {
  const validMealTypes = ['breakfast', 'lunch', 'dinner', 'snack']
  const validDateArb = fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') })
    .map(d => d.toISOString().slice(0, 10))
  const validMealTypeArb = fc.constantFrom(...validMealTypes)
  const validFoodNameArb = fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0)

  /**
   * Helper: asserts that a response object has the correct format:
   * - code is a number
   * - message is a string
   * - data is present (can be null or object)
   */
  function assertResponseFormat(result) {
    expect(result).toHaveProperty('code')
    expect(result).toHaveProperty('message')
    expect(result).toHaveProperty('data')
    expect(typeof result.code).toBe('number')
    expect(typeof result.message).toBe('string')
    expect('data' in result).toBe(true)
  }

  // 1. Random action strings → response always has code, message, data
  test('random action strings always produce valid response format', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 0, maxLength: 50 }),
        async (action) => {
          // Setup mocks for actions that might hit DB
          mockAdd.mockResolvedValue({ _id: 'test-id' })
          mockGet.mockResolvedValue({ data: { _id: 'test-id', _openid: 'test-openid' } })
          mockUpdate.mockResolvedValue({ stats: { updated: 1 } })
          mockRemove.mockResolvedValue({ stats: { removed: 1 } })

          const result = await main({ action })
          assertResponseFormat(result)
        }
      ),
      { numRuns: 100 }
    )
  })

  // 2. Add with random valid/invalid inputs → response always has code, message, data
  test('add action with random inputs always produces valid response format', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(validFoodNameArb, fc.constant(undefined), fc.constant(null), fc.constant('')),
        fc.oneof(validMealTypeArb, fc.string({ minLength: 0, maxLength: 20 }), fc.constant(undefined)),
        fc.oneof(fc.integer({ min: -1000, max: 10000 }), fc.constant(undefined), fc.constant(null)),
        fc.oneof(validDateArb, fc.constant(undefined), fc.constant(null), fc.constant('')),
        fc.oneof(fc.string({ minLength: 0, maxLength: 100 }), fc.constant(undefined)),
        async (foodName, mealType, calories, date, note) => {
          mockAdd.mockResolvedValue({ _id: 'test-id' })

          const result = await main({
            action: 'add',
            foodName,
            mealType,
            calories,
            date,
            note,
          })
          assertResponseFormat(result)
          // When operation succeeds, code === 0
          if (result.code === 0) {
            expect(result.code).toBe(0)
            expect(result.data).not.toBeNull()
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  // 3. Query with random inputs → response always has code, message, data
  test('query action with random inputs always produces valid response format', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(validDateArb, fc.constant(undefined), fc.constant(null), fc.constant(''), fc.string({ minLength: 0, maxLength: 30 })),
        async (date) => {
          mockGet.mockResolvedValue({ data: [] })

          const result = await main({ action: 'query', date })
          assertResponseFormat(result)
          if (result.code === 0) {
            expect(result.code).toBe(0)
            expect(result.data).not.toBeNull()
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  // 4. Update with random inputs → response always has code, message, data
  test('update action with random inputs always produces valid response format', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(fc.string({ minLength: 1, maxLength: 30 }), fc.constant(undefined), fc.constant(null), fc.constant('')),
        fc.oneof(validFoodNameArb, fc.constant(undefined)),
        fc.oneof(validMealTypeArb, fc.string({ minLength: 0, maxLength: 20 }), fc.constant(undefined)),
        fc.oneof(fc.integer({ min: -1000, max: 10000 }), fc.constant(undefined), fc.constant(null)),
        async (id, foodName, mealType, calories) => {
          mockGet.mockResolvedValue({ data: { _id: 'test-id', _openid: 'test-openid' } })
          mockUpdate.mockResolvedValue({ stats: { updated: 1 } })

          const result = await main({
            action: 'update',
            id,
            foodName,
            mealType,
            calories,
          })
          assertResponseFormat(result)
          if (result.code === 0) {
            expect(result.code).toBe(0)
            expect(result.data).not.toBeNull()
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  // 5. Delete with random inputs → response always has code, message, data
  test('delete action with random inputs always produces valid response format', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(fc.string({ minLength: 1, maxLength: 30 }), fc.constant(undefined), fc.constant(null), fc.constant('')),
        async (id) => {
          mockGet.mockResolvedValue({ data: { _id: 'test-id', _openid: 'test-openid' } })
          mockRemove.mockResolvedValue({ stats: { removed: 1 } })

          const result = await main({ action: 'delete', id })
          assertResponseFormat(result)
          if (result.code === 0) {
            expect(result.code).toBe(0)
            expect(result.data).not.toBeNull()
          }
        }
      ),
      { numRuns: 100 }
    )
  })
})
