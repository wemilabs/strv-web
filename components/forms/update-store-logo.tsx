"use client";

import { useRef } from "react";
import { toast } from "sonner";
import { UploadButton } from "@/lib/uploadthing";

type Props = {
  action: (formData: FormData) => Promise<void>;
  className?: string;
  storeSlug: string;
};

export function UpdateStoreLogoForm({ action, className, storeSlug }: Props) {
  const hiddenInputRef = useRef<HTMLInputElement | null>(null);

  return (
    <form action={action} className={className}>
      <input
        ref={hiddenInputRef}
        type="hidden"
        name="logoUrl"
        id="logoUrlHidden"
      />

      <UploadButton
        endpoint="storeLogo"
        className="ut-button:bg-primary ut-button:ut-readying:bg-primary/50"
        headers={{ "x-store-slug": storeSlug }}
        onClientUploadComplete={res => {
          const url = res?.[0]?.ufsUrl || "";
          if (hiddenInputRef.current && url) {
            hiddenInputRef.current.value = url;
            hiddenInputRef.current.form?.requestSubmit();
          }
        }}
        onUploadError={err => {
          console.error(err);
          toast.error(err?.message || "Upload failed. Please try again.");
        }}
      />
    </form>
  );
}
