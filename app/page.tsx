"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { CalendarIcon, Plus, Trash2 } from "lucide-react"
import { format } from "date-fns"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { TickerCombobox } from "@/components/ticker-combobox"
import { cn } from "@/lib/utils"
import type { PortfolioItem } from "@/types"

export default function PortfolioPage() {
  const router = useRouter()
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("portfolio")
      return stored ? JSON.parse(stored) : []
    }
    return []
  })
  const [currentItem, setCurrentItem] = useState<Omit<PortfolioItem, 'id'>>({
    ticker: "",
    amount: 0,
    start_date: "",
  })
  const [selectedDate, setSelectedDate] = useState<Date>()

  // Sync portfolio to localStorage whenever it changes
  useEffect(() => {
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
      setCurrentItem({
        ...currentItem,
        start_date: format(date, "yyyy-MM-dd"),
      })
    }
  }

  return (
    <div className="container mx-auto py-10 px-4 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Dividend Calculator</h1>
        <p className="text-muted-foreground">
          Build your portfolio and calculate dividend earnings
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Add Stock to Portfolio</CardTitle>
          <CardDescription>
            Enter ticker symbol, number of shares, and purchase date
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ticker">Ticker Symbol</Label>
            <TickerCombobox
              value={currentItem.ticker}
              onValueChange={(value) => {
                console.log({ value })
                setCurrentItem({ ...currentItem, ticker: value })
              }
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Number of Shares</Label>
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

          <div className="space-y-2">
            <Label>First Purchase Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !selectedDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? (
                    format(selectedDate, "PPP")
                  ) : (
                    <span>Pick a date</span>
                  )}
                </Button>
              </PopoverTrigger>
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

          <Button onClick={handleAddItem} className="w-full">
            <Plus className="mr-2 h-4 w-4" />
            Add to Portfolio
          </Button>
        </CardContent>
      </Card>

      {portfolioItems.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Your Portfolio</CardTitle>
            <CardDescription>
              {portfolioItems.length} {portfolioItems.length === 1 ? "stock" : "stocks"} added
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {portfolioItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="space-y-1">
                    <p className="font-medium uppercase">{item.ticker}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.amount} shares • Since {format(new Date(item.start_date), "MMM d, yyyy")}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveItem(item.id)}
                  >
                    <Trash2 className="h-4 w-4" />
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
