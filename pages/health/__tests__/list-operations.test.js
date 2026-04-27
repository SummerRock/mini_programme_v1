/**
 * Property-based tests for list operations (removeRecordFromList)
 *
 * **Feature: health-tracker-frontend, Property 6: 删除操作后列表状态正确性**
 * **Validates: Requirements 6.3, 6.4**
 */
const fc = require('fast-check')

// Must set globals before requiring the module since Page() is called at module level
global.wx = {
  cloud: { init: jest.fn(), callFunction: jest.fn() },
  getStorageSync: jest.fn(),
  showLoading: jest.fn(),
  hideLoading: jest.fn(),
  showToast: jest.fn(),
  showModal: jest.fn(),
  navigateTo: jest.fn(),
  redirectTo: jest.fn()
}
global.Page = jest.fn()

const { removeRecordFromList } = require('../index.js')

/**
 * Arbitrary: generates a list of records with unique _id strings
 */
const recordArb = fc.record({
  _id: fc.string({ minLength: 1, maxLength: 20 }),
  name: fc.string(),
  value: fc.float()
})

const uniqueRecordListArb = fc
  .array(recordArb, { minLength: 1, maxLength: 50 })
  .map((records) => {
    const seen = new Set()
    return records.filter((r) => {
      if (seen.has(r._id)) return false
      seen.add(r._id)
      return true
    })
  })
  .filter((list) => list.length >= 1)

describe('removeRecordFromList - Property 6: 删除操作后列表状态正确性', () => {
  test('successful delete: list length decreases by 1 and removed id is absent', () => {
    fc.assert(
      fc.property(
        uniqueRecordListArb.chain((list) =>
          fc.record({
            list: fc.constant(list),
            index: fc.integer({ min: 0, max: list.length - 1 })
          })
        ),
        ({ list, index }) => {
          const idToRemove = list[index]._id
          const result = removeRecordFromList(list, idToRemove)

          // Length should decrease by 1
          expect(result.length).toBe(list.length - 1)

          // Removed id should not be in the result
          const resultIds = result.map((r) => r._id)
          expect(resultIds).not.toContain(idToRemove)
        }
      ),
      { numRuns: 100 }
    )
  })

  test('successful delete: all other records remain unchanged', () => {
    fc.assert(
      fc.property(
        uniqueRecordListArb.chain((list) =>
          fc.record({
            list: fc.constant(list),
            index: fc.integer({ min: 0, max: list.length - 1 })
          })
        ),
        ({ list, index }) => {
          const idToRemove = list[index]._id
          const result = removeRecordFromList(list, idToRemove)

          // All remaining records should match originals minus the removed one
          const expected = list.filter((item) => item._id !== idToRemove)
          expect(result).toEqual(expected)
        }
      ),
      { numRuns: 100 }
    )
  })

  test('non-existent id: list remains completely unchanged', () => {
    fc.assert(
      fc.property(
        uniqueRecordListArb,
        fc.string({ minLength: 1, maxLength: 20 }),
        (list, randomId) => {
          const existingIds = new Set(list.map((r) => r._id))
          // Only test when randomId is NOT in the list
          fc.pre(!existingIds.has(randomId))

          const result = removeRecordFromList(list, randomId)

          // Length should remain the same
          expect(result.length).toBe(list.length)

          // All records should be identical
          expect(result).toEqual(list)
        }
      ),
      { numRuns: 100 }
    )
  })
})
