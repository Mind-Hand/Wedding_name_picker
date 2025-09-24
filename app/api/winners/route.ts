import { type NextRequest, NextResponse } from "next/server"
import { kv } from '@vercel/kv'

const KV_WINNERS_KEY = 'wedding-lottery-winners'

// 检查 KV 是否可用
async function isKVAvailable(): Promise<boolean> {
  try {
    if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
      console.log('KV environment variables not found')
      return false
    }
    
    await kv.ping()
    return true
  } catch (error) {
    console.log('KV connection failed:', error)
    return false
  }
}

// GET: 获取中奖者列表
export async function GET() {
  try {
    const kvAvailable = await isKVAvailable()
    
    if (kvAvailable) {
      try {
        const winners = await kv.get<string[]>(KV_WINNERS_KEY)
        const winnersList = winners && Array.isArray(winners) ? winners : []
        
        console.log(`Successfully read ${winnersList.length} winners from KV database`)
        return NextResponse.json({ 
          winners: winnersList,
          source: 'kv',
          message: `共有 ${winnersList.length} 位中奖者`
        })
      } catch (kvError) {
        console.error('KV read failed:', kvError)
      }
    }

    // 如果 KV 不可用，返回空列表但不报错
    return NextResponse.json({ 
      winners: [],
      source: 'fallback',
      message: 'KV数据库不可用，中奖记录仅保存在浏览器本地'
    })
  } catch (error) {
    console.error("Error reading winners:", error)
    return NextResponse.json({ 
      winners: [],
      source: 'error',
      message: '读取中奖记录失败'
    })
  }
}

// POST: 添加中奖者
export async function POST(request: NextRequest) {
  try {
    const { winners } = await request.json()

    if (!Array.isArray(winners)) {
      return NextResponse.json({ 
        error: "Winners must be an array",
        received: typeof winners
      }, { status: 400 })
    }

    // 验证中奖者名单
    const validWinners = winners
      .map(winner => typeof winner === 'string' ? winner.trim() : '')
      .filter(winner => winner.length > 0)

    const kvAvailable = await isKVAvailable()
    
    if (kvAvailable) {
      try {
        // 获取现有中奖者
        const existingWinners = await kv.get<string[]>(KV_WINNERS_KEY) || []
        
        // 合并新的中奖者（避免重复）
        const allWinners = Array.isArray(existingWinners) ? existingWinners : []
        const newWinners = validWinners.filter(winner => !allWinners.includes(winner))
        const updatedWinners = [...allWinners, ...newWinners]
        
        await kv.set(KV_WINNERS_KEY, updatedWinners)
        await kv.set(`${KV_WINNERS_KEY}_updated`, new Date().toISOString())
        
        console.log(`Successfully saved ${updatedWinners.length} winners to KV database`)
        return NextResponse.json({ 
          success: true,
          winners: updatedWinners,
          newCount: newWinners.length,
          totalCount: updatedWinners.length,
          message: `成功添加 ${newWinners.length} 位新中奖者，总计 ${updatedWinners.length} 位`
        })
      } catch (kvError) {
        console.error('KV write failed:', kvError)
        return NextResponse.json({ 
          error: "保存中奖记录失败", 
          details: kvError instanceof Error ? kvError.message : 'Unknown error'
        }, { status: 500 })
      }
    }

    // KV 不可用时的响应
    return NextResponse.json({ 
      success: false,
      message: "KV数据库不可用，中奖记录仅保存在浏览器本地存储中",
      suggestion: "请配置 Vercel KV 数据库以启用跨设备同步"
    }, { status: 200 })
  } catch (error) {
    console.error("Error saving winners:", error)
    return NextResponse.json({ 
      error: "处理中奖记录失败", 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// DELETE: 重置中奖者列表
export async function DELETE() {
  try {
    const kvAvailable = await isKVAvailable()
    
    if (kvAvailable) {
      try {
        await kv.del(KV_WINNERS_KEY)
        await kv.set(`${KV_WINNERS_KEY}_reset`, new Date().toISOString())
        
        console.log('Successfully reset winners in KV database')
        return NextResponse.json({ 
          success: true,
          message: "中奖记录已重置"
        })
      } catch (kvError) {
        console.error('KV delete failed:', kvError)
        return NextResponse.json({ 
          error: "重置中奖记录失败", 
          details: kvError instanceof Error ? kvError.message : 'Unknown error'
        }, { status: 500 })
      }
    }

    return NextResponse.json({ 
      success: false,
      message: "KV数据库不可用，请在浏览器中手动重置中奖记录"
    }, { status: 200 })
  } catch (error) {
    console.error("Error resetting winners:", error)
    return NextResponse.json({ 
      error: "重置操作失败", 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
