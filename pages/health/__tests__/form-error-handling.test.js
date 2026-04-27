/**
 * Property-based tests for error response form data preservation
 *
 * **Feature: health-tracker-frontend, Property 5: 错误响应保留表单数据**
 * **Validates: Requirements 3.8, 4.8, 5.8**
 *
 * For any form data and any error response (code != 0):
 * 1. handleResponse returns { success: false, message: <error message> }
 * 2. The original form data object is NOT modified by the handler
 */

const fc = require('fast-check')

// Mock wx and Page globals before requiring modules
global.wx = {
  cloud: { init: jest.fn(), callFunction: jest.fn() },
  getStorageSync: jest.fn(),
  showLoading: jest.fn(),
  hideLoading: jest.fn(),
  showToast: jest.fn(),
  navigateTo: jest.fn(),
  navigateBack: jest.fn()
}
global.Page = jest.fn()

const { createFormHandler: createDietFormHandler } = require('../diet-form.js')
const { createFormHandler: createExerciseFormHandler } = require('../exercise-form.js')
const { createFormHandler: createWeightFormHandler } = require('../weight-form.js')

// --- Arbitraries ---

const nonZeroCodeArb = fc.integer().filter(c => c !== 0)

const errorMessageArb = fc.string({ minLength: 1 })

const errorResponseArb = fc.record({
  code: nonZeroCodeArb,
  message: errorMessageArb
})

const dietFormDataArb = fc.record({
  foodName: fc.string(),
  mealType: fc.string(),
  calories: fc.string(),
  note: fc.string(),
  date: fc.string()
})

const exerciseFormDataArb = fc.record({
  exerciseType: fc.string(),
  duration: fc.string(),
  calories: fc.string(),
  date: fc.string()
})

const weightFormDataArb = fc.record({
  weight: fc.string(),
  date: fc.string()
})

// --- Tests ---

describe('Property 5: 错误响应保留表单数据', () => {

  describe('Diet Form - error response preserves form data', () => {
    test('handleResponse returns success=false with error message for non-zero code', () => {
      fc.assert(
        fc.property(
          dietFormDataArb,
          errorResponseArb,
          (formData, errorResponse) => {
            const handler = createDietFormHandler(formData)
            const result = handler.handleResponse(errorResponse)

            expect(result.success).toBe(false)
            expect(result.message).toBe(errorResponse.message)
          }
        ),
        { numRuns: 100 }
      )
    })

    test('original form data is not modified after handleResponse with error', () => {
      fc.assert(
        fc.property(
          dietFormDataArb,
          errorResponseArb,
          (formData, errorResponse) => {
            // Deep copy to compare later
            const originalData = JSON.parse(JSON.stringify(formData))

            const handler = createDietFormHandler(formData)
            handler.handleResponse(errorResponse)

            expect(formData.foodName).toBe(originalData.foodName)
            expect(formData.mealType).toBe(originalData.mealType)
            expect(formData.calories).toBe(originalData.calories)
            expect(formData.note).toBe(originalData.note)
            expect(formData.date).toBe(originalData.date)
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('Exercise Form - error response preserves form data', () => {
    test('handleResponse returns success=false with error message for non-zero code', () => {
      fc.assert(
        fc.property(
          exerciseFormDataArb,
          errorResponseArb,
          (formData, errorResponse) => {
            const handler = createExerciseFormHandler(formData)
            const result = handler.handleResponse(errorResponse)

            expect(result.success).toBe(false)
            expect(result.message).toBe(errorResponse.message)
          }
        ),
        { numRuns: 100 }
      )
    })

    test('original form data is not modified after handleResponse with error', () => {
      fc.assert(
        fc.property(
          exerciseFormDataArb,
          errorResponseArb,
          (formData, errorResponse) => {
            const originalData = JSON.parse(JSON.stringify(formData))

            const handler = createExerciseFormHandler(formData)
            handler.handleResponse(errorResponse)

            expect(formData.exerciseType).toBe(originalData.exerciseType)
            expect(formData.duration).toBe(originalData.duration)
            expect(formData.calories).toBe(originalData.calories)
            expect(formData.date).toBe(originalData.date)
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('Weight Form - error response preserves form data', () => {
    test('handleResponse returns success=false with error message for non-zero code', () => {
      fc.assert(
        fc.property(
          weightFormDataArb,
          errorResponseArb,
          (formData, errorResponse) => {
            const handler = createWeightFormHandler(formData)
            const result = handler.handleResponse(errorResponse)

            expect(result.success).toBe(false)
            expect(result.message).toBe(errorResponse.message)
          }
        ),
        { numRuns: 100 }
      )
    })

    test('original form data is not modified after handleResponse with error', () => {
      fc.assert(
        fc.property(
          weightFormDataArb,
          errorResponseArb,
          (formData, errorResponse) => {
            const originalData = JSON.parse(JSON.stringify(formData))

            const handler = createWeightFormHandler(formData)
            handler.handleResponse(errorResponse)

            expect(formData.weight).toBe(originalData.weight)
            expect(formData.date).toBe(originalData.date)
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
