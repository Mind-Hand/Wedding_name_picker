import { type NextRequest, NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"

const NAMES_FILE_PATH = path.join(process.cwd(), "public", "names.txt")

export async function GET() {
  try {
    const fileContent = await fs.readFile(NAMES_FILE_PATH, "utf-8")
    const names = fileContent
      .split("\n")
      .map((name) => name.trim())
      .filter((name) => name.length > 0)

    return NextResponse.json({ names })
  } catch (error) {
    console.error("Error reading names file:", error)
    return NextResponse.json({ error: "Failed to read names" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { names } = await request.json()

    if (!Array.isArray(names)) {
      return NextResponse.json({ error: "Names must be an array" }, { status: 400 })
    }

    const fileContent = names.join("\n")
    await fs.writeFile(NAMES_FILE_PATH, fileContent, "utf-8")

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error writing names file:", error)
    return NextResponse.json({ error: "Failed to save names" }, { status: 500 })
  }
}
