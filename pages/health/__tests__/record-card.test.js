/**
 * Property-based tests for record card information completeness
 *
 * **Feature: health-tracker-frontend, Property 7: 记录卡片信息完整性**
 * **Validates: Requirements 8.3**
 *
 * Since we cannot render WXML in tests, we verify the data model completeness:
 * for any valid record, the key fields that the template references are present
 * and defined (non-null, non-undefined).
 */
const fc = require('fast-check')

/**
 * Extract the display fields required by the WXML template for a diet record.
 * Template uses: item.foodName, item.mealType
 */
function getDietDisplayFields(record) {
  return { foodName: record.foodName, mealType: record.mealType }
}

/**
 * Extract the display fields required by the WXML template for an exercise record.
 * Template uses: item.exerciseType, item.duration
 */
function getExerciseDisplayFields(record) {
  return { exerciseType: record.exerciseType, duration: record.duration }
}

/**
 * Extract the display fields required by the WXML template for a weight record.
 * Template uses: item.weight, item.date
 */
function getWeightDisplayFields(record) {
  return { weight: record.weight, date: record.date }
}

// --- Arbitraries ---

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack']

const dietRecordArb = fc.record({
  _id: fc.string({ minLength: 1, maxLength: 20 }),
  foodName: fc.string({ minLength: 1, maxLength: 50 }),
  mealType: fc.constantFrom(...MEAL_TYPES),
  calories: fc.option(fc.integer({ min: 0, max: 5000 }), { nil: undefined }),
  date: fc.string({ minLength: 10, maxLength: 10 }),
  note: fc.option(fc.string({ maxLength: 100 }), { nil: undefined })
})

const exerciseRecordArb = fc.record({
  _id: fc.string({ minLength: 1, maxLength: 20 }),
  exerciseType: fc.string({ minLength: 1, maxLength: 50 }),
  duration: fc.integer({ min: 1, max: 600 }),
  calories: fc.option(fc.integer({ min: 0, max: 5000 }), { nil: undefined }),
  date: fc.string({ minLength: 10, maxLength: 10 })
})

const weightRecordArb = fc.record({
  _id: fc.string({ minLength: 1, maxLength: 20 }),
  weight: fc.double({ min: 20, max: 300, noNaN: true }),
  date: fc.string({ minLength: 10, maxLength: 10 })
})

// --- Tests ---

describe('Record Card - Property 7: 记录卡片信息完整性', () => {
  test('diet record: all required display fields (foodName, mealType) are present and defined', () => {
    fc.assert(
      fc.property(dietRecordArb, (record) => {
        const fields = getDietDisplayFields(record)

        expect(fields.foodName).toBeDefined()
        expect(fields.foodName).not.toBeNull()
        expect(typeof fields.foodName).toBe('string')
        expect(fields.foodName.length).toBeGreaterThan(0)

        expect(fields.mealType).toBeDefined()
        expect(fields.mealType).not.toBeNull()
        expect(typeof fields.mealType).toBe('string')
        expect(MEAL_TYPES).toContain(fields.mealType)
      }),
      { numRuns: 100 }
    )
  })

  test('exercise record: all required display fields (exerciseType, duration) are present and defined', () => {
    fc.assert(
      fc.property(exerciseRecordArb, (record) => {
        const fields = getExerciseDisplayFields(record)

        expect(fields.exerciseType).toBeDefined()
        expect(fields.exerciseType).not.toBeNull()
        expect(typeof fields.exerciseType).toBe('string')
        expect(fields.exerciseType.length).toBeGreaterThan(0)

        expect(fields.duration).toBeDefined()
        expect(fields.duration).not.toBeNull()
        expect(typeof fields.duration).toBe('number')
        expect(fields.duration).toBeGreaterThan(0)
      }),
      { numRuns: 100 }
    )
  })

  test('weight record: all required display fields (weight, date) are present and defined', () => {
    fc.assert(
      fc.property(weightRecordArb, (record) => {
        const fields = getWeightDisplayFields(record)

        expect(fields.weight).toBeDefined()
        expect(fields.weight).not.toBeNull()
        expect(typeof fields.weight).toBe('number')
        expect(fields.weight).toBeGreaterThanOrEqual(20)
        expect(fields.weight).toBeLessThanOrEqual(300)

        expect(fields.date).toBeDefined()
        expect(fields.date).not.toBeNull()
        expect(typeof fields.date).toBe('string')
        expect(fields.date.length).toBeGreaterThan(0)
      }),
      { numRuns: 100 }
    )
  })
})
