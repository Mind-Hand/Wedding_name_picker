import { type NextRequest, NextResponse } from "next/server"
import crypto from "crypto"

const APP_KEY = "518eaeb5af14088d"
const APP_SECRET = "EisOH8XgA1IGBt2ykSBeqlFEbFT5gxxC"

function getInput(input: string): string {
  if (!input) return input
  const inputLen = input.length
  return inputLen <= 20 ? input : input.substring(0, 10) + inputLen + input.substring(inputLen - 10)
}

function calculateSign(appKey: string, appSecret: string, q: string, salt: string, curtime: string): string {
  const strSrc = appKey + getInput(q) + salt + curtime + appSecret
  return crypto.createHash("sha256").update(strSrc, "utf-8").digest("hex")
}

function addAuthParams(appKey: string, appSecret: string, params: Record<string, string>) {
  const q = params.q
  const salt = crypto.randomUUID()
  const curtime = Math.floor(Date.now() / 1000).toString()
  const sign = calculateSign(appKey, appSecret, q, salt, curtime)

  params.appKey = appKey
  params.salt = salt
  params.curtime = curtime
  params.signType = "v3"
  params.sign = sign
}

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json()
    console.log("[v0] TTS API called with text:", text)

    if (!text) {
      return NextResponse.json({ error: "Missing text parameter" }, { status: 400 })
    }

    const q = `${text}`
    const params: Record<string, string> = {
      q: q,
      voiceName: "youxiaozhi",
      format: "mp3",
    }

    addAuthParams(APP_KEY, APP_SECRET, params)
    console.log("[v0] TTS params prepared:", { ...params, sign: params.sign?.substring(0, 10) + "..." })

    const formData = new URLSearchParams()
    Object.keys(params).forEach((key) => {
      formData.append(key, params[key])
    })

    console.log("[v0] Calling Youdao TTS API...")
    const response = await fetch("https://openapi.youdao.com/ttsapi", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      body: formData,
    })

    console.log("[v0] Youdao API response status:", response.status)
    console.log("[v0] Youdao API response headers:", Object.fromEntries(response.headers.entries()))

    if (!response.ok) {
      const errorText = await response.text()
      console.error("[v0] Youdao API error response:", errorText)
      throw new Error(`TTS API returned ${response.status}: ${errorText}`)
    }

    // 检查响应类型
    const contentType = response.headers.get("Content-Type") || ""
    console.log("[v0] Response content type:", contentType)

    if (contentType.includes("audio")) {
      // 返回音频数据
      const audioBuffer = await response.arrayBuffer()
      console.log("[v0] Audio buffer size:", audioBuffer.byteLength)
      return new NextResponse(audioBuffer, {
        status: 200,
        headers: {
          "Content-Type": "audio/mpeg",
          "Content-Length": audioBuffer.byteLength.toString(),
          "Cache-Control": "public, max-age=3600",
        },
      })
    } else {
      const responseText = await response.text()
      console.error("[v0] Non-audio response:", responseText)

      try {
        const errorData = JSON.parse(responseText)
        return NextResponse.json(
          {
            error: "TTS service error",
            details: errorData,
            youdaoError: errorData.errorCode || "unknown",
          },
          { status: 500 },
        )
      } catch {
        return NextResponse.json(
          {
            error: "TTS service error",
            details: responseText,
          },
          { status: 500 },
        )
      }
    }
  } catch (error) {
    console.error("[v0] TTS API Error:", error)
    return NextResponse.json(
      {
        error: "TTS service unavailable",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
