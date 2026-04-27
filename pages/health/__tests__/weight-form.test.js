/**
 * Weight Form 单元测试
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

var createFormHandler = require('../weight-form.js').createFormHandler

describe('Weight Form - createFormHandler', function () {

  describe('validate', function () {
    it('should fail when weight is empty string', function () {
      var handler = createFormHandler({ weight: '' })
      var result = handler.validate()
      expect(result.valid).toBe(false)
      expect(result.message).toBe('请输入体重')
    })

    it('should fail when weight is undefined', function () {
      var handler = createFormHandler({ weight: undefined })
      var result = handler.validate()
      expect(result.valid).toBe(false)
      expect(result.message).toBe('请输入体重')
    })

    it('should fail when weight is null', function () {
      var handler = createFormHandler({ weight: null })
      var result = handler.validate()
      expect(result.valid).toBe(false)
      expect(result.message).toBe('请输入体重')
    })

    it('should fail when weight is below 20', function () {
      var handler = createFormHandler({ weight: '19.9' })
      var result = handler.validate()
      expect(result.valid).toBe(false)
      expect(result.message).toBe('体重须在 20 到 300 kg 之间')
    })

    it('should fail when weight is above 300', function () {
      var handler = createFormHandler({ weight: '300.1' })
      var result = handler.validate()
      expect(result.valid).toBe(false)
      expect(result.message).toBe('体重须在 20 到 300 kg 之间')
    })

    it('should fail when weight is non-numeric', function () {
      var handler = createFormHandler({ weight: 'abc' })
      var result = handler.validate()
      expect(result.valid).toBe(false)
      expect(result.message).toBe('体重须在 20 到 300 kg 之间')
    })

    it('should pass when weight is exactly 20', function () {
      var handler = createFormHandler({ weight: '20' })
      var result = handler.validate()
      expect(result.valid).toBe(true)
      expect(result.message).toBe('')
    })

    it('should pass when weight is exactly 300', function () {
      var handler = createFormHandler({ weight: '300' })
      var result = handler.validate()
      expect(result.valid).toBe(true)
      expect(result.message).toBe('')
    })

    it('should pass when weight is within range', function () {
      var handler = createFormHandler({ weight: '70.5' })
      var result = handler.validate()
      expect(result.valid).toBe(true)
      expect(result.message).toBe('')
    })
  })

  describe('buildSubmitData', function () {
    it('should build add data correctly', function () {
      var handler = createFormHandler({
        mode: 'add',
        weight: '70.5',
        date: '2024-01-15'
      })
      var data = handler.buildSubmitData()
      expect(data.action).toBe('add')
      expect(data.weight).toBe(70.5)
      expect(data.date).toBe('2024-01-15')
    })

    it('should always use add action (cloud function handles upsert)', function () {
      var handler = createFormHandler({
        mode: 'edit',
        id: 'abc123',
        weight: '65',
        date: '2024-01-15'
      })
      var data = handler.buildSubmitData()
      expect(data.action).toBe('add')
      expect(data.weight).toBe(65)
      expect(data.date).toBe('2024-01-15')
    })

    it('should convert weight string to number', function () {
      var handler = createFormHandler({
        mode: 'add',
        weight: '85.3',
        date: '2024-06-01'
      })
      var data = handler.buildSubmitData()
      expect(typeof data.weight).toBe('number')
      expect(data.weight).toBe(85.3)
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
      var result = handler.handleResponse({ code: 1001, message: '体重必须在 20 到 300 之间' })
      expect(result.success).toBe(false)
      expect(result.message).toBe('体重必须在 20 到 300 之间')
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

    it('should handle undefined result', function () {
      var handler = createFormHandler({})
      var result = handler.handleResponse(undefined)
      expect(result.success).toBe(false)
      expect(result.message).toBe('提交失败')
    })
  })
})
