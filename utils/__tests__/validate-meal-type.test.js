/**
 * Property-based tests for validateMealType function
 *
 * **Feature: health-tracker-frontend, Property 3: 用餐类型枚举校验**
 * **Validates: Requirements 3.5**
 */
const fc = require('fast-check')
const { validateMealType } = require('../health-utils')

const VALID_MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack']

describe('validateMealType - Property 3: 用餐类型枚举校验', () => {
  test('all 4 valid meal type values should pass validation', () => {
    VALID_MEAL_TYPES.forEach((type) => {
      expect(validateMealType(type)).toBe(true)
    })
  })

  test('random strings that happen to be valid meal types should pass validation', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...VALID_MEAL_TYPES),
        (validType) => {
          expect(validateMealType(validType)).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  test('arbitrary strings NOT in the valid set should fail validation', () => {
    fc.assert(
      fc.property(
        fc.string().filter((s) => !VALID_MEAL_TYPES.includes(s)),
        (invalidType) => {
          expect(validateMealType(invalidType)).toBe(false)
        }
      ),
      { numRuns: 100 }
    )
  })
})
