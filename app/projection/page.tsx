"use client"

import * as React from "react"
import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, TrendingUp } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ThemeToggle } from "@/components/theme-toggle"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { PortfolioItem, DividendResponse, CalculatedDividend } from "@/types"

// Fixed estimated FX rates (to USD base)
const FX_RATES: Record<string, number> = {
  USD: 1,
  EUR: 1.08,
  GBP: 1.27,
  CAD: 0.74,
  AUD: 0.65,
  JPY: 0.0067,
  CHF: 1.13,
  HKD: 0.13,
  SGD: 0.75,
  CNY: 0.14,
  KRW: 0.00075,
  INR: 0.012,
  BRL: 0.20,
  MXN: 0.058,
  SEK: 0.096,
  NOK: 0.094,
  DKK: 0.145,
  NZD: 0.61,
  ZAR: 0.055,
  TWD: 0.031,
}

const SUPPORTED_CURRENCIES = Object.keys(FX_RATES).sort()

interface TickerStats {
  ticker: string
  currency: string
  annualDivPerShare: number
  pricePerShare: number
  dividendYield: number
  paymentsPerYear: number
}

function convertCurrency(amount: number, fromCurrency: string, toCurrency: string): number {
  const fromRate = FX_RATES[fromCurrency] ?? 1
  const toRate = FX_RATES[toCurrency] ?? 1
  // Convert to USD first, then to target
  return (amount * fromRate) / toRate
}

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

interface ProjectionRow {
  ticker: string
  nativeCurrency: string
  pricePerShare: number
  annualDivPerShare: number
  dividendYield: number
  sharesNeeded: number
  investmentNative: number
  investmentTarget: number
  monthlyDivTarget: number
}

