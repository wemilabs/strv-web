"use client";

import { Check, Pencil, X } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "../ui/spinner";

interface EditableStoreNameProps {
  storeId: string;
  storeSlug: string;
  initialName: string;
  updateAction: (
    storeId: string,
    storeSlug: string,
    name: string,
  ) => Promise<void>;
}

export function EditableStoreName({
  storeId,
  storeSlug,
  initialName,
  updateAction,
}: EditableStoreNameProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(initialName);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleEdit = () => {
    setIsEditing(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleCancel = () => {
    setName(initialName);
    setIsEditing(false);
  };

  const handleSave = () => {
    const trimmedName = name.trim();
    if (!trimmedName || trimmedName === initialName) {
      handleCancel();
      return;
    }

    startTransition(async () => {
      try {
        await updateAction(storeId, storeSlug, trimmedName);
        setIsEditing(false);
        toast.success("Store name updated", {
          description: "Your store name has been updated successfully.",
        });
      } catch (error) {
        console.error("Failed to update store name:", error);
        setName(initialName);
        toast.error("Failed to update store name", {
          description: "Your store name could not be updated.",
        });
      }
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-2">
        <Input
          ref={inputRef}
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isPending}
          className="text-3xl md:text-5xl font-semibold px-3 py-6 max-w-[500px]"
          maxLength={100}
        />
        <div className="flex items-center">
          <Button
            onClick={handleSave}
            disabled={isPending || !name.trim()}
            size="icon"
            variant="ghost"
            className="size-9 hover:bg-white/10"
          >
            {isPending ? (
              <Spinner />
            ) : (
              <Check className="size-4 text-green-300" />
            )}
          </Button>
          <Button
            onClick={handleCancel}
            disabled={isPending}
            size="icon"
            variant="ghost"
            className="size-9 hover:bg-white/10"
          >
            <X className="size-4 text-red-500" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <h1 className="text-3xl md:text-5xl font-semibold tracking-tight">
        {name}
      </h1>
      <Button
        onClick={handleEdit}
        size="icon"
        variant="ghost"
        className="size-9 hover:bg-white/10"
      >
        <Pencil className="size-4" />
      </Button>
    </div>
  );
}
