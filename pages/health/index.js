/**
 * 健康追踪页面
 * 调用 health-diet、health-exercise、health-weight 三个云函数
 */

function formatDate(d) {
  var y = d.getFullYear()
  var m = (d.getMonth() + 1).toString().padStart(2, '0')
  var day = d.getDate().toString().padStart(2, '0')
  return y + '-' + m + '-' + day
}

Page({
  data: {
    dietList: [],
    exerciseList: [],
    weightList: [],
    currentDate: formatDate(new Date())
  },

  onLoad: function () {
    this.queryDiet()
    this.queryExercise()
    this.queryWeight()
  },

  // ========== 饮食记录 ==========

  addDiet: function (params) {
    var that = this
    return wx.cloud.callFunction({
      name: 'health-diet',
      data: {
        action: 'add',
        foodName: params.foodName,
        mealType: params.mealType,
        date: params.date || that.data.currentDate,
        calories: params.calories,
        note: params.note
      }
    }).then(function (res) {
      if (res.result.code === 0) {
        that.queryDiet()
      }
      return res.result
    })
  },

  queryDiet: function (date) {
    var that = this
    return wx.cloud.callFunction({
      name: 'health-diet',
      data: {
        action: 'query',
        date: date || that.data.currentDate
      }
    }).then(function (res) {
      if (res.result.code === 0) {
        that.setData({ dietList: res.result.data })
      }
      return res.result
    })
  },

  updateDiet: function (params) {
    var that = this
    return wx.cloud.callFunction({
      name: 'health-diet',
      data: {
        action: 'update',
        id: params.id,
        foodName: params.foodName,
        mealType: params.mealType,
        calories: params.calories,
        note: params.note
      }
    }).then(function (res) {
      if (res.result.code === 0) {
        that.queryDiet()
      }
      return res.result
    })
  },

  deleteDiet: function (params) {
    var that = this
    return wx.cloud.callFunction({
      name: 'health-diet',
      data: {
        action: 'delete',
        id: params.id
      }
    }).then(function (res) {
      if (res.result.code === 0) {
        that.queryDiet()
      }
      return res.result
    })
  },

  // ========== 运动记录 ==========

  addExercise: function (params) {
    var that = this
    return wx.cloud.callFunction({
      name: 'health-exercise',
      data: {
        action: 'add',
        exerciseType: params.exerciseType,
        duration: params.duration,
        date: params.date || that.data.currentDate,
        calories: params.calories
      }
    }).then(function (res) {
      if (res.result.code === 0) {
        that.queryExercise()
      }
      return res.result
    })
  },

  queryExercise: function (date) {
    var that = this
    return wx.cloud.callFunction({
      name: 'health-exercise',
      data: {
        action: 'query',
        date: date || that.data.currentDate
      }
    }).then(function (res) {
      if (res.result.code === 0) {
        that.setData({ exerciseList: res.result.data })
      }
      return res.result
    })
  },

  updateExercise: function (params) {
    var that = this
    return wx.cloud.callFunction({
      name: 'health-exercise',
      data: {
        action: 'update',
        id: params.id,
        exerciseType: params.exerciseType,
        duration: params.duration,
        calories: params.calories
      }
    }).then(function (res) {
      if (res.result.code === 0) {
        that.queryExercise()
      }
      return res.result
    })
  },

  deleteExercise: function (params) {
    var that = this
    return wx.cloud.callFunction({
      name: 'health-exercise',
      data: {
        action: 'delete',
        id: params.id
      }
    }).then(function (res) {
      if (res.result.code === 0) {
        that.queryExercise()
      }
      return res.result
    })
  },

  // ========== 体重记录 ==========

  addWeight: function (params) {
    var that = this
    return wx.cloud.callFunction({
      name: 'health-weight',
      data: {
        action: 'add',
        weight: params.weight,
        date: params.date || that.data.currentDate
      }
    }).then(function (res) {
      if (res.result.code === 0) {
        that.queryWeight()
      }
      return res.result
    })
  },

  queryWeight: function (startDate, endDate) {
    var that = this
    var date = that.data.currentDate
    return wx.cloud.callFunction({
      name: 'health-weight',
      data: {
        action: 'query',
        startDate: startDate || date,
        endDate: endDate || date
      }
    }).then(function (res) {
      if (res.result.code === 0) {
        that.setData({ weightList: res.result.data })
      }
      return res.result
    })
  },

  updateWeight: function (params) {
    var that = this
    return wx.cloud.callFunction({
      name: 'health-weight',
      data: {
        action: 'update',
        id: params.id,
        weight: params.weight
      }
    }).then(function (res) {
      if (res.result.code === 0) {
        that.queryWeight()
      }
      return res.result
    })
  },

  deleteWeight: function (params) {
    var that = this
    return wx.cloud.callFunction({
      name: 'health-weight',
      data: {
        action: 'delete',
        id: params.id
      }
    }).then(function (res) {
      if (res.result.code === 0) {
        that.queryWeight()
      }
      return res.result
    })
  }
})
