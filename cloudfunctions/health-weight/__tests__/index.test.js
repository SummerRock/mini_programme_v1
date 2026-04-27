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

mockWhere.mockReturnValue({ orderBy: mockOrderBy, get: mockGet })
mockOrderBy.mockReturnValue({ get: mockGet })
mockDoc.mockReturnValue({ get: mockGet, update: mockUpdate, remove: mockRemove })

// Mock db.command for range queries
const mockAnd = jest.fn()
const mockGte = jest.fn()
const mockLte = jest.fn()

mockGte.mockReturnValue({ and: mockAnd })
mockAnd.mockReturnValue('combined-condition')
mockLte.mockReturnValue('lte-condition')

const mockCommand = { gte: mockGte, lte: mockLte }
const mockDb = { collection: mockCollection, command: mockCommand }

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
  mockWhere.mockReturnValue({ orderBy: mockOrderBy, get: mockGet })
  mockOrderBy.mockReturnValue({ get: mockGet })
  mockDoc.mockReturnValue({ get: mockGet, update: mockUpdate, remove: mockRemove })
  // Re-setup command mocks
  mockGte.mockReturnValue({ and: mockAnd })
  mockAnd.mockReturnValue('combined-condition')
  mockLte.mockReturnValue('lte-condition')

  cloud.getWXContext.mockReturnValue({ OPENID: 'test-openid' })
})

// ==================== ADD 操作 ====================
describe('add action', () => {
  const validEvent = {
    action: 'add',
    weight: 70,
    date: '2024-01-15',
  }

  test('should add a weight record successfully', async () => {
    mockGet.mockResolvedValue({ data: [] })
    mockAdd.mockResolvedValue({ _id: 'new-id-123' })

    const result = await main(validEvent)

    expect(result.code).toBe(0)
    expect(result.message).toBe('success')
    expect(result.data._id).toBe('new-id-123')
    expect(mockCollection).toHaveBeenCalledWith('health_weight')
    expect(mockAdd).toHaveBeenCalledWith({
      data: expect.objectContaining({
        _openid: 'test-openid',
        weight: 70,
        date: '2024-01-15',
      }),
    })
  })

  test('should return 1001 when weight is below 20', async () => {
    const result = await main({ action: 'add', weight: 19, date: '2024-01-15' })

    expect(result.code).toBe(1001)
    expect(result.data).toBeNull()
    expect(mockAdd).not.toHaveBeenCalled()
  })

  test('should return 1001 when weight is above 300', async () => {
    const result = await main({ action: 'add', weight: 301, date: '2024-01-15' })

    expect(result.code).toBe(1001)
    expect(result.data).toBeNull()
    expect(mockAdd).not.toHaveBeenCalled()
  })

  test('should return 1001 when weight is missing', async () => {
    const result = await main({ action: 'add', date: '2024-01-15' })

    expect(result.code).toBe(1001)
    expect(result.data).toBeNull()
    expect(mockAdd).not.toHaveBeenCalled()
  })

  test('should return 1001 when date is missing', async () => {
    const result = await main({ action: 'add', weight: 70 })

    expect(result.code).toBe(1001)
    expect(result.data).toBeNull()
    expect(mockAdd).not.toHaveBeenCalled()
  })

  test('should upsert when same-date record already exists', async () => {
    // Mock existing record for the same date
    mockGet.mockResolvedValue({
      data: [{ _id: 'existing-id', _openid: 'test-openid', weight: 70, date: '2024-01-15' }],
    })
    mockUpdate.mockResolvedValue({ stats: { updated: 1 } })

    const result = await main({ action: 'add', weight: 72, date: '2024-01-15' })

    expect(result.code).toBe(0)
    expect(result.data._id).toBe('existing-id')
    // Should call update, not add
    expect(mockUpdate).toHaveBeenCalled()
    expect(mockAdd).not.toHaveBeenCalled()
  })

  test('should accept weight at boundary 20', async () => {
    mockGet.mockResolvedValue({ data: [] })
    mockAdd.mockResolvedValue({ _id: 'boundary-low' })

    const result = await main({ action: 'add', weight: 20, date: '2024-01-15' })
    expect(result.code).toBe(0)
  })

  test('should accept weight at boundary 300', async () => {
    mockGet.mockResolvedValue({ data: [] })
    mockAdd.mockResolvedValue({ _id: 'boundary-high' })

    const result = await main({ action: 'add', weight: 300, date: '2024-01-15' })
    expect(result.code).toBe(0)
  })
})

