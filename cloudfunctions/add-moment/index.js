// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})
const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  return new Promise((resolve, reject) => {
    // 在 3 秒后返回结果给调用方（小程序 / 其他云函数）
    db.collection('user-moment-record').add({
      // data 字段表示需新增的 JSON 数据
      data: {
        // _id: 'todo-identifiant-aleatoire', // 可选自定义 _id，在此处场景下用数据库自动分配的就可以了
        message: event.message,
        sendTime: event.sendTime
      },
      success: (res) => {
        // res 是一个对象，其中有 _id 字段标记刚创建的记录的 id
        resolve({
          code: 0,
          result: 'send Success'
        })
      }
    })
  })
}