// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})
const db = cloud.database()

/**
 * 构造成功响应
 */
function success(data) {
  return { code: 0, message: 'success', data }
}

/**
 * 构造失败响应
 */
function fail(code, message) {
  return { code, message, data: null }
}

/**
 * 查询全部食物热量提醒数据
 */
async function getAllCalorieTips() {
  const res = await db.collection('food_calorie_tips').get()
  return res.data
}

// 云函数入口函数
exports.main = async (event, context) => {
  try {
    const { action } = event

    switch (action) {
      case 'getAll':
        return success(await getAllCalorieTips())
      default:
        return fail(1001, '无效的 action: ' + action)
    }
  } catch (err) {
    console.error(err)
    return fail(5000, '服务器内部错误')
  }
}

exports.success = success
exports.fail = fail