// ==================== QUERY 操作 ====================
describe('query action', () => {
  test('should query records with startDate and endDate range', async () => {
    const mockRecords = [
      { _id: '1', weight: 70, date: '2024-01-10' },
      { _id: '2', weight: 71, date: '2024-01-15' },
    ]
    mockGet.mockResolvedValue({ data: mockRecords })

    const result = await main({
      action: 'query',
      startDate: '2024-01-01',
      endDate: '2024-01-31',
    })

    expect(result.code).toBe(0)
    expect(result.data).toEqual(mockRecords)
    expect(mockGte).toHaveBeenCalledWith('2024-01-01')
    expect(mockLte).toHaveBeenCalledWith('2024-01-31')
    expect(mockOrderBy).toHaveBeenCalledWith('date', 'asc')
  })

  test('should query with only startDate', async () => {
    mockGet.mockResolvedValue({ data: [] })

    const result = await main({ action: 'query', startDate: '2024-01-01' })

    expect(result.code).toBe(0)
    expect(mockGte).toHaveBeenCalledWith('2024-01-01')
  })

  test('should query with only endDate', async () => {
    mockGet.mockResolvedValue({ data: [] })

    const result = await main({ action: 'query', endDate: '2024-01-31' })

    expect(result.code).toBe(0)
    expect(mockLte).toHaveBeenCalledWith('2024-01-31')
  })

  test('should query without date filters', async () => {
    mockGet.mockResolvedValue({ data: [] })

    const result = await main({ action: 'query' })

    expect(result.code).toBe(0)
    expect(result.data).toEqual([])
  })
})

