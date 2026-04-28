/**
 * **Feature: cloud-data-migration, Property 3: 云端数据与工具函数兼容性**
 * **Validates: Requirements 7.3**
 *
 * 属性测试：验证 getRandomTips 和 getRandomQuote 工具函数
 * 对任意符合 schema 的云端数据输入都能正确工作。
 */

var fc = require('fast-check')
var { getRandomTips, getRandomQuote } = require('../../../utils/homepage-utils')

// --- Arbitraries ---
var tipArb = fc.record({
  id: fc.string(),
  title: fc.string(),
  content: fc.string()
})

var quoteArb = fc.record({
  id: fc.string(),
  text: fc.string(),
  author: fc.oneof(fc.string(), fc.constant(null))
})

describe('Property 3: 云端数据与工具函数兼容性', function () {
  test('getRandomTips: 返回元素均来自输入数组，且长度等于 min(count, tips.length)', function () {
    fc.assert(
      fc.property(
        fc.array(tipArb, { minLength: 1 }),
        fc.integer({ min: 1, max: 100 }),
        function (tips, count) {
          var result = getRandomTips(tips, count)

          // 返回长度等于 min(count, tips.length)
          var expectedLength = Math.min(count, tips.length)
          expect(result.length).toBe(expectedLength)

          // 每个返回元素都是输入数组中的元素
          result.forEach(function (item) {
            var found = tips.some(function (t) {
              return t.id === item.id && t.title === item.title && t.content === item.content
            })
            expect(found).toBe(true)
          })
        }
      ),
      { numRuns: 100 }
    )
  })

  test('getRandomQuote: 返回对象是输入数组中的元素', function () {
    fc.assert(
      fc.property(
        fc.array(quoteArb, { minLength: 1 }),
        function (quotes) {
          var result = getRandomQuote(quotes)

          // 返回对象是输入数组中的一个元素
          var found = quotes.some(function (q) {
            return q.id === result.id && q.text === result.text && q.author === result.author
          })
          expect(found).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })
})
