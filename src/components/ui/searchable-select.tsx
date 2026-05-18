import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
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
import { cn } from "@/lib/utils";

export type SearchableSelectOption = { value: string; label: string };

export interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  triggerClassName?: string;
  contentClassName?: string;
  id?: string;
  disabled?: boolean;
  align?: "start" | "center" | "end";
  /** If set, dropdown width is at least this many pixels (useful for long labels). */
  minDropdownWidth?: number;
  /**
   * Value used when cleared (no selection). Defaults to `""`.
   * When `value` equals this, the trigger shows the placeholder style (muted).
   */
  unsetValue?: string;
  /**
   * If true, choosing the option that is already selected clears the value to `unsetValue`.
   * Keep false for controls that must always have a value (e.g. page size).
   */
  allowDeselect?: boolean;
}

export function SearchableSelect({
  options,
  value,
  onValueChange,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  emptyMessage = "No matching option.",
  triggerClassName,
  contentClassName,
  id,
  disabled,
  align = "start",
  minDropdownWidth = 0,
  unsetValue,
  allowDeselect = false,
}: SearchableSelectProps) {
  const [open, setOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const [dropdownWidth, setDropdownWidth] = React.useState<number>();
  /** cmdk may still fire `onSelect` after pointer deselect; ignore that one `onSelect`. */
  const skipNextSelectRef = React.useRef(false);

  React.useEffect(() => {
    if (open) skipNextSelectRef.current = false;
  }, [open]);

  React.useLayoutEffect(() => {
    if (open && triggerRef.current) {
      const w = triggerRef.current.offsetWidth;
      setDropdownWidth(minDropdownWidth > 0 ? Math.max(w, minDropdownWidth) : w);
    }
  }, [open, minDropdownWidth]);

  const selectedLabel = React.useMemo(
    () => options.find((o) => o.value === value)?.label,
    [options, value]
  );

  const clearedValue = unsetValue ?? "";
  const triggerMuted =
    value === clearedValue ||
    (selectedLabel == null && Boolean(placeholder));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          ref={triggerRef}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-haspopup="listbox"
          disabled={disabled}
          id={id}
          className={cn(
            "h-10 w-full justify-between border-input bg-background px-3 py-2 text-sm font-normal shadow-sm ring-offset-background hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            triggerClassName
          )}
        >
          <span
            className={cn(
              "min-w-0 flex-1 truncate text-left",
              triggerMuted && "text-muted-foreground/55"
            )}
          >
            {selectedLabel ?? placeholder}
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className={cn("p-0", contentClassName)}
        style={dropdownWidth ? { width: dropdownWidth } : undefined}
        align={align}
        sideOffset={4}
      >
        <Command shouldFilter loop>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            <CommandGroup>
              {options.map((opt) => (
                <CommandItem
                  key={opt.value}
                  value={`${opt.label} ${opt.value}`}
                  keywords={[opt.value, opt.label]}
                  onPointerDown={(e) => {
                    if (!allowDeselect || opt.value !== value) return;
                    e.preventDefault();
                    skipNextSelectRef.current = true;
                    onValueChange(clearedValue);
                    setOpen(false);
                  }}
                  onSelect={() => {
                    if (skipNextSelectRef.current) {
                      skipNextSelectRef.current = false;
                      return;
                    }
                    if (allowDeselect && opt.value === value) {
                      onValueChange(clearedValue);
                    } else {
                      onValueChange(opt.value);
                    }
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4 shrink-0",
                      value === opt.value ? "opacity-100" : "opacity-0"
                    )}
                    aria-hidden
                  />
                  <span className="truncate">{opt.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
