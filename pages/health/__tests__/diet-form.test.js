/**
 * Diet Form 单元测试
 * 测试 createFormHandler 的 validate、buildSubmitData、handleResponse 逻辑
 */

// Must set globals before requiring the module since Page() is called at module level
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

var createFormHandler = require('../diet-form.js').createFormHandler

describe('Diet Form - createFormHandler', function () {

  describe('validate', function () {
    it('should fail when foodName is empty', function () {
      var handler = createFormHandler({ foodName: '', mealType: 'lunch' })
      var result = handler.validate()
      expect(result.valid).toBe(false)
      expect(result.message).toBe('请输入食物名称')
    })

    it('should fail when foodName is only whitespace', function () {
      var handler = createFormHandler({ foodName: '   ', mealType: 'lunch' })
      var result = handler.validate()
      expect(result.valid).toBe(false)
      expect(result.message).toBe('请输入食物名称')
    })

    it('should fail when mealType is empty', function () {
      var handler = createFormHandler({ foodName: '鸡胸肉', mealType: '' })
      var result = handler.validate()
      expect(result.valid).toBe(false)
      expect(result.message).toBe('请选择用餐类型')
    })

    it('should fail when mealType is invalid', function () {
      var handler = createFormHandler({ foodName: '鸡胸肉', mealType: 'brunch' })
      var result = handler.validate()
      expect(result.valid).toBe(false)
      expect(result.message).toBe('请选择用餐类型')
    })

    it('should pass with valid foodName and mealType', function () {
      var handler = createFormHandler({ foodName: '鸡胸肉', mealType: 'lunch' })
      var result = handler.validate()
      expect(result.valid).toBe(true)
      expect(result.message).toBe('')
    })

    it('should pass for all valid meal types', function () {
      var types = ['breakfast', 'lunch', 'dinner', 'snack']
      types.forEach(function (type) {
        var handler = createFormHandler({ foodName: '食物', mealType: type })
        expect(handler.validate().valid).toBe(true)
      })
    })
  })

  describe('buildSubmitData', function () {
    it('should build add data correctly', function () {
      var handler = createFormHandler({
        mode: 'add',
        foodName: '鸡胸肉',
        mealType: 'lunch',
        date: '2024-01-15',
        calories: '350',
        note: '低脂'
      })
      var data = handler.buildSubmitData()
      expect(data.action).toBe('add')
      expect(data.foodName).toBe('鸡胸肉')
      expect(data.mealType).toBe('lunch')
      expect(data.date).toBe('2024-01-15')
      expect(data.calories).toBe(350)
      expect(data.note).toBe('低脂')
      expect(data.id).toBeUndefined()
    })

    it('should build edit data with id', function () {
      var handler = createFormHandler({
        mode: 'edit',
        id: 'abc123',
        foodName: '沙拉',
        mealType: 'dinner',
        date: '2024-01-15',
        calories: '',
        note: ''
      })
      var data = handler.buildSubmitData()
      expect(data.action).toBe('update')
      expect(data.id).toBe('abc123')
      expect(data.calories).toBeUndefined()
      expect(data.note).toBeUndefined()
    })

    it('should omit calories and note when empty', function () {
      var handler = createFormHandler({
        mode: 'add',
        foodName: '米饭',
        mealType: 'lunch',
        date: '2024-01-15',
        calories: '',
        note: ''
      })
      var data = handler.buildSubmitData()
      expect(data.calories).toBeUndefined()
      expect(data.note).toBeUndefined()
    })
  })

  describe('handleResponse', function () {
    it('should return success for code 0', function () {
      var handler = createFormHandler({})
      var result = handler.handleResponse({ code: 0, message: 'success', data: { _id: '123' } })
      expect(result.success).toBe(true)
      expect(result.message).toBe('操作成功')
    })

    it('should return failure with message for non-zero code', function () {
      var handler = createFormHandler({})
      var result = handler.handleResponse({ code: 1001, message: '食物名称不能为空' })
      expect(result.success).toBe(false)
      expect(result.message).toBe('食物名称不能为空')
    })

    it('should return default message when result has no message', function () {
      var handler = createFormHandler({})
      var result = handler.handleResponse({ code: 5000 })
      expect(result.success).toBe(false)
      expect(result.message).toBe('提交失败')
    })

    it('should handle null result', function () {
      var handler = createFormHandler({})
      var result = handler.handleResponse(null)
      expect(result.success).toBe(false)
      expect(result.message).toBe('提交失败')
    })
  })
})
