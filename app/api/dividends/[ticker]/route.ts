import { NextRequest, NextResponse } from "next/server"

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  const { ticker: rawTicker } = await params
  const ticker = rawTicker.toLowerCase()

  const startDate = request.nextUrl.searchParams.get("start_date")

  const url = new URL(`/dividends/${ticker}`, BACKEND_URL)
  if (startDate) {
    url.searchParams.set("start_date", startDate)
  }

  try {
    const response = await fetch(url.toString())

    if (!response.ok) {
      return NextResponse.json(
        { error: `Backend returned ${response.status}` },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error(`Error fetching dividends for ${ticker}:`, error)
    return NextResponse.json(
      { error: "Failed to fetch dividends from backend" },
      { status: 502 }
    )
  }
}
