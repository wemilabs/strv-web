"use client";

import { CalendarClock, Clock } from "lucide-react";
import { usePathname } from "next/navigation";
import { parseAsString, useQueryState } from "nuqs";
import { Activity, useState } from "react";

import { AddProductForm } from "@/components/forms/add-product-form";
import {
  EditStoreTimetable,
  type TimetableData,
} from "@/components/forms/edit-store-timetable";
import { SearchForm } from "@/components/forms/search-form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PRODUCT_STATUS_VALUES } from "@/lib/constants";
import { removeUnderscoreAndCapitalizeOnlyTheFirstChar } from "@/lib/utils";
import { ShareDialog } from "../share-dialog";
import { Button } from "../ui/button";

type ProductCatalogueControlsProps = {
  storeId: string;
  storeSlug: string;
  storeName?: string;
  timetable?: TimetableData;
  defaultStatus?: string;
};

export function ProductCatalogueControls({
  storeId,
  storeSlug,
  storeName,
  timetable,
  defaultStatus = "all",
}: ProductCatalogueControlsProps) {
  const [isStoreHoursOpen, setIsStoreHoursOpen] = useState(false);
  const pathname = usePathname();
  const [status, setStatus] = useQueryState(
    "status",
    parseAsString.withDefault(defaultStatus),
  );

  const isStorePage = pathname === `/stores/${storeSlug}`;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold">Catalogue</h2>
          <p className="text-muted-foreground text-sm font-mono tracking-tighter">
            {isStorePage ? "Manage your products here" : "View products here"}
          </p>
        </div>

        <Activity mode={isStorePage ? "visible" : "hidden"}>
          <div className="flex items-center gap-2">
            <AddProductForm organizationId={storeId} storeSlug={storeSlug} />

            <Dialog open={isStoreHoursOpen} onOpenChange={setIsStoreHoursOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-none shadow-none bg-transparent hover:bg-muted"
                  type="button"
                >
                  <CalendarClock className="size-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="flex items-center">
                    <Clock className="size-3.5 mr-2" />
                    Store Opening Hours
                  </DialogTitle>
                  <DialogDescription className="font-mono tracking-tighter">
                    Set your store operating hours for each day of the week
                  </DialogDescription>
                </DialogHeader>
                <EditStoreTimetable
                  storeId={storeId}
                  storeSlug={storeSlug}
                  initialTimetable={timetable}
                  onSuccessAction={() => setIsStoreHoursOpen(false)}
                />
              </DialogContent>
            </Dialog>

            <ShareDialog
              url={`${
                process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
              }/merchants/${storeSlug}`}
              title={`Share ${storeName}`}
              description={`Share your store catalogue with others`}
              variant={{ variant: "ghost", size: "icon" }}
              className="-ml-3"
            />
          </div>
        </Activity>
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 sm:gap-2">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger>
              <SelectValue placeholder="Select a status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {PRODUCT_STATUS_VALUES.map(statusValue => (
                <SelectItem key={statusValue} value={statusValue}>
                  {removeUnderscoreAndCapitalizeOnlyTheFirstChar(statusValue)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <SearchForm
            formProps={{ className: "w-full md:w-[380px]" }}
            inputFieldOnlyClassName="h-9"
            placeholder="eg. burger, pizza, etc."
          />
        </div>
      </div>
    </div>
  );
}
