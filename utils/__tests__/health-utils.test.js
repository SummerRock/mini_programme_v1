/**
 * Unit tests for utils/health-utils.js
 */
const {
  MEAL_TYPES,
  formatDate,
  validateRequired,
  validateMealType,
  validateDuration,
  validateWeight,
  callCloudFunction
} = require('../health-utils')

// Mock wx global
beforeEach(() => {
  global.wx = {
    showLoading: jest.fn(),
    hideLoading: jest.fn(),
    showToast: jest.fn(),
    cloud: {
      callFunction: jest.fn()
    }
  }
})

afterEach(() => {
  delete global.wx
})

describe('MEAL_TYPES', () => {
  test('contains exactly 4 meal types', () => {
    expect(MEAL_TYPES).toHaveLength(4)
  })

  test('has correct values and labels', () => {
    expect(MEAL_TYPES).toEqual([
      { value: 'breakfast', label: '早餐' },
      { value: 'lunch', label: '午餐' },
      { value: 'dinner', label: '晚餐' },
      { value: 'snack', label: '加餐' }
    ])
  })
})

describe('formatDate', () => {
  test('formats a date correctly', () => {
    expect(formatDate(new Date(2024, 0, 15))).toBe('2024-01-15')
  })

  test('pads single-digit month and day', () => {
    expect(formatDate(new Date(2024, 2, 5))).toBe('2024-03-05')
  })

  test('handles December 31st', () => {
    expect(formatDate(new Date(2024, 11, 31))).toBe('2024-12-31')
  })
})

describe('validateRequired', () => {
  test('returns true for non-empty string', () => {
    expect(validateRequired('hello')).toBe(true)
  })

  test('returns false for empty string', () => {
    expect(validateRequired('')).toBe(false)
  })

  test('returns false for whitespace-only string', () => {
    expect(validateRequired('   ')).toBe(false)
    expect(validateRequired('\t\n')).toBe(false)
  })

  test('returns true for string with leading/trailing spaces', () => {
    expect(validateRequired('  hello  ')).toBe(true)
  })

  test('returns false for non-string types', () => {
    expect(validateRequired(null)).toBe(false)
    expect(validateRequired(undefined)).toBe(false)
    expect(validateRequired(123)).toBe(false)
  })
})

describe('validateMealType', () => {
  test('returns true for valid meal types', () => {
    expect(validateMealType('breakfast')).toBe(true)
    expect(validateMealType('lunch')).toBe(true)
    expect(validateMealType('dinner')).toBe(true)
    expect(validateMealType('snack')).toBe(true)
  })

  test('returns false for invalid strings', () => {
    expect(validateMealType('brunch')).toBe(false)
    expect(validateMealType('')).toBe(false)
    expect(validateMealType('BREAKFAST')).toBe(false)
  })

  test('returns false for non-string types', () => {
    expect(validateMealType(null)).toBe(false)
    expect(validateMealType(0)).toBe(false)
  })
})

describe('validateDuration', () => {
  test('returns true for positive numbers', () => {
    expect(validateDuration(1)).toBe(true)
    expect(validateDuration(0.5)).toBe(true)
    expect(validateDuration(120)).toBe(true)
  })

  test('returns false for zero', () => {
    expect(validateDuration(0)).toBe(false)
  })

  test('returns false for negative numbers', () => {
    expect(validateDuration(-1)).toBe(false)
  })

  test('returns false for non-number types', () => {
    expect(validateDuration('30')).toBe(false)
    expect(validateDuration(null)).toBe(false)
    expect(validateDuration(NaN)).toBe(false)
  })
})

describe('validateWeight', () => {
  test('returns true for values in [20, 300]', () => {
    expect(validateWeight(20)).toBe(true)
    expect(validateWeight(70.5)).toBe(true)
    expect(validateWeight(300)).toBe(true)
  })

  test('returns false for values below 20', () => {
    expect(validateWeight(19.9)).toBe(false)
    expect(validateWeight(0)).toBe(false)
  })

  test('returns false for values above 300', () => {
    expect(validateWeight(300.1)).toBe(false)
    expect(validateWeight(500)).toBe(false)
  })

  test('returns false for non-number types', () => {
    expect(validateWeight('70')).toBe(false)
    expect(validateWeight(null)).toBe(false)
    expect(validateWeight(NaN)).toBe(false)
  })
})

describe('callCloudFunction', () => {
  test('shows loading, calls cloud function, hides loading on success', async () => {
    const mockResult = { result: { code: 0, data: [] } }
    wx.cloud.callFunction.mockResolvedValue(mockResult)

    const result = await callCloudFunction('health-diet', { action: 'query' })

    expect(wx.showLoading).toHaveBeenCalledWith({ title: '加载中' })
    expect(wx.cloud.callFunction).toHaveBeenCalledWith({
      name: 'health-diet',
      data: { action: 'query' }
    })
    expect(wx.hideLoading).toHaveBeenCalled()
    expect(result).toEqual(mockResult)
  })

  test('shows error toast on network failure', async () => {
    wx.cloud.callFunction.mockRejectedValue(new Error('network error'))

    await expect(callCloudFunction('health-diet', {})).rejects.toThrow('network error')

    expect(wx.hideLoading).toHaveBeenCalled()
    expect(wx.showToast).toHaveBeenCalledWith({
      title: '网络异常，请稍后重试',
      icon: 'none',
      duration: 1500
    })
  })
})
