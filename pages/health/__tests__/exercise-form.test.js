/**
 * Exercise Form 单元测试
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

var createFormHandler = require('../exercise-form.js').createFormHandler

describe('Exercise Form - createFormHandler', function () {

  describe('validate', function () {
    it('should fail when exerciseType is empty', function () {
      var handler = createFormHandler({ exerciseType: '', duration: '30' })
      var result = handler.validate()
      expect(result.valid).toBe(false)
      expect(result.message).toBe('请输入运动类型')
    })

    it('should fail when exerciseType is only whitespace', function () {
      var handler = createFormHandler({ exerciseType: '   ', duration: '30' })
      var result = handler.validate()
      expect(result.valid).toBe(false)
      expect(result.message).toBe('请输入运动类型')
    })

    it('should fail when duration is empty', function () {
      var handler = createFormHandler({ exerciseType: '跑步', duration: '' })
      var result = handler.validate()
      expect(result.valid).toBe(false)
      expect(result.message).toBe('请输入有效的运动时长')
    })

    it('should fail when duration is zero', function () {
      var handler = createFormHandler({ exerciseType: '跑步', duration: '0' })
      var result = handler.validate()
      expect(result.valid).toBe(false)
      expect(result.message).toBe('请输入有效的运动时长')
    })

    it('should fail when duration is negative', function () {
      var handler = createFormHandler({ exerciseType: '跑步', duration: '-5' })
      var result = handler.validate()
      expect(result.valid).toBe(false)
      expect(result.message).toBe('请输入有效的运动时长')
    })

    it('should fail when duration is non-numeric', function () {
      var handler = createFormHandler({ exerciseType: '跑步', duration: 'abc' })
      var result = handler.validate()
      expect(result.valid).toBe(false)
      expect(result.message).toBe('请输入有效的运动时长')
    })

    it('should pass with valid exerciseType and positive duration', function () {
      var handler = createFormHandler({ exerciseType: '跑步', duration: '30' })
      var result = handler.validate()
      expect(result.valid).toBe(true)
      expect(result.message).toBe('')
    })

    it('should pass with decimal duration', function () {
      var handler = createFormHandler({ exerciseType: '游泳', duration: '45.5' })
      var result = handler.validate()
      expect(result.valid).toBe(true)
      expect(result.message).toBe('')
    })
  })

  describe('buildSubmitData', function () {
    it('should build add data correctly', function () {
      var handler = createFormHandler({
        mode: 'add',
        exerciseType: '跑步',
        duration: '30',
        date: '2024-01-15',
        calories: '250'
      })
      var data = handler.buildSubmitData()
      expect(data.action).toBe('add')
      expect(data.exerciseType).toBe('跑步')
      expect(data.duration).toBe(30)
      expect(data.date).toBe('2024-01-15')
      expect(data.calories).toBe(250)
      expect(data.id).toBeUndefined()
    })

    it('should build edit data with id', function () {
      var handler = createFormHandler({
        mode: 'edit',
        id: 'abc123',
        exerciseType: '游泳',
        duration: '60',
        date: '2024-01-15',
        calories: ''
      })
      var data = handler.buildSubmitData()
      expect(data.action).toBe('update')
      expect(data.id).toBe('abc123')
      expect(data.calories).toBeUndefined()
    })

    it('should omit calories when empty', function () {
      var handler = createFormHandler({
        mode: 'add',
        exerciseType: '跑步',
        duration: '30',
        date: '2024-01-15',
        calories: ''
      })
      var data = handler.buildSubmitData()
      expect(data.calories).toBeUndefined()
    })

    it('should include calories when provided', function () {
      var handler = createFormHandler({
        mode: 'add',
        exerciseType: '跑步',
        duration: '30',
        date: '2024-01-15',
        calories: '0'
      })
      var data = handler.buildSubmitData()
      expect(data.calories).toBe(0)
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
      var result = handler.handleResponse({ code: 1001, message: '运动类型不能为空' })
      expect(result.success).toBe(false)
      expect(result.message).toBe('运动类型不能为空')
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
