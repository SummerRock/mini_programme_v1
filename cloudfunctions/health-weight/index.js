// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})
const db = cloud.database()
const _ = db.command

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
 * 新增体重记录（同日期 upsert 逻辑）
 */
async function add(event, openid) {
  const { weight, date } = event

  if (weight === undefined || weight === null || typeof weight !== 'number' || weight < 20 || weight > 300) {
    return fail(1001, '体重必须在 20 到 300 之间')
  }
  if (!date) {
    return fail(1001, '日期不能为空')
  }

  const now = Date.now()

  // upsert 逻辑：查询同一用户同一日期是否已有记录
  const existing = await db.collection('health_weight')
    .where({ _openid: openid, date })
    .get()

  if (existing.data.length > 0) {
    // 已有记录，更新体重和 updatedAt
    const existingId = existing.data[0]._id
    await db.collection('health_weight').doc(existingId).update({
      data: { weight, updatedAt: now }
    })
    return success({ _id: existingId })
  }

  // 无记录，创建新记录
  const record = {
    _openid: openid,
    weight,
    date,
    createdAt: now,
    updatedAt: now
  }

  const res = await db.collection('health_weight').add({ data: record })
  return success({ _id: res._id })
}

/**
 * 查询日期范围内的体重记录
 */
async function query(event, openid) {
  const { startDate, endDate } = event

  const whereCondition = { _openid: openid }

  if (startDate && endDate) {
    whereCondition.date = _.gte(startDate).and(_.lte(endDate))
  } else if (startDate) {
    whereCondition.date = _.gte(startDate)
  } else if (endDate) {
    whereCondition.date = _.lte(endDate)
  }

  const res = await db.collection('health_weight')
    .where(whereCondition)
    .orderBy('date', 'asc')
    .get()

  return success(res.data)
}

/**
 * 更新体重记录
 */
async function update(event, openid) {
  const { id, weight } = event

  if (!id) {
    return fail(1001, '记录ID不能为空')
  }
  if (weight !== undefined && weight !== null && (typeof weight !== 'number' || weight < 20 || weight > 300)) {
    return fail(1001, '体重必须在 20 到 300 之间')
  }

  // 权限校验：验证记录属于当前用户
  const record = await db.collection('health_weight').doc(id).get()
  if (record.data._openid !== openid) {
    return fail(1002, '无权操作此记录')
  }

  const updateData = { updatedAt: Date.now() }
  if (weight !== undefined && weight !== null) updateData.weight = weight

  await db.collection('health_weight').doc(id).update({ data: updateData })
  return success({ _id: id })
}

/**
 * 删除体重记录
 */
async function remove(event, openid) {
  const { id } = event

  if (!id) {
    return fail(1001, '记录ID不能为空')
  }

  // 权限校验：验证记录属于当前用户
  const record = await db.collection('health_weight').doc(id).get()
  if (record.data._openid !== openid) {
    return fail(1002, '无权操作此记录')
  }

  await db.collection('health_weight').doc(id).remove()
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
