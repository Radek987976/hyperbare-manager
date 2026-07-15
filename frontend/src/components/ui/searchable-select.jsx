import * as React from "react";
import { Check, ChevronsUpDown, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

/**
 * Liste déroulante avec recherche.
 * - Tri alphabétique des options
 * - Dernier élément sélectionné remonté en haut (mémorisé par navigateur via storageKey)
 * - Recherche en tapant
 *
 * options: [{ value, label, disabled }]
 */
export const SearchableSelect = React.forwardRef(function SearchableSelect(
  {
    value,
    onValueChange,
    options = [],
    placeholder = "Sélectionner",
    searchPlaceholder = "Rechercher...",
    emptyText = "Aucun résultat",
    disabled = false,
    className,
    contentClassName,
    "data-testid": dataTestId,
  },
  ref
) {
  const [open, setOpen] = React.useState(false);
  const storageKey = dataTestId ? `ss-last:${dataTestId}` : null;

  const lastValue = React.useMemo(() => {
    if (!storageKey) return null;
    try {
      return localStorage.getItem(storageKey);
    } catch {
      return null;
    }
  }, [storageKey, open]);

  const sortedOptions = React.useMemo(() => {
    const sorted = [...options].sort((a, b) =>
      String(a.label).localeCompare(String(b.label), "fr", { sensitivity: "base" })
    );
    if (lastValue) {
      const idx = sorted.findIndex((o) => o.value === lastValue);
      if (idx > 0) {
        const [recent] = sorted.splice(idx, 1);
        recent.__recent = true;
        sorted.unshift(recent);
      }
    }
    return sorted;
  }, [options, lastValue]);

  const selected = options.find((o) => o.value === value);

  const handleSelect = (val) => {
    onValueChange?.(val);
    if (storageKey) {
      try {
        localStorage.setItem(storageKey, val);
      } catch {
        /* ignore */
      }
    }
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          ref={ref}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          data-testid={dataTestId}
          className={cn(
            "w-full justify-between font-normal border-slate-200 bg-white hover:bg-white",
            !selected && "text-muted-foreground",
            className
          )}
        >
          <span className="truncate">{selected ? selected.label : placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className={cn("w-[--radix-popover-trigger-width] p-0", contentClassName)}
        align="start"
      >
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {sortedOptions.map((opt) => (
                <CommandItem
                  key={opt.value}
                  value={`${opt.label} ${opt.value}`}
                  disabled={opt.disabled}
                  onSelect={() => handleSelect(opt.value)}
                  data-testid={dataTestId ? `${dataTestId}-option-${opt.value}` : undefined}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === opt.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="flex-1 truncate">{opt.label}</span>
                  {opt.__recent && (
                    <Clock className="ml-2 h-3 w-3 text-slate-400 shrink-0" title="Dernier utilisé" />
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
});
