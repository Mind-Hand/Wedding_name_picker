import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "redis"

const REDIS_KEY = 'wedding-lottery-names'
const REDIS_WINNERS_KEY = 'wedding-lottery-winners'

// 默认名单（当数据库中没有数据时使用）
const DEFAULT_NAMES = [
  "张三", "李四", "王五", "赵六", "钱七", "孙八", "周九", "吴十",
  "郑十一", "王十二", "冯十三", "陈十四", "褚十五", "卫十六",
  "蒋十七", "沈十八", "韩十九", "杨二十", "朱二十一", "秦二十二"
]

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

// 初始化数据库（如果Redis中没有数据，则使用默认数据）
async function initializeDatabase(): Promise<void> {
  let client
  try {
    client = await getRedisClient()
    
    const existingNames = await client.get(REDIS_KEY)
    if (!existingNames) {
      console.log('Initializing Redis database with default data...')
      await client.set(REDIS_KEY, JSON.stringify(DEFAULT_NAMES))
      console.log('Redis database initialized with', DEFAULT_NAMES.length, 'names')
    }
  } catch (error) {
    console.error('Failed to initialize database:', error)
  } finally {
    if (client) {
      await client.quit()
    }
  }
}

export async function GET() {
  let client
  try {
    // 首先尝试初始化数据库
    await initializeDatabase()
    
    // 从 Redis 读取数据
    client = await getRedisClient()
    const namesData = await client.get(REDIS_KEY)
    
    if (namesData) {
      const names = JSON.parse(namesData)
      if (Array.isArray(names) && names.length > 0) {
        console.log(`Successfully read ${names.length} names from Redis database`)
        return NextResponse.json({ 
          names, 
          source: 'redis',
          message: '数据来源：Redis 数据库'
        })
      }
    }

    // 如果没有数据，返回默认名单
    console.log('No data found in Redis, using default names')
    return NextResponse.json({ 
      names: DEFAULT_NAMES, 
      source: 'default',
      message: '数据来源：默认名单'
    })
  } catch (error) {
    console.error("Error reading names:", error)
    return NextResponse.json({ 
      names: DEFAULT_NAMES, 
      source: 'default',
      message: '读取失败，使用默认名单'
    })
  } finally {
    if (client) {
      await client.quit()
    }
  }
}

export async function POST(request: NextRequest) {
  let client
  try {
    const { names } = await request.json()

    if (!Array.isArray(names)) {
      return NextResponse.json({ 
        error: "Names must be an array",
        received: typeof names
      }, { status: 400 })
    }

    if (names.length === 0) {
      return NextResponse.json({ 
        error: "Names array cannot be empty"
      }, { status: 400 })
    }

    // 验证名单内容
    const validNames = names
      .map(name => typeof name === 'string' ? name.trim() : '')
      .filter(name => name.length > 0)

    if (validNames.length === 0) {
      return NextResponse.json({ 
        error: "No valid names provided"
      }, { status: 400 })
    }

    // 保存到 Redis 数据库
    client = await getRedisClient()
    await client.set(REDIS_KEY, JSON.stringify(validNames))
    
    // 同时保存时间戳
    await client.set(`${REDIS_KEY}_updated`, new Date().toISOString())
    
    console.log(`Successfully saved ${validNames.length} names to Redis database`)
    return NextResponse.json({ 
      success: true, 
      storage: 'redis',
      count: validNames.length,
      message: `成功保存 ${validNames.length} 个名字到 Redis 数据库`
    })
  } catch (error) {
    console.error("Error saving names:", error)
    return NextResponse.json({ 
      error: "保存名单失败", 
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
