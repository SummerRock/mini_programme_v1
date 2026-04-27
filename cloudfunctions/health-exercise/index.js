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
 * 新增运动记录
 */
async function add(event, openid) {
  const { exerciseType, duration, calories, date } = event

  if (!exerciseType || typeof exerciseType !== 'string' || exerciseType.trim() === '') {
    return fail(1001, '运动类型不能为空')
  }
  if (duration === undefined || duration === null || typeof duration !== 'number' || duration <= 0) {
    return fail(1001, '运动时长必须为正数')
  }
  if (calories !== undefined && calories !== null && (typeof calories !== 'number' || calories < 0)) {
    return fail(1001, '消耗热量不能为负数')
  }
  if (!date) {
    return fail(1001, '日期不能为空')
  }

  const now = Date.now()
  const record = {
    _openid: openid,
    exerciseType,
    duration,
    date,
    createdAt: now,
    updatedAt: now
  }

  if (calories !== undefined && calories !== null) {
    record.calories = calories
  }

  const res = await db.collection('health_exercise').add({ data: record })
  return success({ _id: res._id })
}

/**
 * 查询指定日期的运动记录
 */
async function query(event, openid) {
  const { date } = event

  if (!date) {
    return fail(1001, '日期不能为空')
  }

  const res = await db.collection('health_exercise')
    .where({ _openid: openid, date })
    .orderBy('createdAt', 'asc')
    .get()

  return success(res.data)
}

/**
 * 更新运动记录
 */
async function update(event, openid) {
  const { id, exerciseType, duration, calories } = event

  if (!id) {
    return fail(1001, '记录ID不能为空')
  }
  if (duration !== undefined && duration !== null && (typeof duration !== 'number' || duration <= 0)) {
    return fail(1001, '运动时长必须为正数')
  }
  if (calories !== undefined && calories !== null && (typeof calories !== 'number' || calories < 0)) {
    return fail(1001, '消耗热量不能为负数')
  }

  // 权限校验：验证记录属于当前用户
  const record = await db.collection('health_exercise').doc(id).get()
  if (record.data._openid !== openid) {
    return fail(1002, '无权操作此记录')
  }

  const updateData = { updatedAt: Date.now() }
  if (exerciseType !== undefined && exerciseType !== null) updateData.exerciseType = exerciseType
  if (duration !== undefined && duration !== null) updateData.duration = duration
  if (calories !== undefined && calories !== null) updateData.calories = calories

  await db.collection('health_exercise').doc(id).update({ data: updateData })
  return success({ _id: id })
}

/**
 * 删除运动记录
 */
async function remove(event, openid) {
  const { id } = event

  if (!id) {
    return fail(1001, '记录ID不能为空')
  }

  // 权限校验：验证记录属于当前用户
  const record = await db.collection('health_exercise').doc(id).get()
  if (record.data._openid !== openid) {
    return fail(1002, '无权操作此记录')
  }

  await db.collection('health_exercise').doc(id).remove()
  return success({ _id: id })
}

// 云函数入口函数
exports.main = async (event, context) => {
  try {
    const { OPENID } = cloud.getWXContext()
    const { action } = event

    switch (action) {
      case 'add':
        return await add(event, OPENID)
      case 'query':
        return await query(event, OPENID)
      case 'update':
        return await update(event, OPENID)
      case 'delete':
        return await remove(event, OPENID)
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
