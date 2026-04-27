/**
 * Property-based tests for validateDuration and validateWeight functions
 *
 * **Feature: health-tracker-frontend, Property 4: 数值范围校验**
 * **Validates: Requirements 4.5, 5.4, 5.5**
 */
const fc = require('fast-check')
const { validateDuration, validateWeight } = require('../health-utils')

describe('validateDuration - Property 4: 数值范围校验 (运动时长)', () => {
  test('positive numbers should pass validation', () => {
    fc.assert(
      fc.property(
        fc.double({ min: Number.MIN_VALUE, max: 1e10, noNaN: true }),
        (posNum) => {
          expect(validateDuration(posNum)).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  test('zero should fail validation', () => {
    expect(validateDuration(0)).toBe(false)
  })

  test('negative numbers should fail validation', () => {
    fc.assert(
      fc.property(
        fc.double({ min: -1e10, max: -Number.MIN_VALUE, noNaN: true }),
        (negNum) => {
          expect(validateDuration(negNum)).toBe(false)
        }
      ),
      { numRuns: 100 }
    )
  })

  test('NaN should fail validation', () => {
    expect(validateDuration(NaN)).toBe(false)
  })

  test('non-number types should fail validation', () => {
    fc.assert(
      fc.property(
        fc.oneof(fc.string(), fc.boolean(), fc.constant(null), fc.constant(undefined)),
        (nonNum) => {
          expect(validateDuration(nonNum)).toBe(false)
        }
      ),
      { numRuns: 100 }
    )
  })
})

describe('validateWeight - Property 4: 数值范围校验 (体重)', () => {
  test('numbers in [20, 300] should pass validation', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 20, max: 300, noNaN: true }),
        (validWeight) => {
          expect(validateWeight(validWeight)).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  test('numbers below 20 should fail validation', () => {
    fc.assert(
      fc.property(
        fc.double({ min: -1e10, max: 19.999, noNaN: true }),
        (lowWeight) => {
          expect(validateWeight(lowWeight)).toBe(false)
        }
      ),
      { numRuns: 100 }
    )
  })

  test('numbers above 300 should fail validation', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 300.001, max: 1e10, noNaN: true }),
        (highWeight) => {
          expect(validateWeight(highWeight)).toBe(false)
        }
      ),
      { numRuns: 100 }
    )
  })

  test('boundary values 20 and 300 should pass validation', () => {
    expect(validateWeight(20)).toBe(true)
    expect(validateWeight(300)).toBe(true)
  })

  test('NaN should fail validation', () => {
    expect(validateWeight(NaN)).toBe(false)
  })

  test('non-number types should fail validation', () => {
    fc.assert(
      fc.property(
        fc.oneof(fc.string(), fc.boolean(), fc.constant(null), fc.constant(undefined)),
        (nonNum) => {
          expect(validateWeight(nonNum)).toBe(false)
        }
      ),
      { numRuns: 100 }
    )
  })
})