export default function ProjectionPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [dividendData, setDividendData] = useState<CalculatedDividend[]>([])
  const [targetMonthlyDiv, setTargetMonthlyDiv] = useState<number>(500)
  const [targetYears, setTargetYears] = useState<number>(10)
  const [targetCurrency, setTargetCurrency] = useState<string>("USD")

  // Fetch dividend data (same as results page)
  useEffect(() => {
    const fetchDividends = async () => {
      try {
        const portfolioStr = localStorage.getItem("portfolio")
        if (!portfolioStr) {
          router.push("/")
          return
        }

        const portfolio: PortfolioItem[] = JSON.parse(portfolioStr)
        const allDividends: CalculatedDividend[] = []

        for (const item of portfolio) {
          try {
            const response = await fetch(
              `/api/dividends/${item.ticker}?start_date=${encodeURIComponent(item.start_date)}`
            )
            const data: DividendResponse = await response.json()
            const calculatedDividends: CalculatedDividend[] = data.dividends.map((div) => ({
              ...div,
              shares: item.amount,
              total: div.dividend * item.amount,
            }))
            allDividends.push(...calculatedDividends)
          } catch (error) {
            console.error(`Error fetching dividends for ${item.ticker}:`, error)
          }
        }

        setDividendData(allDividends)
      } catch (error) {
        console.error("Error processing dividends:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchDividends()
  }, [router])

  // Compute per-ticker stats from historical data
  const tickerStats: TickerStats[] = useMemo(() => {
    const grouped: Record<string, CalculatedDividend[]> = {}
    for (const d of dividendData) {
      if (!grouped[d.ticker]) grouped[d.ticker] = []
      grouped[d.ticker].push(d)
    }

    return Object.entries(grouped).map(([ticker, divs]) => {
      const currency = divs[0].currency || "USD"
      const latestPrice = divs.reduce(
        (best, d) =>
          new Date(d.payment_date) > new Date(best.payment_date) ? d : best,
        divs[0]
      ).price_per_share

      // Count unique payment dates to estimate payments per year
      const dates = [...new Set(divs.map((d) => d.payment_date))].sort()
      let paymentsPerYear = 4 // default quarterly
      if (dates.length >= 2) {
        const firstDate = new Date(dates[0]).getTime()
        const lastDate = new Date(dates[dates.length - 1]).getTime()
        const spanYears = (lastDate - firstDate) / (365.25 * 24 * 3600 * 1000)
        if (spanYears > 0.25) {
          paymentsPerYear = Math.round(dates.length / spanYears)
          paymentsPerYear = Math.max(1, Math.min(12, paymentsPerYear))
        }
      }

      // Average dividend per share per payment
      const avgDivPerPayment =
        divs.reduce((s, d) => s + d.dividend, 0) / divs.length
      const annualDivPerShare = avgDivPerPayment * paymentsPerYear
      const dividendYield = latestPrice > 0 ? (annualDivPerShare / latestPrice) * 100 : 0

      return {
        ticker,
        currency,
        annualDivPerShare,
        pricePerShare: latestPrice,
        dividendYield,
        paymentsPerYear,
      }
    })
  }, [dividendData])

  // Compute projection
  const projection = useMemo(() => {
    if (tickerStats.length === 0 || targetMonthlyDiv <= 0) return null

    const targetAnnualDiv = targetMonthlyDiv * 12

    // Split target equally among tickers
    const perTicketAnnualTarget = targetAnnualDiv / tickerStats.length

    const rows: ProjectionRow[] = tickerStats.map((ts) => {
      // How much annual dividend per share in target currency
      const annualDivInTarget = convertCurrency(
        ts.annualDivPerShare,
        ts.currency,
        targetCurrency
      )

      // Shares needed for this ticker's portion of the target
      const sharesNeeded =
        annualDivInTarget > 0 ? Math.ceil(perTicketAnnualTarget / annualDivInTarget) : 0

      // Investment in native currency
      const investmentNative = sharesNeeded * ts.pricePerShare

      // Investment in target currency
      const investmentTarget = convertCurrency(
        investmentNative,
        ts.currency,
        targetCurrency
      )

      // Actual monthly dividend from these shares in target currency
      const monthlyDivTarget = (sharesNeeded * annualDivInTarget) / 12

      return {
        ticker: ts.ticker,
        nativeCurrency: ts.currency,
        pricePerShare: ts.pricePerShare,
        annualDivPerShare: ts.annualDivPerShare,
        dividendYield: ts.dividendYield,
        sharesNeeded,
        investmentNative,
        investmentTarget,
        monthlyDivTarget,
      }
    })

    const totalInvestment = rows.reduce((s, r) => s + r.investmentTarget, 0)
    const totalMonthlyDiv = rows.reduce((s, r) => s + r.monthlyDivTarget, 0)
    const totalShares = rows.reduce((s, r) => s + r.sharesNeeded, 0)

    // Monthly investment needed over Y years
    const totalMonths = targetYears * 12
    const monthlyInvestment = totalMonths > 0 ? totalInvestment / totalMonths : 0
    const yearlyInvestment = targetYears > 0 ? totalInvestment / targetYears : 0

    // Shares to buy per month (roughly)
    const sharesPerMonth = totalMonths > 0 ? totalShares / totalMonths : 0
    const sharesPerYear = targetYears > 0 ? totalShares / targetYears : 0

    return {
      rows,
      totalInvestment,
      totalMonthlyDiv,
      totalShares,
      monthlyInvestment,
      yearlyInvestment,
      sharesPerMonth,
      sharesPerYear,
    }
  }, [tickerStats, targetMonthlyDiv, targetYears, targetCurrency])

  if (loading) {
    return (
      <div className="container mx-auto py-10 px-4">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading portfolio data...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 px-4 max-w-[1400px]">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => router.push("/results")}
            className=""
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Results
          </Button>
          <ThemeToggle />
        </div>
        <h1 className="text-4xl font-bold mb-2">Dividend Projection</h1>
        <p className="text-muted-foreground">
          Plan your investment to reach a target monthly dividend
        </p>
      </div>

      <div className="flex gap-4">
        {/* Sidebar: Inputs + Summary */}
        <div className="w-60 shrink-0 space-y-4">
          {/* Target Inputs */}
          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm">Target</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0 space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Monthly Dividend</Label>
                <Input
                  type="number"
                  min="0"
                  step="50"
                  value={targetMonthlyDiv || ""}
                  onChange={(e) => setTargetMonthlyDiv(parseFloat(e.target.value) || 0)}
                  className="h-8 text-sm"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Time Horizon (years)</Label>
                <Input
                  type="number"
                  min="1"
                  max="50"
                  step="1"
                  value={targetYears || ""}
                  onChange={(e) => setTargetYears(parseInt(e.target.value) || 0)}
                  className="h-8 text-sm"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Target Currency</Label>
                <Select value={targetCurrency} onValueChange={setTargetCurrency}>
                  <SelectTrigger className="w-full h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SUPPORTED_CURRENCIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Summary */}
          {projection && (
            <Card>
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm flex items-center gap-1">
                  <TrendingUp className="h-3.5 w-3.5" />
                  Investment Plan
                </CardTitle>
                <CardDescription className="text-xs">
                  To earn {formatCurrency(targetMonthlyDiv, targetCurrency)}/mo
                </CardDescription>
              </CardHeader>
              <CardContent className="px-4 pb-4 pt-0 space-y-4">
                <div>
                  <p className="text-xs text-muted-foreground">Total Investment</p>
                  <p className="text-xl font-bold text-primary">
                    {formatCurrency(projection.totalInvestment, targetCurrency)}
                  </p>
                </div>

                <div className="border-t pt-3 space-y-2">
                  <p className="text-xs text-muted-foreground font-medium">Monthly Contribution</p>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Amount</span>
                    <span className="font-medium">{formatCurrency(projection.monthlyInvestment, targetCurrency)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Shares</span>
                    <span className="font-medium">~{Math.ceil(projection.sharesPerMonth)}</span>
                  </div>
                </div>

                <div className="border-t pt-3 space-y-2">
                  <p className="text-xs text-muted-foreground font-medium">Yearly Contribution</p>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Amount</span>
                    <span className="font-medium">{formatCurrency(projection.yearlyInvestment, targetCurrency)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Shares</span>
                    <span className="font-medium">~{Math.ceil(projection.sharesPerYear)}</span>
                  </div>
                </div>

                <div className="border-t pt-3 space-y-2">
                  <p className="text-xs text-muted-foreground font-medium">Final Portfolio</p>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Value</span>
                    <span className="font-bold text-primary">{formatCurrency(projection.totalInvestment, targetCurrency)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Shares</span>
                    <span className="font-medium">{projection.totalShares.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Monthly Div</span>
                    <span className="font-medium">{formatCurrency(projection.totalMonthlyDiv, targetCurrency)}</span>
                  </div>
                </div>

                <div className="text-[10px] text-muted-foreground border-t pt-2">
                  Based on fixed estimated FX rates. Actual results may vary.
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Main: Per-ticker breakdown */}
        <div className="flex-1 min-w-0">
          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-base">Per-Ticker Breakdown</CardTitle>
              <CardDescription className="text-xs">
                Investment split equally across {tickerStats.length} {tickerStats.length === 1 ? "stock" : "stocks"} · Target equally distributed
              </CardDescription>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0">
              {projection && projection.rows.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-center">Ticker</TableHead>
                        <TableHead className="text-center">Price</TableHead>
                        <TableHead className="text-center">Annual Div</TableHead>
                        <TableHead className="text-center">Yield</TableHead>
                        <TableHead className="text-center">Shares Needed</TableHead>
                        <TableHead className="text-center">Investment</TableHead>
                        <TableHead className="text-center">Monthly Div</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {projection.rows.map((row) => (
                        <TableRow key={row.ticker}>
                          <TableCell className="text-center font-medium uppercase">
                            {row.ticker}
                          </TableCell>
                          <TableCell className="text-center whitespace-nowrap">
                            {formatCurrency(row.pricePerShare, row.nativeCurrency)}
                          </TableCell>
                          <TableCell className="text-center whitespace-nowrap">
                            {formatCurrency(row.annualDivPerShare, row.nativeCurrency)}
                          </TableCell>
                          <TableCell className="text-center">
                            {row.dividendYield.toFixed(2)}%
                          </TableCell>
                          <TableCell className="text-center font-medium">
                            {row.sharesNeeded.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-center whitespace-nowrap">
                            <div>{formatCurrency(row.investmentTarget, targetCurrency)}</div>
                            {row.nativeCurrency !== targetCurrency && (
                              <div className="text-xs text-muted-foreground">
                                {formatCurrency(row.investmentNative, row.nativeCurrency)}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-center whitespace-nowrap font-medium text-primary">
                            {formatCurrency(row.monthlyDivTarget, targetCurrency)}
                          </TableCell>
                        </TableRow>
                      ))}
                      {/* Totals row */}
                      <TableRow className="bg-muted/50 font-medium">
                        <TableCell className="text-center">Total</TableCell>
                        <TableCell />
                        <TableCell />
                        <TableCell />
                        <TableCell className="text-center">
                          {projection.totalShares.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-center whitespace-nowrap">
                          {formatCurrency(projection.totalInvestment, targetCurrency)}
                        </TableCell>
                        <TableCell className="text-center whitespace-nowrap text-primary">
                          {formatCurrency(projection.totalMonthlyDiv, targetCurrency)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
                  No dividend data available for projection.
                </div>
              )}

              {/* FX Rates Reference */}
              {projection && projection.rows.some((r) => r.nativeCurrency !== targetCurrency) && (
                <div className="mt-4 p-3 rounded-md bg-muted/50">
                  <p className="text-xs font-medium mb-1">Estimated FX Rates Used</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                    {[...new Set(projection.rows.map((r) => r.nativeCurrency))]
                      .filter((c) => c !== targetCurrency)
                      .map((c) => {
                        const rate = convertCurrency(1, c, targetCurrency)
                        return (
                          <span key={c} className="text-xs text-muted-foreground">
                            1 {c} = {rate.toFixed(4)} {targetCurrency}
                          </span>
                        )
                      })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
