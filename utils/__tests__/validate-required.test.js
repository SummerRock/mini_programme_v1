/**
 * Property-based tests for validateRequired function
 *
 * **Feature: health-tracker-frontend, Property 2: 必填文本字段校验**
 * **Validates: Requirements 3.4, 4.4**
 */
const fc = require('fast-check')
const { validateRequired } = require('../health-utils')

describe('validateRequired - Property 2: 必填文本字段校验', () => {
  test('empty string should fail validation', () => {
    expect(validateRequired('')).toBe(false)
  })

  test('whitespace-only strings should fail validation', () => {
    fc.assert(
      fc.property(
        fc.stringOf(fc.constantFrom(' ', '\t', '\n', '\r')).filter(s => s.length > 0),
        (whitespaceStr) => {
          expect(validateRequired(whitespaceStr)).toBe(false)
        }
      ),
      { numRuns: 100 }
    )
  })

  test('strings containing at least one non-whitespace character should pass validation', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
        (nonBlankStr) => {
          expect(validateRequired(nonBlankStr)).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })
})
