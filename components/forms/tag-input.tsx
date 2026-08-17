"use client";

import { Check, Plus, X } from "lucide-react";
import { useId, useState } from "react";
import { Badge } from "@/components/ui/badge";
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
import type { Tag } from "@/db/schema";
import { slugify } from "@/lib/utils";

type TagInputProps = {
  availableTags: Tag[];
  selectedTags: Tag[];
  onTagsChangeAction: (tags: Tag[]) => void;
  disabled?: boolean;
};

export function TagInput({
  availableTags,
  selectedTags,
  onTagsChangeAction,
  disabled = false,
}: TagInputProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const id = useId();

  const filteredTags = availableTags.filter(tag =>
    tag.name.toLowerCase().includes(search.toLowerCase()),
  );

  const isTagSelected = (tagId: string) =>
    selectedTags.some(t => t.id === tagId);

  const toggleTag = (tag: Tag) => {
    if (isTagSelected(tag.id)) {
      onTagsChangeAction(selectedTags.filter(t => t.id !== tag.id));
    } else {
      onTagsChangeAction([...selectedTags, tag]);
    }
  };

  const removeTag = (tagId: string) => {
    onTagsChangeAction(selectedTags.filter(t => t.id !== tagId));
  };

  const createNewTag = () => {
    if (!search.trim()) return;

    const slug = slugify(search.trim());
    const existingTag = availableTags.find(t => t.slug === slug);

    if (existingTag) {
      if (!isTagSelected(existingTag.id)) {
        onTagsChangeAction([...selectedTags, existingTag]);
      }
    } else {
      const newTag: Tag = {
        id: `temp-${id}`,
        name: search.trim(),
        slug,
        description: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      onTagsChangeAction([...selectedTags, newTag]);
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
            Select tags...
            <Plus className="ml-2 size-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0 w-full z-64" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Search or create tags..."
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              <CommandEmpty>
                <div className="flex flex-col items-center gap-2 py-4">
                  <p className="text-sm text-muted-foreground">No tags found</p>
                  {search.trim() && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={createNewTag}
                      type="button"
                    >
                      <Plus className="size-4" />
                      Create &quot;{search.trim()}&quot;
                    </Button>
                  )}
                </div>
              </CommandEmpty>
              <CommandGroup>
                {filteredTags.map(tag => (
                  <CommandItem
                    key={tag.id}
                    value={tag.name}
                    onSelect={() => toggleTag(tag)}
                  >
                    <Check
                      className={`size-4 ${
                        isTagSelected(tag.id) ? "opacity-100" : "opacity-0"
                      }`}
                    />
                    {tag.name}
                  </CommandItem>
                ))}
              </CommandGroup>
              {search.trim() && filteredTags.length > 0 && (
                <CommandGroup>
                  <CommandItem onSelect={createNewTag}>
                    <Plus className="size-4" />
                    Create &quot;{search.trim()}&quot;
                  </CommandItem>
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedTags.map(tag => (
            <Badge key={tag.id} variant="secondary" className="gap-1">
              {tag.name}
              <button
                type="button"
                className="rounded-full ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
                onClick={() => removeTag(tag.id)}
                disabled={disabled}
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
