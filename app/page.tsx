"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { CalendarIcon, Plus, Trash2, Upload } from "lucide-react"
import { format } from "date-fns"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ThemeToggle } from "@/components/theme-toggle"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { TickerCombobox } from "@/components/ticker-combobox"
import type { PortfolioItem } from "@/types"

export default function PortfolioPage() {
  const router = useRouter()
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([])
  const [currentItem, setCurrentItem] = useState<Omit<PortfolioItem, 'id'>>({
    ticker: "",
    amount: 0,
    start_date: "",
  })
  const [selectedDate, setSelectedDate] = useState<Date>()
  const isInitialLoad = React.useRef(true)

  // Load portfolio from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("portfolio")
    if (stored) {
      setPortfolioItems(JSON.parse(stored))
    }
  }, [])

  // Sync portfolio to localStorage whenever it changes (skip initial render)
  useEffect(() => {
    if (isInitialLoad.current) {
      isInitialLoad.current = false
      return
    }
    localStorage.setItem("portfolio", JSON.stringify(portfolioItems))
  }, [portfolioItems])

  const handleAddItem = () => {
    if (!currentItem.ticker || !currentItem.amount || !currentItem.start_date) {
      alert("Please fill in all fields")
      return
    }

    const newItem: PortfolioItem = {
      ...currentItem,
      id: Date.now().toString(),
    }

    setPortfolioItems([...portfolioItems, newItem])
    setCurrentItem({
      ticker: "",
      amount: 0,
      start_date: "",
    })
    setSelectedDate(undefined)
  }

  const handleRemoveItem = (id: string) => {
    setPortfolioItems(portfolioItems.filter((item) => item.id !== id))
  }

  const handleCreate = () => {
    if (portfolioItems.length === 0) {
      alert("Please add at least one portfolio item")
      return
    }

    router.push("/results")
  }

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date)
    if (date) {
      const formatted = format(date, "yyyy-MM-dd")
      setCurrentItem({
        ...currentItem,
        start_date: formatted,
      })
    }
  }

  const handleDateInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setCurrentItem({ ...currentItem, start_date: value })

    // If it's a valid date, sync the calendar
    const parsed = new Date(value + "T00:00:00")
    if (!isNaN(parsed.getTime()) && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      setSelectedDate(parsed)
    } else {
      setSelectedDate(undefined)
    }
  }

  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      const lines = text.split(/\r?\n/).filter((line) => line.trim())

      // Skip header row
      const header = lines[0]?.toLowerCase()
      const startIndex = header?.includes("ticker") ? 1 : 0

      const newItems: PortfolioItem[] = []
      for (let i = startIndex; i < lines.length; i++) {
        const cols = lines[i].split(",").map((c) => c.trim())
        if (cols.length < 3) continue

        const ticker = cols[0]
        const shares = parseInt(cols[1])
        const startDate = cols[2]

        if (ticker && !isNaN(shares) && startDate) {
          newItems.push({
            id: (Date.now() + i).toString(),
            ticker,
            amount: shares,
            start_date: startDate,
          })
        }
      }

      if (newItems.length > 0) {
        setPortfolioItems((prev) => [...prev, ...newItems])
      }
    }
    reader.readAsText(file)

    // Reset input so the same file can be uploaded again
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  return (
    <div className="container mx-auto py-10 px-4 max-w-4xl">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-1">Dividend Calculator</h1>
            <p className="text-muted-foreground text-sm">
              Build your portfolio and calculate dividend earnings
            </p>
          </div>
          <ThemeToggle />
        </div>
      </div>

      <Card className="mb-4">
        <CardContent className="pt-4">
          <div className="flex items-end gap-3">
            <div className="flex-1 min-w-0 space-y-1">
              <Label htmlFor="ticker" className="text-xs">Ticker</Label>
              <TickerCombobox
                value={currentItem.ticker}
                onValueChange={(value) => {
                  console.log({ value })
                  setCurrentItem({ ...currentItem, ticker: value })
                }}
              />
            </div>

            <div className="w-28 space-y-1">
              <Label htmlFor="amount" className="text-xs">Shares</Label>
              <Input
                id="amount"
                type="number"
                min="0"
                step="1"
                placeholder="100"
                value={currentItem.amount || ""}
                onChange={(e) =>
                  setCurrentItem({
                    ...currentItem,
                    amount: parseInt(e.target.value) || 0,
                  })
                }
              />
            </div>

            <div className="w-44 space-y-1">
              <Label className="text-xs">Purchase Date</Label>
              <Popover>
                <div className="relative">
                  <Input
                    placeholder="YYYY-MM-DD"
                    value={currentItem.start_date}
                    onChange={handleDateInputChange}
                    className="pr-10"
                  />
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    >
                      <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </PopoverTrigger>
                </div>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={handleDateSelect}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <Button onClick={handleAddItem} size="icon" className="shrink-0">
              <Plus className="h-4 w-4" />
            </Button>

            <div className="shrink-0 border-l pl-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleCsvUpload}
                className="hidden"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                title="Upload CSV (ticker, shares, start_date)"
              >
                <Upload className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {portfolioItems.length > 0 && (
        <Card className="mb-4">
          <CardHeader className="py-3 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                Portfolio ({portfolioItems.length} {portfolioItems.length === 1 ? "stock" : "stocks"})
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-3 pt-0">
            <div className="space-y-2">
              {portfolioItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <span className="font-medium uppercase">{item.ticker}</span>
                    <span className="text-sm text-muted-foreground">
                      {item.amount} shares
                    </span>
                    <span className="text-sm text-muted-foreground">
                      Since {item.start_date}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleRemoveItem(item.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Button
        onClick={handleCreate}
        size="lg"
        className="w-full"
        disabled={portfolioItems.length === 0}
      >
        Calculate Dividends
      </Button>
    </div>
  )
}
