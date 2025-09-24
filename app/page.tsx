"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Settings, Volume2, Heart, Users, Trophy, RotateCcw } from "lucide-react"
import Link from "next/link"

const DEFAULT_NAMES = [
  "张三",
  "李四",
  "王五",
  "赵六",
  "钱七",
  "孙八",
  "周九",
  "吴十",
  "郑十一",
  "王十二",
  "冯十三",
  "陈十四",
  "褚十五",
  "卫十六",
  "蒋十七",
  "沈十八",
  "韩十九",
  "杨二十",
  "朱二十一",
  "秦二十二",
]

export default function HomePage() {
  const [names, setNames] = useState<string[]>([])
  const [selectedNames, setSelectedNames] = useState<string[]>([])
  const [isSpinning, setIsSpinning] = useState(false)
  const [showResult, setShowResult] = useState(false)
  const [showFireworks, setShowFireworks] = useState(false)
  const [winners, setWinners] = useState<string[]>([])
  const [availableNames, setAvailableNames] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadNames()
    loadWinners()
  }, [])

  const loadNames = async () => {
    try {
      const response = await fetch("/api/names")
      if (response.ok) {
        const data = await response.json()
        setNames(data.names)
      } else {
        console.error("Failed to load names from API")
        setNames(DEFAULT_NAMES)
      }
    } catch (error) {
      console.error("Error loading names:", error)
      setNames(DEFAULT_NAMES)
    } finally {
      setLoading(false)
    }
  }

  const loadWinners = () => {
    const savedWinners = localStorage.getItem("winners")
    if (savedWinners) {
      setWinners(JSON.parse(savedWinners))
    }
  }

  useEffect(() => {
    const available = names.filter((name) => !winners.includes(name))
    setAvailableNames(available)
  }, [names, winners])

  const speakName = async (names: string[]) => {
    try {
      const text =
        names.length === 2
          ? `让幸运之神为新人送上祝福。恭喜${names[0]}和${names[1]}中奖！愿你们幸福美满！`
          : `让幸运之神为新人送上祝福。恭喜${names[0]}中奖！愿你幸福美满！`

      const response = await fetch("/api/tts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
      })

      if (!response.ok) {
        throw new Error(`TTS API returned ${response.status}`)
      }

      const contentType = response.headers.get("Content-Type") || ""

      if (contentType.includes("audio")) {
        const audioBlob = await response.blob()
        const audioUrl = URL.createObjectURL(audioBlob)
        const audio = new Audio(audioUrl)

        audio.addEventListener("canplaythrough", () => {
          audio.play().catch((error) => {
            console.log("[v0] TTS播放失败，使用浏览器默认TTS:", error)
            fallbackToSpeechSynthesis(names)
          })
        })

        audio.addEventListener("error", () => {
          console.log("[v0] TTS音频播放失败，使用浏览器默认TTS")
          fallbackToSpeechSynthesis(names)
        })

        audio.addEventListener("ended", () => {
          URL.revokeObjectURL(audioUrl)
        })

        audio.load()
      } else {
        // 如果不是音频响应，说明API返回了错误
        const errorData = await response.json()
        console.log("[v0] TTS API返回错误:", errorData)
        fallbackToSpeechSynthesis(names)
      }
    } catch (error) {
      console.log("[v0] TTS接口调用失败:", error)
      fallbackToSpeechSynthesis(names)
    }
  }

  const fallbackToSpeechSynthesis = (names: string[]) => {
    if ("speechSynthesis" in window) {
      const text =
        names.length === 2
          ? `让幸运之神为新人送上祝福。恭喜${names[0]}和${names[1]}中奖！愿你们幸福美满！`
          : `让幸运之神为新人送上祝福。恭喜${names[0]}中奖！愿你幸福美满！`

      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = "zh-CN"
      utterance.rate = 0.8
      utterance.pitch = 1.2
      speechSynthesis.speak(utterance)
    }
  }

  const createFireworks = () => {
    setShowFireworks(true)
    setTimeout(() => setShowFireworks(false), 4000)
  }

  const drawName = () => {
    if (availableNames.length === 0) {
      if (names.length === 0) {
        alert("名字池为空，请先添加名字！")
      } else {
        alert("所有人员都已中奖！请重置中奖名单后再次抽奖。")
      }
      return
    }

    if (availableNames.length === 1) {
      alert("剩余人数不足，无法抽取两个人名！")
      return
    }

    setIsSpinning(true)
    setShowResult(false)
    setShowFireworks(false)

    let counter = 0
    const interval = setInterval(() => {
      const shuffled = [...availableNames].sort(() => Math.random() - 0.5)
      setSelectedNames([shuffled[0], shuffled[1]])
      counter++

      if (counter > 20) {
        clearInterval(interval)
        const finalShuffled = [...availableNames].sort(() => Math.random() - 0.5)
        const finalNames = [finalShuffled[0], finalShuffled[1]]
        setSelectedNames(finalNames)
        setIsSpinning(false)
        setShowResult(true)

        const newWinners = [...winners, ...finalNames]
        setWinners(newWinners)
        localStorage.setItem("winners", JSON.stringify(newWinners))

        setTimeout(() => {
          speakName(finalNames)
          createFireworks()
        }, 500)
      }
    }, 100)
  }

  const resetWinners = () => {
    if (confirm("确定要重置所有中奖记录吗？")) {
      setWinners([])
      localStorage.removeItem("winners")
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-pink-50 to-yellow-50 dark:from-red-950 dark:via-pink-950 dark:to-yellow-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">加载名单中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-pink-50 to-yellow-50 dark:from-red-950 dark:via-pink-950 dark:to-yellow-950 relative overflow-hidden">
      {showFireworks && (
        <div className="fixed inset-0 pointer-events-none z-50">
          {[...Array(30)].map((_, i) => (
            <div
              key={`center-${i}`}
              className="absolute w-1 h-1 rounded-full animate-ping"
              style={{
                left: "50%",
                top: "40%",
                backgroundColor: ["#fbbf24", "#f59e0b", "#d97706", "#dc2626", "#ec4899", "#8b5cf6"][i % 6],
                transform: `translate(-50%, -50%) rotate(${i * 12}deg) translateY(-${50 + Math.random() * 100}px)`,
                animationDelay: `${Math.random() * 0.5}s`,
                animationDuration: "2s",
              }}
            />
          ))}

          {[...Array(40)].map((_, i) => (
            <div
              key={`scatter-${i}`}
              className="absolute w-2 h-2 rounded-full"
              style={{
                left: `${30 + Math.random() * 40}%`,
                top: `${20 + Math.random() * 40}%`,
                backgroundColor: ["#fbbf24", "#f59e0b", "#dc2626", "#ec4899", "#8b5cf6", "#06b6d4"][i % 6],
                animation: `firework-burst 2s ease-out ${Math.random() * 1}s forwards`,
                transform: `rotate(${Math.random() * 360}deg)`,
              }}
            />
          ))}

          {[...Array(20)].map((_, i) => (
            <div
              key={`left-${i}`}
              className="absolute w-3 h-3 rounded-full animate-bounce"
              style={{
                left: `${5 + Math.random() * 20}%`,
                top: `${10 + Math.random() * 60}%`,
                backgroundColor: ["#dc2626", "#ec4899", "#fbbf24"][i % 3],
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: "1.5s",
              }}
            />
          ))}

          {[...Array(20)].map((_, i) => (
            <div
              key={`right-${i}`}
              className="absolute w-3 h-3 rounded-full animate-bounce"
              style={{
                right: `${5 + Math.random() * 20}%`,
                top: `${10 + Math.random() * 60}%`,
                backgroundColor: ["#dc2626", "#ec4899", "#fbbf24"][i % 3],
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: "1.5s",
              }}
            />
          ))}

          {[...Array(15)].map((_, i) => (
            <div
              key={`star-${i}`}
              className="absolute text-3xl animate-pulse"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 80}%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: "2s",
                transform: `rotate(${Math.random() * 360}deg)`,
              }}
            >
              ⭐
            </div>
          ))}

          {[...Array(20)].map((_, i) => (
            <div
              key={`heart-${i}`}
              className="absolute text-2xl"
              style={{
                left: `${Math.random() * 100}%`,
                top: "-10%",
                animation: `heart-fall 3s linear ${Math.random() * 2}s forwards`,
                transform: `rotate(${Math.random() * 30 - 15}deg)`,
              }}
            >
              💖
            </div>
          ))}

          {[...Array(25)].map((_, i) => (
            <div
              key={`petal-${i}`}
              className="absolute text-2xl"
              style={{
                left: `${Math.random() * 100}%`,
                top: "-5%",
                animation: `petal-fall 4s ease-in-out ${Math.random() * 2}s forwards`,
                transform: `rotate(${Math.random() * 360}deg)`,
              }}
            >
              🌸
            </div>
          ))}

          {[...Array(10)].map((_, i) => (
            <div
              key={`confetti-${i}`}
              className="absolute text-xl animate-spin"
              style={{
                left: `${20 + Math.random() * 60}%`,
                top: `${10 + Math.random() * 30}%`,
                animationDelay: `${Math.random() * 1}s`,
                animationDuration: "3s",
              }}
            >
              🎊
            </div>
          ))}
        </div>
      )}

      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Heart className="w-8 h-8 text-red-600 animate-pulse" />
            <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-red-600 via-pink-600 to-yellow-600 bg-clip-text text-transparent">
              💒 婚礼抽奖 💒
            </h1>
            <Heart className="w-8 h-8 text-pink-600 animate-pulse" />
          </div>
          <p className="text-lg text-muted-foreground">🎊 让幸运之神为新人送上祝福！🎊</p>
        </div>

        <div className="max-w-4xl mx-auto space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <Card className="relative overflow-hidden border-2 border-dashed border-red-300 dark:border-red-700 bg-gradient-to-br from-red-50 to-pink-50 dark:from-red-950 dark:to-pink-950">
                <CardContent className="p-12 text-center">
                  <div className="mb-6">
                    {selectedNames.length === 0 ? (
                      <div className="text-6xl md:text-8xl font-bold text-gray-600">🎁</div>
                    ) : selectedNames.length === 1 ? (
                      <div
                        className={`text-6xl md:text-8xl font-bold transition-all duration-300 ${
                          isSpinning
                            ? "animate-bounce text-gray-500"
                            : showResult
                              ? "text-red-600 animate-pulse"
                              : "text-gray-600"
                        }`}
                      >
                        {selectedNames[0]}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div
                          className={`text-4xl md:text-6xl font-bold transition-all duration-300 ${
                            isSpinning
                              ? "animate-bounce text-gray-500"
                              : showResult
                                ? "text-red-600 animate-pulse"
                                : "text-gray-600"
                          }`}
                        >
                          {selectedNames[0]}
                        </div>
                        <div className="text-2xl md:text-3xl font-bold text-pink-500">&</div>
                        <div
                          className={`text-4xl md:text-6xl font-bold transition-all duration-300 ${
                            isSpinning
                              ? "animate-bounce text-gray-500"
                              : showResult
                                ? "text-red-600 animate-pulse"
                                : "text-gray-600"
                          }`}
                        >
                          {selectedNames[1]}
                        </div>
                      </div>
                    )}
                  </div>

                  {showResult && (
                    <div className="flex items-center justify-center gap-2 text-lg text-muted-foreground animate-fade-in">
                      <Volume2 className="w-5 h-5" />
                      <span>🎉 恭喜中奖！愿你们幸福美满！🎉</span>
                    </div>
                  )}
                </CardContent>

                <div className="absolute top-4 left-4 text-2xl animate-bounce" style={{ animationDelay: "0s" }}>
                  💖
                </div>
                <div className="absolute top-8 right-8 text-xl animate-bounce" style={{ animationDelay: "0.5s" }}>
                  🌹
                </div>
                <div className="absolute bottom-4 left-8 text-lg animate-bounce" style={{ animationDelay: "1s" }}>
                  💐
                </div>
                <div className="absolute bottom-8 right-4 text-2xl animate-bounce" style={{ animationDelay: "1.5s" }}>
                  💒
                </div>
              </Card>

              <div className="text-center mt-6">
                <button
                  onClick={drawName}
                  disabled={isSpinning || availableNames.length < 2}
                  className="inline-flex items-center justify-center gap-2 px-12 py-6 text-xl font-bold rounded-md transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: isSpinning
                      ? "linear-gradient(to right, #b91c1c, #be185d) !important"
                      : "linear-gradient(to right, #dc2626, #ec4899) !important",
                    color: "#ffffff !important",
                    border: "none !important",
                  }}
                >
                  <div style={{ color: "#ffffff !important", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    {isSpinning ? (
                      <>
                        <Heart className="w-6 h-6 animate-spin" style={{ color: "#ffffff !important" }} />
                        <span style={{ color: "#ffffff !important" }}>抽奖中...</span>
                      </>
                    ) : availableNames.length < 2 ? (
                      <>
                        <Trophy className="w-6 h-6" style={{ color: "#ffffff !important" }} />
                        <span style={{ color: "#ffffff !important" }}>
                          {availableNames.length === 0 ? "🎊 全部中奖 🎊" : "🎊 人数不足 🎊"}
                        </span>
                      </>
                    ) : (
                      <>
                        <Heart className="w-6 h-6" style={{ color: "#ffffff !important" }} />
                        <span style={{ color: "#ffffff !important" }}>🎊 抽取两人 🎊</span>
                      </>
                    )}
                  </div>
                </button>
              </div>
            </div>

            <div className="lg:col-span-1">
              <Card className="h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Trophy className="w-5 h-5 text-yellow-600" />
                      中奖名单
                    </CardTitle>
                    {winners.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={resetWinners}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {winners.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      <Trophy className="w-12 h-12 mx-auto mb-2 opacity-30" />
                      <p>暂无中奖者</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {winners.map((winner, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-2 p-2 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950 dark:to-orange-950 rounded-md border border-yellow-200 dark:border-yellow-800"
                        >
                          <div className="w-6 h-6 bg-yellow-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                            {index + 1}
                          </div>
                          <span className="font-medium text-yellow-800 dark:text-yellow-200">{winner}</span>
                          <div className="ml-auto text-lg">🏆</div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-blue-600" />
                    <span className="font-medium">总参与人数</span>
                  </div>
                  <span className="text-2xl font-bold text-blue-600">{names.length}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Heart className="w-5 h-5 text-green-600" />
                    <span className="font-medium">剩余可抽取</span>
                  </div>
                  <span className="text-2xl font-bold text-green-600">{availableNames.length}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-yellow-600" />
                    <span className="font-medium">已中奖人数</span>
                  </div>
                  <span className="text-2xl font-bold text-yellow-600">{winners.length}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="text-center">
            <Link href="/config">
              <Button
                variant="outline"
                size="lg"
                className="gap-2 bg-transparent border-red-300 text-red-600 hover:bg-red-50"
              >
                <Settings className="w-5 h-5" />
                管理参与名单
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
