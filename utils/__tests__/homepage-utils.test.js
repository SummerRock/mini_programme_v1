/**
 * Property-based tests for utils/homepage-utils.js
 * Uses fast-check to verify correctness properties of homepage utility functions
 */
const fc = require('fast-check')
const {
  getGreeting,
  formatDisplayDate,
  getRandomQuote,
  getRandomTips,
  truncateContent
} = require('../homepage-utils')

/**
 * **Feature: health-tips-homepage, Property 1: 问候语时段映射正确性**
 * **Validates: Requirements 2.2, 2.3, 2.4, 2.5, 2.6**
 */
describe('Property 1: 问候语时段映射正确性', () => {
  it('should return the correct greeting for any hour 0-23', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 23 }),
        (hour) => {
          var result = getGreeting(hour)
          if (hour >= 6 && hour <= 11) {
            expect(result).toBe('早上好，今天也要元气满满 ☀️')
          } else if (hour >= 12 && hour <= 13) {
            expect(result).toBe('中午好，记得好好吃饭 🍚')
          } else if (hour >= 14 && hour <= 17) {
            expect(result).toBe('下午好，保持活力 💪')
          } else if (hour >= 18 && hour <= 22) {
            expect(result).toBe('晚上好，注意休息 🌙')
          } else {
            expect(result).toBe('夜深了，早点休息吧 😴')
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  it('every hour maps to exactly one time period with no gaps', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 23 }),
        (hour) => {
          var result = getGreeting(hour)
          expect(typeof result).toBe('string')
          expect(result.length).toBeGreaterThan(0)
        }
      ),
      { numRuns: 100 }
    )
  })
})


/**
 * **Feature: health-tips-homepage, Property 2: 日期格式化正确性**
 * **Validates: Requirements 2.7**
 */
describe('Property 2: 日期格式化正确性', () => {
  var dayNames = ['日', '一', '二', '三', '四', '五', '六']

  it('should format any Date to "M月D日 星期X" with correct values', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date(2000, 0, 1), max: new Date(2099, 11, 31) }),
        (date) => {
          var result = formatDisplayDate(date)
          var expectedMonth = date.getMonth() + 1
          var expectedDay = date.getDate()
          var expectedWeekDay = dayNames[date.getDay()]

          // Verify format matches "M月D日 星期X"
          var pattern = /^(\d{1,2})月(\d{1,2})日 星期(.)$/
          var match = result.match(pattern)
          expect(match).not.toBeNull()

          // Verify values match the original Date
          expect(Number(match[1])).toBe(expectedMonth)
          expect(Number(match[2])).toBe(expectedDay)
          expect(match[3]).toBe(expectedWeekDay)
        }
      ),
      { numRuns: 100 }
    )
  })
})

/**
 * **Feature: health-tips-homepage, Property 3: 随机断句选取正确性**
 * **Validates: Requirements 3.4, 3.5**
 */
describe('Property 3: 随机断句选取正确性', () => {
  var quoteArb = fc.record({
    id: fc.string({ minLength: 1, maxLength: 20 }),
    text: fc.string({ minLength: 1, maxLength: 100 }),
    author: fc.option(fc.string({ minLength: 1, maxLength: 30 }), { nil: null })
  })

  it('should return an element from the input array', () => {
    fc.assert(
      fc.property(
        fc.array(quoteArb, { minLength: 1, maxLength: 20 }),
        (quotes) => {
          var result = getRandomQuote(quotes)
          expect(quotes).toContainEqual(result)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should exclude the specified ID when array has >= 2 elements', () => {
    fc.assert(
      fc.property(
        fc.array(quoteArb, { minLength: 2, maxLength: 20 })
          .chain(function (quotes) {
            // Ensure unique IDs for meaningful exclusion
            var uniqueQuotes = []
            var seenIds = new Set()
            for (var i = 0; i < quotes.length; i++) {
              var q = quotes[i]
              if (!seenIds.has(q.id)) {
                seenIds.add(q.id)
                uniqueQuotes.push(q)
              }
            }
            if (uniqueQuotes.length < 2) {
              uniqueQuotes.push({ id: '__exclude_fallback__', text: 'fallback', author: null })
            }
            return fc.constant(uniqueQuotes).chain(function (uq) {
              return fc.integer({ min: 0, max: uq.length - 1 }).map(function (idx) {
                return { quotes: uq, excludeId: uq[idx].id }
              })
            })
          }),
        (data) => {
          var result = getRandomQuote(data.quotes, data.excludeId)
          expect(data.quotes).toContainEqual(result)
          expect(result.id).not.toBe(data.excludeId)
        }
      ),
      { numRuns: 100 }
    )
  })
})


/**
 * **Feature: health-tips-homepage, Property 4: 随机Tips选取正确性**
 * **Validates: Requirements 4.3, 4.6**
 */
describe('Property 4: 随机Tips选取正确性', () => {
  var tipArb = fc.record({
    id: fc.string({ minLength: 1, maxLength: 20 }),
    title: fc.string({ minLength: 1, maxLength: 50 }),
    content: fc.string({ minLength: 1, maxLength: 200 })
  })

  it('should return min(count, array.length) unique items from input', () => {
    fc.assert(
      fc.property(
        fc.array(tipArb, { minLength: 0, maxLength: 20 })
          .chain(function (tips) {
            // Ensure unique IDs
            var uniqueTips = []
            var seenIds = new Set()
            for (var i = 0; i < tips.length; i++) {
              if (!seenIds.has(tips[i].id)) {
                seenIds.add(tips[i].id)
                uniqueTips.push(tips[i])
              }
            }
            return fc.integer({ min: 0, max: 10 }).map(function (count) {
              return { tips: uniqueTips, count: count }
            })
          }),
        (data) => {
          var result = getRandomTips(data.tips, data.count)
          var expectedLength = Math.min(data.count, data.tips.length)

          // (a) Correct length
          expect(result.length).toBe(expectedLength)

          // (b) All elements come from input
          for (var i = 0; i < result.length; i++) {
            expect(data.tips).toContainEqual(result[i])
          }

          // (c) No duplicates (by id)
          var ids = result.map(function (t) { return t.id })
          expect(new Set(ids).size).toBe(ids.length)
        }
      ),
      { numRuns: 100 }
    )
  })
})

/**
 * **Feature: health-tips-homepage, Property 5: 内容摘要截取正确性**
 * **Validates: Requirements 7.3**
 */
describe('Property 5: 内容摘要截取正确性', () => {
  it('should truncate with "..." when content exceeds maxLength, return original otherwise', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 200 }),
        fc.integer({ min: 1, max: 100 }),
        (content, maxLength) => {
          var result = truncateContent(content, maxLength)

          if (content.length > maxLength) {
            // (a) Truncated: first maxLength chars + "..."
            expect(result).toBe(content.substring(0, maxLength) + '...')
            expect(result.length).toBe(maxLength + 3)
          } else {
            // (b) Not truncated: return original
            expect(result).toBe(content)
          }
        }
      ),
      { numRuns: 100 }
    )
  })
})