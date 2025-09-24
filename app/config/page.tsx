"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Plus, Trash2, Edit2, Search, Save, X } from "lucide-react"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"

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

export default function ConfigPage() {
  const [names, setNames] = useState<string[]>([])
  const [newName, setNewName] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editingName, setEditingName] = useState("")
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    loadNames()
  }, [])

  const loadNames = async () => {
    try {
      const response = await fetch("/api/names")
      if (response.ok) {
        const data = await response.json()
        setNames(data.names)
      } else {
        console.error("Failed to load names")
        setNames(DEFAULT_NAMES)
      }
    } catch (error) {
      console.error("Error loading names:", error)
      setNames(DEFAULT_NAMES)
    } finally {
      setLoading(false)
    }
  }

  const saveNames = async (newNames: string[]) => {
    try {
      const response = await fetch("/api/names", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ names: newNames }),
      })

      if (response.ok) {
        setNames(newNames)
        toast({
          title: "成功",
          description: "名单已保存",
        })
      } else {
        throw new Error("Failed to save names")
      }
    } catch (error) {
      console.error("Error saving names:", error)
      toast({
        title: "错误",
        description: "保存失败，请重试",
        variant: "destructive",
      })
    }
  }

  const addName = () => {
    if (!newName.trim()) {
      toast({
        title: "错误",
        description: "请输入有效的名字",
        variant: "destructive",
      })
      return
    }

    if (names.includes(newName.trim())) {
      toast({
        title: "错误",
        description: "该名字已存在",
        variant: "destructive",
      })
      return
    }

    const updatedNames = [...names, newName.trim()]
    saveNames(updatedNames)
    setNewName("")
  }

  const deleteName = (index: number) => {
    const updatedNames = names.filter((_, i) => i !== index)
    saveNames(updatedNames)
  }

  const startEdit = (index: number) => {
    setEditingIndex(index)
    setEditingName(names[index])
  }

  const saveEdit = () => {
    if (!editingName.trim()) {
      toast({
        title: "错误",
        description: "请输入有效的名字",
        variant: "destructive",
      })
      return
    }

    if (names.includes(editingName.trim()) && editingName.trim() !== names[editingIndex!]) {
      toast({
        title: "错误",
        description: "该名字已存在",
        variant: "destructive",
      })
      return
    }

    const updatedNames = [...names]
    updatedNames[editingIndex!] = editingName.trim()
    saveNames(updatedNames)
    setEditingIndex(null)
    setEditingName("")
  }

  const cancelEdit = () => {
    setEditingIndex(null)
    setEditingName("")
  }

  const resetToDefault = () => {
    saveNames(DEFAULT_NAMES)
  }

  const filteredNames = names.filter((name) => name.toLowerCase().includes(searchTerm.toLowerCase()))

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-950 dark:via-indigo-950 dark:to-purple-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">加载名单中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-950 dark:via-indigo-950 dark:to-purple-950">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              返回主页
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">名字池管理</h1>
        </div>

        <div className="max-w-4xl mx-auto space-y-6">
          {/* Add New Name */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5" />
                添加新名字
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input
                  placeholder="输入新名字..."
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && addName()}
                  className="flex-1"
                />
                <Button onClick={addName}>
                  <Plus className="w-4 h-4 mr-2" />
                  添加
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Search and Stats */}
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="flex items-center gap-2 flex-1">
                  <Search className="w-5 h-5 text-muted-foreground" />
                  <Input
                    placeholder="搜索名字..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="max-w-sm"
                  />
                </div>
                <div className="flex items-center gap-4">
                  <Badge variant="secondary" className="text-lg px-3 py-1">
                    总计: {names.length}
                  </Badge>
                  <Button variant="outline" onClick={resetToDefault}>
                    重置默认
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Names List */}
          <Card>
            <CardHeader>
              <CardTitle>名字列表</CardTitle>
            </CardHeader>
            <CardContent>
              {filteredNames.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  {searchTerm ? "没有找到匹配的名字" : "名字池为空，请添加名字"}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filteredNames.map((name, index) => {
                    const originalIndex = names.indexOf(name)
                    const isEditing = editingIndex === originalIndex

                    return (
                      <div key={originalIndex} className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg border">
                        {isEditing ? (
                          <>
                            <Input
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              onKeyPress={(e) => e.key === "Enter" && saveEdit()}
                              className="flex-1 h-8"
                              autoFocus
                            />
                            <Button size="sm" onClick={saveEdit} className="h-8 w-8 p-0">
                              <Save className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={cancelEdit}
                              className="h-8 w-8 p-0 bg-transparent"
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <span className="flex-1 font-medium">{name}</span>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => startEdit(originalIndex)}
                              className="h-8 w-8 p-0"
                            >
                              <Edit2 className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => deleteName(originalIndex)}
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
