/**
 * Property-based tests for formatDate function
 *
 * **Feature: health-tracker-frontend, Property 1: 日期格式化往返一致性**
 * **Validates: Requirements 1.7, 2.2**
 */
const fc = require('fast-check')
const { formatDate } = require('../health-utils')

describe('formatDate - Property 1: 日期格式化往返一致性', () => {
  test('output matches YYYY-MM-DD format and year/month/day values match the original Date', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date(1900, 0, 1), max: new Date(2100, 11, 31) }),
        (date) => {
          const result = formatDate(date)

          // Output must match YYYY-MM-DD format
          expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)

          // Parse year, month, day from output
          const [yearStr, monthStr, dayStr] = result.split('-')
          const year = parseInt(yearStr, 10)
          const month = parseInt(monthStr, 10)
          const day = parseInt(dayStr, 10)

          // Values must match the original Date object
          expect(year).toBe(date.getFullYear())
          expect(month).toBe(date.getMonth() + 1)
          expect(day).toBe(date.getDate())
        }
      ),
      { numRuns: 100 }
    )
  })
})
