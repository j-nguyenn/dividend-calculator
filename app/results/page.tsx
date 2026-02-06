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
import { format } from "date-fns"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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

  const totalEarnings = React.useMemo(
    () => dividendData.reduce((sum, div) => sum + div.total, 0),
    [dividendData]
  )

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
              pricePerShare: 0,
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
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Payment Date
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => {
        return format(new Date(row.getValue("payment_date")), "MMM d, yyyy")
      },
    },
    {
      accessorKey: "ticker",
      header: "Ticker",
      cell: ({ row }) => {
        return <div className="uppercase font-medium">{row.getValue("ticker")}</div>
      },
    },
    {
      accessorKey: "shares",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Number of Shares
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ getValue, row: { index }, column: { id }, table }) => (
        <EditableNumberCell
          initialValue={getValue() as number}
          onUpdate={(v) => table.options.meta?.updateData(index, id, v)}
          step="1"
          className="w-20 text-right border rounded px-2 py-1 bg-transparent focus:outline-none focus:ring-1 focus:ring-ring"
        />
      ),
    },
    {
      accessorKey: "pricePerShare",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Price per Share
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ getValue, row: { index }, column: { id }, table }) => (
        <EditableNumberCell
          initialValue={getValue() as number}
          onUpdate={(v) => table.options.meta?.updateData(index, id, v)}
          step="0.01"
          className="w-24 text-right border rounded px-2 py-1 bg-transparent focus:outline-none focus:ring-1 focus:ring-ring"
        />
      ),
    },
    {
      accessorKey: "dividend",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Dividend/Share
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ getValue, row: { index }, column: { id }, table }) => (
        <EditableNumberCell
          initialValue={getValue() as number}
          onUpdate={(v) => table.options.meta?.updateData(index, id, v)}
          step="0.01"
          className="w-24 text-right border rounded px-2 py-1 bg-transparent focus:outline-none focus:ring-1 focus:ring-ring"
        />
      ),
    },
    {
      accessorKey: "total",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Total Earned
            <ArrowUpDown className="ml-2 h-4 w-4" />
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
        return <div className="text-right font-medium">{formatted}</div>
      },
    },
  ]
  console.log({ dividendData })
  const table = useReactTable({
    data: dividendData,
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

  return (
    <div className="container mx-auto py-10 px-4 max-w-6xl">
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

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Total Earnings</CardTitle>
          <CardDescription>Cumulative dividends received</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold text-primary">
            {new Intl.NumberFormat("en-US", {
              style: "currency",
              currency: "USD",
            }).format(totalEarnings)}
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            From {dividendData.length} dividend {dividendData.length === 1 ? "payment" : "payments"}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Dividend Payments</CardTitle>
          <CardDescription>
            Detailed breakdown of all dividend payments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => {
                      return (
                        <TableHead key={header.id}>
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                        </TableHead>
                      )
                    })}
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
                        <TableCell key={cell.id}>
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
  )
}
