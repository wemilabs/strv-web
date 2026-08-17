"use client";

import { Check, Plus } from "lucide-react";
import { useId, useState } from "react";
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
import type { UnitFormat } from "@/db/schema";
import { slugify } from "@/lib/utils";

type UnitFormatInputProps = {
  availableUnitFormats: UnitFormat[];
  selectedUnitFormat: UnitFormat | null;
  onUnitFormatChangeAction: (unitFormat: UnitFormat | null) => void;
  disabled?: boolean;
};

export function UnitFormatInput({
  availableUnitFormats,
  selectedUnitFormat,
  onUnitFormatChangeAction,
  disabled = false,
}: UnitFormatInputProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const id = useId();

  const filteredUnitFormats = availableUnitFormats.filter(format =>
    format.name.toLowerCase().includes(search.toLowerCase()),
  );

  const selectUnitFormat = (format: UnitFormat) => {
    onUnitFormatChangeAction(format);
    setOpen(false);
    setSearch("");
  };

  const createNewUnitFormat = () => {
    if (!search.trim()) return;

    const slug = slugify(search.trim());
    const existingFormat = availableUnitFormats.find(f => f.slug === slug);

    if (existingFormat) {
      onUnitFormatChangeAction(existingFormat);
    } else {
      const newFormat: UnitFormat = {
        id: `temp-${id}`,
        name: search.trim(),
        slug,
        description: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      onUnitFormatChangeAction(newFormat);
    }

    setSearch("");
    setOpen(false);
  };

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
            disabled={disabled}
            type="button"
          >
            {selectedUnitFormat
              ? selectedUnitFormat.name
              : "Select unit format..."}
            <Plus className="ml-2 size-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0 w-full z-64" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Search or create unit format..."
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              <CommandEmpty>
                <div className="flex flex-col items-center gap-2 py-4">
                  <p className="text-sm text-muted-foreground">
                    No unit formats found
                  </p>
                  {search.trim() && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={createNewUnitFormat}
                      type="button"
                    >
                      <Plus className="size-4" />
                      Create &quot;{search.trim()}&quot;
                    </Button>
                  )}
                </div>
              </CommandEmpty>
              <CommandGroup>
                {filteredUnitFormats.map(format => (
                  <CommandItem
                    key={format.id}
                    value={format.name}
                    onSelect={() => selectUnitFormat(format)}
                  >
                    <Check
                      className={`size-4 ${
                        selectedUnitFormat?.id === format.id
                          ? "opacity-100"
                          : "opacity-0"
                      }`}
                    />
                    <div className="flex flex-col">
                      <span>{format.name}</span>
                      {format.description && (
                        <span className="text-xs text-muted-foreground">
                          {format.description}
                        </span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
              {search.trim() && filteredUnitFormats.length > 0 && (
                <CommandGroup>
                  <CommandItem onSelect={createNewUnitFormat}>
                    <Plus className="size-4" />
                    Create &quot;{search.trim()}&quot;
                  </CommandItem>
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selectedUnitFormat && (
        <div className="text-sm text-muted-foreground">
          {selectedUnitFormat.description && (
            <p>Selected: {selectedUnitFormat.description}</p>
          )}
        </div>
      )}
    </div>
  );
}