// ==================== UPDATE 操作 ====================
describe('update action', () => {
  test('should update a record successfully', async () => {
    mockGet.mockResolvedValue({ data: { _id: 'rec-1', _openid: 'test-openid', weight: 70 } })
    mockUpdate.mockResolvedValue({ stats: { updated: 1 } })

    const result = await main({ action: 'update', id: 'rec-1', weight: 72 })

    expect(result.code).toBe(0)
    expect(result.data._id).toBe('rec-1')
    expect(mockDoc).toHaveBeenCalledWith('rec-1')
    expect(mockUpdate).toHaveBeenCalled()
  })

  test('should return 1001 when id is missing for update', async () => {
    const result = await main({ action: 'update', weight: 72 })

    expect(result.code).toBe(1001)
    expect(mockDoc).not.toHaveBeenCalled()
  })

  test('should return 1001 when weight is out of range on update', async () => {
    const result = await main({ action: 'update', id: 'rec-1', weight: 5 })

    expect(result.code).toBe(1001)
  })

  test('should return 1002 when updating another user record', async () => {
    mockGet.mockResolvedValue({ data: { _id: 'rec-1', _openid: 'other-user' } })

    const result = await main({ action: 'update', id: 'rec-1', weight: 72 })

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

  test('should return 1001 when id is missing for delete', async () => {
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

    const result = await main({ action: 'add', weight: 70, date: '2024-01-15' })

    expect(result.code).toBe(5000)
    expect(result.message).toBe('服务器内部错误')
    expect(result.data).toBeNull()
  })

  test('should return 5000 when database operation throws', async () => {
    mockGet.mockRejectedValue(new Error('db error'))

    const result = await main({ action: 'add', weight: 70, date: '2024-01-15' })

    expect(result.code).toBe(5000)
    expect(result.data).toBeNull()
  })
})

// ==================== RESPONSE FORMAT ====================
describe('response format consistency', () => {
  test('success response has code, message, data fields', async () => {
    mockGet.mockResolvedValue({ data: [] })
    mockAdd.mockResolvedValue({ _id: 'id-1' })

    const result = await main({ action: 'add', weight: 70, date: '2024-01-15' })

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

// ==================== 属性测试 ====================
const fc = require('fast-check')

/**
 * **Feature: health-tracker, Property 5: 体重记录同日期幂等性**
 * **Validates: Requirements 3.6**
 *
 * 对于任意用户和任意日期，在该日期多次提交体重记录后，
 * 该用户在该日期的体重记录数量始终为 1，且体重值为最后一次提交的值。
 */
describe('Property 5: 体重记录同日期幂等性', () => {
  test('同一日期多次提交体重，mockAdd 只调用一次，mockUpdate 调用 (n-1) 次，最终返回相同 _id', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate a valid weight between 20 and 300
        fc.integer({ min: 20, max: 300 }),
        // Generate a random date string in YYYY-MM-DD format
        fc.date({
          min: new Date('2020-01-01'),
          max: new Date('2030-12-31'),
        }).map(d => d.toISOString().slice(0, 10)),
        // Generate number of submissions (2-5)
        fc.integer({ min: 2, max: 5 }),
        // Generate array of valid weights for each submission
        fc.array(fc.integer({ min: 20, max: 300 }), { minLength: 5, maxLength: 5 }),
        async (firstWeight, date, numSubmissions, extraWeights) => {
          // Build the list of weights to submit
          const weights = [firstWeight, ...extraWeights.slice(0, numSubmissions - 1)]
          const generatedId = 'gen-id-' + Math.random().toString(36).slice(2, 10)

          // Clear all mocks before this iteration
          jest.clearAllMocks()
          // Re-setup chained mocks
          mockCollection.mockReturnValue({
            add: mockAdd,
            where: mockWhere,
            doc: mockDoc,
          })
          mockWhere.mockReturnValue({ orderBy: mockOrderBy, get: mockGet })
          mockOrderBy.mockReturnValue({ get: mockGet })
          mockDoc.mockReturnValue({ get: mockGet, update: mockUpdate, remove: mockRemove })
          mockGte.mockReturnValue({ and: mockAnd })
          mockAnd.mockReturnValue('combined-condition')
          mockLte.mockReturnValue('lte-condition')
          cloud.getWXContext.mockReturnValue({ OPENID: 'test-openid' })

          const results = []

          for (let i = 0; i < numSubmissions; i++) {
            if (i === 0) {
              // First submission: no existing record
              mockGet.mockResolvedValueOnce({ data: [] })
              mockAdd.mockResolvedValueOnce({ _id: generatedId })
            } else {
              // Subsequent submissions: existing record found
              mockGet.mockResolvedValueOnce({
                data: [{
                  _id: generatedId,
                  _openid: 'test-openid',
                  weight: weights[i - 1],
                  date,
                }],
              })
              mockUpdate.mockResolvedValueOnce({ stats: { updated: 1 } })
            }

            // Re-setup chained mocks for each call since collection() is called each time
            mockCollection.mockReturnValue({
              add: mockAdd,
              where: mockWhere,
              doc: mockDoc,
            })
            mockWhere.mockReturnValue({ orderBy: mockOrderBy, get: mockGet })
            mockDoc.mockReturnValue({ get: mockGet, update: mockUpdate, remove: mockRemove })

            const result = await main({
              action: 'add',
              weight: weights[i],
              date,
            })

            results.push(result)
          }

          // All results should return code=0
          for (const result of results) {
            expect(result.code).toBe(0)
          }

          // All results should return the same _id
          for (const result of results) {
            expect(result.data._id).toBe(generatedId)
          }

          // mockAdd should be called exactly once (first submission)
          expect(mockAdd).toHaveBeenCalledTimes(1)

          // mockUpdate should be called exactly (numSubmissions - 1) times
          expect(mockUpdate).toHaveBeenCalledTimes(numSubmissions - 1)
        }
      ),
      { numRuns: 100 }
    )
  })
})


/**
 * **Feature: health-tracker, Property 4: 数据所有权隔离**
 * **Validates: Requirements 4.2, 5.4**
 *
 * 对于任意两个不同的用户 A 和 B，用户 A 创建的记录，
 * 用户 B 对其执行 update 或 delete 操作时，应返回 code=1002 的权限错误，
 * 且原记录保持不变（mockUpdate/mockRemove 不被调用）。
 */
describe('Property 4: 数据所有权隔离', () => {
  test('用户 B 无法 update 或 delete 用户 A 创建的记录', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate two different user openids
        fc.tuple(
          fc.string({ minLength: 1, maxLength: 32 }),
          fc.string({ minLength: 1, maxLength: 32 })
        ).filter(([a, b]) => a !== b),
        // Generate a valid weight for the record
        fc.integer({ min: 20, max: 300 }),
        // Generate a record id
        fc.string({ minLength: 1, maxLength: 20 }),
        // Generate a date
        fc.date({
          min: new Date('2020-01-01'),
          max: new Date('2030-12-31'),
        }).map(d => d.toISOString().slice(0, 10)),
        async ([userA, userB], weight, recordId, date) => {
          // ---- Test: userB tries to UPDATE userA's record ----

          // Clear mocks and re-setup chains
          jest.clearAllMocks()
          mockCollection.mockReturnValue({
            add: mockAdd,
            where: mockWhere,
            doc: mockDoc,
          })
          mockWhere.mockReturnValue({ orderBy: mockOrderBy, get: mockGet })
          mockOrderBy.mockReturnValue({ get: mockGet })
          mockDoc.mockReturnValue({ get: mockGet, update: mockUpdate, remove: mockRemove })
          mockGte.mockReturnValue({ and: mockAnd })
          mockAnd.mockReturnValue('combined-condition')
          mockLte.mockReturnValue('lte-condition')

          // Set context to userB
          cloud.getWXContext.mockReturnValue({ OPENID: userB })

          // Mock doc().get() to return a record owned by userA
          mockGet.mockResolvedValue({
            data: {
              _id: recordId,
              _openid: userA,
              weight,
              date,
              createdAt: Date.now(),
              updatedAt: Date.now(),
            },
          })

          const updateResult = await main({
            action: 'update',
            id: recordId,
            weight: 75,
          })

          // Should return permission error
          expect(updateResult.code).toBe(1002)
          // Original record should remain unchanged
          expect(mockUpdate).not.toHaveBeenCalled()

          // ---- Test: userB tries to DELETE userA's record ----

          // Clear mocks and re-setup chains for delete test
          jest.clearAllMocks()
          mockCollection.mockReturnValue({
            add: mockAdd,
            where: mockWhere,
            doc: mockDoc,
          })
          mockWhere.mockReturnValue({ orderBy: mockOrderBy, get: mockGet })
          mockOrderBy.mockReturnValue({ get: mockGet })
          mockDoc.mockReturnValue({ get: mockGet, update: mockUpdate, remove: mockRemove })
          mockGte.mockReturnValue({ and: mockAnd })
          mockAnd.mockReturnValue('combined-condition')
          mockLte.mockReturnValue('lte-condition')

          // Set context to userB again
          cloud.getWXContext.mockReturnValue({ OPENID: userB })

          // Mock doc().get() to return a record owned by userA
          mockGet.mockResolvedValue({
            data: {
              _id: recordId,
              _openid: userA,
              weight,
              date,
              createdAt: Date.now(),
              updatedAt: Date.now(),
            },
          })

          const deleteResult = await main({
            action: 'delete',
            id: recordId,
          })

          // Should return permission error
          expect(deleteResult.code).toBe(1002)
          // Original record should remain unchanged
          expect(mockRemove).not.toHaveBeenCalled()
        }
      ),
      { numRuns: 100 }
    )
  })
})
