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
 * 查询全部健康小贴士
 */
async function getAllTips() {
  const res = await db.collection('health_tips').get()
  return res.data
}

/**
 * 查询全部正能量断句
 */
async function getAllQuotes() {
  const res = await db.collection('motivational_quotes').get()
  return res.data
}

// 云函数入口函数
exports.main = async (event, context) => {
  try {
    const { action } = event

    switch (action) {
      case 'getTips':
        return success(await getAllTips())
      case 'getQuotes':
        return success(await getAllQuotes())
      case 'getAll': {
        const [tips, quotes] = await Promise.all([getAllTips(), getAllQuotes()])
        return success({ tips, quotes })
      }
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
