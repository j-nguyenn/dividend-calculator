"use client"

import * as React from "react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getSortedRowModel,
  SortingState,
  RowData,
} from "@tanstack/react-table"
import { ArrowUpDown, ArrowLeft } from "lucide-react"
import { format, isAfter, isBefore, startOfDay, subMonths, subYears, subQuarters, startOfQuarter } from "date-fns"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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

declare module '@tanstack/react-table' {
  interface TableMeta<TData extends RowData> {
    updateData: (rowIndex: number, columnId: string, value: unknown) => void
  }
}

function EditableNumberCell({
  initialValue,
  onUpdate,
  step = "1",
  className,
}: {
  initialValue: number
  onUpdate: (value: number) => void
  step?: string
  className?: string
}) {
  const [value, setValue] = React.useState(initialValue)

  React.useEffect(() => {
    setValue(initialValue)
  }, [initialValue])

  const onBlur = () => {
    onUpdate(Number(value))
  }

  return (
    <input
      type="number"
      min="0"
      step={step}
      value={value}
      onChange={(e) => setValue(parseFloat(e.target.value) || 0)}
      onBlur={onBlur}
      className={className}
    />
  )
}

export default function ResultsPage() {
  const router = useRouter()
  const [sorting, setSorting] = useState<SortingState>([])
  const [dividendData, setDividendData] = useState<CalculatedDividend[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [selectedTicker, setSelectedTicker] = useState<string>("all")
  const [dateRange, setDateRange] = useState<string>("all")

  // Unique tickers for dropdown
  const availableTickers = React.useMemo(
    () => [...new Set(dividendData.map((d) => d.ticker))].sort(),
    [dividendData]
  )

  // Compute date boundaries from preset
  const { dateFrom, dateTo } = React.useMemo(() => {
    const now = new Date()
    const today = startOfDay(now)
    switch (dateRange) {
      case "last_quarter": {
        const qStart = startOfQuarter(subQuarters(now, 1))
        const qEnd = startOfDay(startOfQuarter(now))
        return { dateFrom: qStart, dateTo: qEnd }
      }
      case "last_6m":
        return { dateFrom: subMonths(today, 6), dateTo: undefined }
      case "last_year":
        return { dateFrom: subYears(today, 1), dateTo: undefined }
      case "last_2y":
        return { dateFrom: subYears(today, 2), dateTo: undefined }
      case "last_3y":
        return { dateFrom: subYears(today, 3), dateTo: undefined }
      case "last_5y":
        return { dateFrom: subYears(today, 5), dateTo: undefined }
      default:
        return { dateFrom: undefined, dateTo: undefined }
    }
  }, [dateRange])

  // Filtered data
  const filteredData = React.useMemo(() => {
    return dividendData.filter((d) => {
      if (selectedTicker !== "all" && d.ticker !== selectedTicker) return false
      const payDate = startOfDay(new Date(d.payment_date))
      if (dateFrom && isBefore(payDate, startOfDay(dateFrom))) return false
      if (dateTo && isAfter(payDate, startOfDay(dateTo))) return false
      return true
    })
  }, [dividendData, selectedTicker, dateFrom, dateTo])

  // Totals grouped by currency
  const totalsByCurrency = React.useMemo(() => {
    const map: Record<string, number> = {}
    for (const d of filteredData) {
      const cur = d.currency || "USD"
      map[cur] = (map[cur] || 0) + d.total
    }
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b))
  }, [filteredData])

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
        console.log({ portfolio })
        // Fetch dividends for each ticker
        for (const item of portfolio) {
          try {
            // Replace this URL with your actual API endpoint
            const response = await fetch(
              `/api/dividends/${item.ticker}?start_date=${encodeURIComponent(item.start_date)}`
            )
            const data: DividendResponse = await response.json()

            console.log({ data })

            // Calculate total for each dividend payment
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

        // Sort by payment date (most recent first)
        allDividends.sort(
          (a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime()
        )

        setDividendData(allDividends)
      } catch (error) {
        console.error("Error processing dividends:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchDividends()
  }, [router])

  const columns: ColumnDef<CalculatedDividend>[] = [
    {
      accessorKey: "payment_date",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            className="px-2"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Date
            <ArrowUpDown className="ml-1 h-3 w-3" />
          </Button>
        )
      },
      cell: ({ row }) => {
        return <div className="whitespace-nowrap text-center">{format(new Date(row.getValue("payment_date")), "MMM d, yyyy")}</div>
      },
    },
    {
      accessorKey: "ticker",
      header: () => <div className="text-center">Ticker</div>,
      cell: ({ row }) => {
        return <div className="uppercase font-medium text-center">{row.getValue("ticker")}</div>
      },
    },
    {
      accessorKey: "shares",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            className="px-2"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Shares
            <ArrowUpDown className="ml-1 h-3 w-3" />
          </Button>
        )
      },
      cell: ({ getValue, row: { index }, column: { id }, table }) => (
        <EditableNumberCell
          initialValue={getValue() as number}
          onUpdate={(v) => table.options.meta?.updateData(index, id, v)}
          step="1"
          className="w-16 text-center border rounded px-1 py-1 bg-transparent focus:outline-none focus:ring-1 focus:ring-ring mx-auto block"
        />
      ),
    },
    {
      accessorKey: "price_per_share",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            className="px-2"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Price
            <ArrowUpDown className="ml-1 h-3 w-3" />
          </Button>
        )
      },
      cell: ({ row }) => {
        const amount = parseFloat(row.getValue("price_per_share"))
        const currency = row.original.currency
        const formatted = new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: currency,
        }).format(amount)
        return <div className="text-center">{formatted}</div>
      },
    },
    {
      accessorKey: "dividend",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            className="px-2"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Div/Share
            <ArrowUpDown className="ml-1 h-3 w-3" />
          </Button>
        )
      },
      cell: ({ getValue, row: { index }, column: { id }, table }) => (
        <EditableNumberCell
          initialValue={getValue() as number}
          onUpdate={(v) => table.options.meta?.updateData(index, id, v)}
          step="0.01"
          className="w-20 text-center border rounded px-1 py-1 bg-transparent focus:outline-none focus:ring-1 focus:ring-ring mx-auto block"
        />
      ),
    },
    {
      accessorKey: "dividend_yield",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            className="px-2"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Yield
            <ArrowUpDown className="ml-1 h-3 w-3" />
          </Button>
        )
      },
      cell: ({ row }) => {
        const value = parseFloat(row.getValue("dividend_yield"))
        return <div className="text-center">{value.toFixed(4)}%</div>
      },
    },
    {
      accessorKey: "total",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            className="px-2"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Total
            <ArrowUpDown className="ml-1 h-3 w-3" />
          </Button>
        )
      },
      cell: ({ row }) => {
        const amount = parseFloat(row.getValue("total"))
        const currency = row.original.currency
        const formatted = new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: currency,
        }).format(amount)
        return <div className="text-center font-medium">{formatted}</div>
      },
    },
  ]
  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    autoResetPageIndex: false,
    state: {
      sorting,
    },
    meta: {
      updateData: (rowIndex, columnId, value) => {
        setDividendData((old) =>
          old.map((row, index) => {
            if (index === rowIndex) {
              const updated = {
                ...old[rowIndex]!,
                [columnId]: value,
              }
              updated.total = updated.shares * updated.dividend
              return updated
            }
            return row
          })
        )
      },
    },
  })

  if (loading) {
    return (
      <div className="container mx-auto py-10 px-4">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading dividend data...</div>
        </div>
      </div>
    )
  }

  const activeFilterCount = (selectedTicker !== "all" ? 1 : 0) + (dateRange !== "all" ? 1 : 0)

  return (
    <div className="container mx-auto py-6 px-4 max-w-[1400px]">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => router.push("/")}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Portfolio
        </Button>
        <h1 className="text-4xl font-bold mb-2">Dividend History</h1>
        <p className="text-muted-foreground">
          Your dividend earnings from portfolio holdings
        </p>
      </div>

      <div className="flex gap-4">
        {/* Sidebar: Filters + Totals */}
        <div className="w-52 shrink-0 space-y-4">
          {/* Filters */}
          <Card>
            <CardHeader className="py-3 px-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Filters</CardTitle>
                {activeFilterCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs text-muted-foreground"
                    onClick={() => {
                      setSelectedTicker("all")
                      setDateRange("all")
                    }}
                  >
                    Reset
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0 space-y-3">
              {/* Ticker */}
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Ticker</p>
                <Select value={selectedTicker} onValueChange={setSelectedTicker}>
                  <SelectTrigger className="w-full h-8 text-xs">
                    <SelectValue placeholder="All tickers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All tickers</SelectItem>
                    {availableTickers.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t.toUpperCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Date Range */}
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Period</p>
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger className="w-full h-8 text-xs">
                    <SelectValue placeholder="All time" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All time</SelectItem>
                    <SelectItem value="last_quarter">Last quarter</SelectItem>
                    <SelectItem value="last_6m">Last 6 months</SelectItem>
                    <SelectItem value="last_year">Last year</SelectItem>
                    <SelectItem value="last_2y">Last 2 years</SelectItem>
                    <SelectItem value="last_3y">Last 3 years</SelectItem>
                    <SelectItem value="last_5y">Last 5 years</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Totals by currency */}
          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm">Total Earnings</CardTitle>
              <CardDescription className="text-xs">
                {filteredData.length} {filteredData.length === 1 ? "payment" : "payments"}
              </CardDescription>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0 space-y-3">
              {totalsByCurrency.map(([currency, total]) => (
                <div key={currency}>
                  <div className="text-xl font-bold text-primary">
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency,
                    }).format(total)}
                  </div>
                  <p className="text-xs text-muted-foreground">{currency}</p>
                </div>
              ))}
              {totalsByCurrency.length === 0 && (
                <div className="text-xs text-muted-foreground">No data</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Main: Table */}
        <div className="flex-1 min-w-0">
          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-base">Dividend Payments</CardTitle>
              <CardDescription className="text-xs">
                Detailed breakdown
                {selectedTicker !== "all" && ` · ${selectedTicker.toUpperCase()}`}
                {dateFrom && ` · from ${format(dateFrom, "MMM d, yyyy")}`}
                {dateTo && ` · to ${format(dateTo, "MMM d, yyyy")}`}
              </CardDescription>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    {table.getHeaderGroups().map((headerGroup) => (
                      <TableRow key={headerGroup.id}>
                        {headerGroup.headers.map((header) => (
                          <TableHead key={header.id} className="text-center">
                            {header.isPlaceholder
                              ? null
                              : flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                          </TableHead>
                        ))}
                      </TableRow>
                    ))}
                  </TableHeader>
                  <TableBody>
                    {table.getRowModel().rows?.length ? (
                      table.getRowModel().rows.map((row) => (
                        <TableRow
                          key={row.id}
                          data-state={row.getIsSelected() && "selected"}
                        >
                          {row.getVisibleCells().map((cell) => (
                            <TableCell key={cell.id} className="text-center">
                              {flexRender(
                                cell.column.columnDef.cell,
                                cell.getContext()
                              )}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={columns.length}
                          className="h-24 text-center"
                        >
                          No dividend payments found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
