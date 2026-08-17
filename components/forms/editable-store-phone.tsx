"use client";

import { Check, Pencil, Phone, X } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { COUNTRIES } from "@/lib/constants";
import { parsePhoneNumber } from "@/lib/utils";

interface EditableStorePhoneProps {
  storeId: string;
  storeSlug: string;
  phoneType: "notifications" | "payments";
  initialPhone?: string;
  updateAction: (
    storeId: string,
    storeSlug: string,
    phoneType: "notifications" | "payments",
    phone: string,
  ) => Promise<void>;
}

export function EditableStorePhone({
  storeId,
  storeSlug,
  phoneType,
  initialPhone = "",
  updateAction,
}: EditableStorePhoneProps) {
  const [isEditing, setIsEditing] = useState(false);

  const parsed = parsePhoneNumber(initialPhone);
  const [countryCode, setCountryCode] = useState<string>(parsed.countryCode);
  const [phoneNumber, setPhoneNumber] = useState<string>(parsed.phoneNumber);

  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleEdit = () => {
    setIsEditing(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleCancel = () => {
    const parsed = parsePhoneNumber(initialPhone);
    setCountryCode(parsed.countryCode);
    setPhoneNumber(parsed.phoneNumber);
    setIsEditing(false);
  };

  const handleSave = () => {
    const trimmedPhone = phoneNumber.trim();
    const fullPhone = trimmedPhone ? `${countryCode} ${trimmedPhone}` : "";

    if (fullPhone === initialPhone) {
      setIsEditing(false);
      return;
    }

    startTransition(async () => {
      try {
        await updateAction(storeId, storeSlug, phoneType, fullPhone);
        setIsEditing(false);
        toast.success("Phone number updated", {
          description: "Store phone number successfully updated",
        });
      } catch (error) {
        console.error("Failed to update phone number:", error);
        const parsed = parsePhoneNumber(initialPhone);
        setCountryCode(parsed.countryCode);
        setPhoneNumber(parsed.phoneNumber);
        toast.error("Failed to update phone number", {
          description: "Store phone number could not be updated.",
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
        <ButtonGroup>
          <Select value={countryCode} onValueChange={setCountryCode}>
            <SelectTrigger className="min-w-[100px] rounded-r-none bg-white/10 backdrop-blur ring-1 ring-white/15 text-white border-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {COUNTRIES.map(country => (
                <SelectItem key={country.code} value={country.code}>
                  <span className="flex items-center gap-2">
                    <span>{country.flag}</span>
                    <span>{country.code}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            ref={inputRef}
            type="tel"
            value={phoneNumber}
            onChange={e => setPhoneNumber(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isPending}
            placeholder="123456789"
            className="rounded-l-none text-sm bg-white/10 backdrop-blur ring-1 ring-white/15 text-white placeholder:text-white/50 flex-1 border-0"
            maxLength={20}
          />
        </ButtonGroup>
        <Button
          onClick={handleSave}
          disabled={isPending}
          size="icon"
          variant="ghost"
          className="size-7 hover:bg-white/10"
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
          className="size-7 hover:bg-white/10"
        >
          <X className="size-4 text-red-500" />
        </Button>
      </div>
    );
  }

  if (!initialPhone) {
    return (
      <Button
        onClick={handleEdit}
        variant="ghost"
        size="sm"
        className="text-white/70 hover:text-white hover:bg-white/10 -ml-2"
      >
        <Phone className="size-3 mr-1" />
        Add phone number
      </Button>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-white/60 text-xs font-medium uppercase tracking-wider">
        {phoneType === "notifications" ? "WhatsApp Notifications" : "Payments"}
      </p>
      <div className="flex items-center gap-2">
        <Phone className="size-4 text-white/80" />
        <span className="text-white/80 text-sm">{initialPhone}</span>
        <Button
          onClick={handleEdit}
          size="icon"
          variant="ghost"
          className="size-7 hover:bg-white/10"
        >
          <Pencil className="size-3" />
        </Button>
      </div>
    </div>
  );
}
