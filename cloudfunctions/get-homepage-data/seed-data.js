/**
 * 数据播种脚本 - 将本地 JSON 数据导入云数据库
 * 
 * 使用方式：在微信开发者工具的云函数环境中执行，或在云函数终端中运行
 * 此脚本仅在初始部署时手动执行一次
 */
const cloud = require('wx-server-sdk')
const path = require('path')
const fs = require('fs')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})
const db = cloud.database()

/**
 * 读取本地 JSON 文件
 */
function loadJSONFile(filePath) {
  const absolutePath = path.resolve(__dirname, filePath)
  const raw = fs.readFileSync(absolutePath, 'utf-8')
  return JSON.parse(raw)
}

/**
 * 检查集合是否已有数据
 */
async function collectionHasData(collectionName) {
  const res = await db.collection(collectionName).count()
  return res.total > 0
}

/**
 * 导入数据到指定集合
 */
async function importToCollection(collectionName, records, fieldNames) {
  let successCount = 0
  let failCount = 0

  for (const record of records) {
    try {
      const data = {}
      for (const field of fieldNames) {
        data[field] = record[field]
      }
      await db.collection(collectionName).add({ data })
      successCount++
      console.log(`  ✓ 已导入: ${record.id}`)
    } catch (err) {
      failCount++
      console.error(`  ✗ 导入失败: ${record.id}`, err.message)
    }
  }

  return { successCount, failCount }
}

/**
 * 主函数 - 执行数据播种
 */
async function seed() {
  console.log('=== 开始数据播种 ===\n')

  // 读取本地 JSON 数据
  const tips = loadJSONFile('../../data/health-tips.json')
  const quotes = loadJSONFile('../../data/motivational-quotes.json')

  console.log(`读取到 ${tips.length} 条健康小贴士`)
  console.log(`读取到 ${quotes.length} 条正能量断句\n`)

  // 导入健康小贴士
  console.log('--- 导入 health_tips 集合 ---')
  const tipsHasData = await collectionHasData('health_tips')
  if (tipsHasData) {
    console.log('health_tips 集合已有数据，跳过导入以避免重复\n')
  } else {
    const tipsResult = await importToCollection('health_tips', tips, ['id', 'title', 'content'])
    console.log(`health_tips 导入完成: 成功 ${tipsResult.successCount} 条, 失败 ${tipsResult.failCount} 条\n`)
  }

  // 导入正能量断句
  console.log('--- 导入 motivational_quotes 集合 ---')
  const quotesHasData = await collectionHasData('motivational_quotes')
  if (quotesHasData) {
    console.log('motivational_quotes 集合已有数据，跳过导入以避免重复\n')
  } else {
    const quotesResult = await importToCollection('motivational_quotes', quotes, ['id', 'text', 'author'])
    console.log(`motivational_quotes 导入完成: 成功 ${quotesResult.successCount} 条, 失败 ${quotesResult.failCount} 条\n`)
  }

  console.log('=== 数据播种完成 ===')
}

// 导出供测试使用
module.exports = { seed, loadJSONFile, collectionHasData, importToCollection }

// 直接运行时执行播种
if (require.main === module) {
  seed().catch(err => {
    console.error('数据播种失败:', err)
    process.exit(1)
  })
}
