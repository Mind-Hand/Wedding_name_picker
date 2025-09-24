import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "redis"

const REDIS_WINNERS_KEY = 'wedding-lottery-winners'

// 创建 Redis 连接
async function getRedisClient() {
  try {
    if (!process.env.REDIS_REDIS_URL) {
      throw new Error('REDIS_URL environment variable is not set')
    }
    
    const client = createClient({ 
      url: process.env.REDIS_REDIS_URL,
      socket: {
        connectTimeout: 5000
      }
    })
    
    await client.connect()
    return client
  } catch (error) {
    console.error('Redis connection failed:', error)
    throw error
  }
}

// GET: 获取中奖者列表
export async function GET() {
  let client
  try {
    // 从 Redis 读取数据
    client = await getRedisClient()
    const winnersData = await client.get(REDIS_WINNERS_KEY)
    
    if (winnersData) {
      const winners = JSON.parse(winnersData)
      if (Array.isArray(winners)) {
        console.log(`Successfully read ${winners.length} winners from Redis database`)
        return NextResponse.json({ 
          winners, 
          source: 'redis',
          message: `共有 ${winners.length} 位中奖者`
        })
      }
    }

    // 如果没有数据，返回空列表
    console.log('No winners found in Redis database')
    return NextResponse.json({ 
      winners: [], 
      source: 'redis',
      message: '暂无中奖记录'
    })
  } catch (error) {
    console.error("Error reading winners:", error)
    return NextResponse.json({ 
      winners: [], 
      source: 'error',
      message: '读取中奖记录失败'
    })
  } finally {
    if (client) {
      await client.quit()
    }
  }
}

// POST: 添加中奖者
export async function POST(request: NextRequest) {
  let client
  try {
    const { winners } = await request.json()

    if (!Array.isArray(winners)) {
      return NextResponse.json({ 
        error: "Winners must be an array",
        received: typeof winners
      }, { status: 400 })
    }

    if (winners.length === 0) {
      return NextResponse.json({ 
        error: "Winners array cannot be empty"
      }, { status: 400 })
    }

    // 验证中奖者名单
    const validWinners = winners
      .map(winner => typeof winner === 'string' ? winner.trim() : '')
      .filter(winner => winner.length > 0)

    if (validWinners.length === 0) {
      return NextResponse.json({ 
        error: "No valid winners provided"
      }, { status: 400 })
    }

    // 从 Redis 获取现有中奖者并合并
    client = await getRedisClient()
    const existingWinnersData = await client.get(REDIS_WINNERS_KEY)
    let existingWinners: string[] = []
    
    if (existingWinnersData) {
      existingWinners = JSON.parse(existingWinnersData)
      if (!Array.isArray(existingWinners)) {
        existingWinners = []
      }
    }
    
    // 合并新的中奖者（避免重复）
    const newWinners = validWinners.filter(winner => !existingWinners.includes(winner))
    const updatedWinners = [...existingWinners, ...newWinners]
    
    // 保存到 Redis 数据库
    await client.set(REDIS_WINNERS_KEY, JSON.stringify(updatedWinners))
    
    // 同时保存时间戳
    await client.set(`${REDIS_WINNERS_KEY}_updated`, new Date().toISOString())
    
    console.log(`Successfully saved ${updatedWinners.length} winners to Redis database`)
    return NextResponse.json({ 
      success: true,
      storage: 'redis',
      winners: updatedWinners,
      newCount: newWinners.length,
      totalCount: updatedWinners.length,
      message: `成功添加 ${newWinners.length} 位新中奖者，总计 ${updatedWinners.length} 位`
    })
  } catch (error) {
    console.error("Error saving winners:", error)
    return NextResponse.json({ 
      error: "保存中奖记录失败", 
      details: error instanceof Error ? error.message : 'Unknown error',
      troubleshooting: {
        step1: "检查环境变量 REDIS_URL 配置",
        step2: "确认 Redis 数据库连接正常",
        step3: "检查网络连接"
      }
    }, { status: 500 })
  } finally {
    if (client) {
      await client.quit()
    }
  }
}

// DELETE: 重置中奖者列表
export async function DELETE() {
  let client
  try {
    client = await getRedisClient()
    await client.del(REDIS_WINNERS_KEY)
    await client.set(`${REDIS_WINNERS_KEY}_reset`, new Date().toISOString())
    
    console.log('Successfully reset winners in Redis database')
    return NextResponse.json({ 
      success: true,
      storage: 'redis',
      message: "中奖记录已重置"
    })
  } catch (error) {
    console.error("Error resetting winners:", error)
    return NextResponse.json({ 
      error: "重置中奖记录失败", 
      details: error instanceof Error ? error.message : 'Unknown error',
      troubleshooting: {
        step1: "检查环境变量 REDIS_URL 配置",
        step2: "确认 Redis 数据库连接正常",
        step3: "检查网络连接"
      }
    }, { status: 500 })
  } finally {
    if (client) {
      await client.quit()
    }
  }
}
