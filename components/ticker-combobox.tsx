"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

// Popular stock tickers - in a real app, this would come from an API
const popularTickers = [
  { value: "aapl", label: "AAPL - Apple Inc." },
  { value: "msft", label: "MSFT - Microsoft Corporation" },
  { value: "googl", label: "GOOGL - Alphabet Inc." },
  { value: "amzn", label: "AMZN - Amazon.com Inc." },
  { value: "nvda", label: "NVDA - NVIDIA Corporation" },
  { value: "meta", label: "META - Meta Platforms Inc." },
  { value: "tsla", label: "TSLA - Tesla Inc." },
  { value: "brk.b", label: "BRK.B - Berkshire Hathaway Inc." },
  { value: "jnj", label: "JNJ - Johnson & Johnson" },
  { value: "v", label: "V - Visa Inc." },
  { value: "pg", label: "PG - Procter & Gamble Co." },
  { value: "jpm", label: "JPM - JPMorgan Chase & Co." },
  { value: "ma", label: "MA - Mastercard Inc." },
  { value: "hd", label: "HD - Home Depot Inc." },
  { value: "cvx", label: "CVX - Chevron Corporation" },
  { value: "ko", label: "KO - Coca-Cola Co." },
  { value: "pep", label: "PEP - PepsiCo Inc." },
  { value: "cost", label: "COST - Costco Wholesale Corp." },
  { value: "wmt", label: "WMT - Walmart Inc." },
  { value: "intc", label: "INTC - Intel Corporation" },
]

interface TickerComboboxProps {
  value: string
  onValueChange: (value: string) => void
}

export function TickerCombobox({ value, onValueChange }: TickerComboboxProps) {
  const [open, setOpen] = React.useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {value
            ? popularTickers.find((ticker) => ticker.value === value)?.label
            : "Select ticker..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0">
        <Command>
          <CommandInput placeholder="Search ticker..." />
          <CommandEmpty>No ticker found.</CommandEmpty>
          <CommandGroup className="max-h-64 overflow-auto">
            {popularTickers.map((ticker) => (
              <CommandItem
                key={ticker.value}
                value={ticker.value}
                onSelect={(currentValue) => {
                  console.log({ currentValue })
                  onValueChange(currentValue === value ? "" : currentValue)
                  setOpen(false)
                }}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    value === ticker.value ? "opacity-100" : "opacity-0"
                  )}
                />
                {ticker.label}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
