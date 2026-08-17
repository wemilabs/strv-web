"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { TagInput } from "@/components/forms/tag-input";
import { UnitFormatInput } from "@/components/forms/unit-format-input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Tag, UnitFormat } from "@/db/schema";
import { UploadButton } from "@/lib/uploadthing";
import {
  getCategoryOptions,
  getCategorySpecificationLabel,
  getCategorySpecificationPlaceholder,
  slugify,
} from "@/lib/utils";
import { createProduct } from "@/server/products";
import { checkProductLimit } from "@/server/subscription";
import { getAllTags } from "@/server/tags";
import { getAllUnitFormats } from "@/server/unit-formats";
import { Card, CardContent } from "../ui/card";
import { Spinner } from "../ui/spinner";

const schema = z
  .object({
    name: z.string().min(2, "Name is too short").max(100),
    slug: z.string().min(2, "Slug required").max(120),
    price: z
      .string()
      .min(1, "Price is required")
      .refine(
        v => !Number.isNaN(Number(v)) && Number(v) >= 0,
        "Enter a valid price",
      ),
    imageUrls: z.array(z.url("Provide valid URLs")).optional(),
    videoUrl: z.url("Provide a valid URL").optional().or(z.literal("")),
    description: z.string().max(500).optional().or(z.literal("")),
    category: z.string().min(1, "Category is required"),
    specifications: z.string().optional().or(z.literal("")),
    isLandlord: z.boolean(),
    visitFees: z.string(),
    tags: z.array(z.custom<Tag>()),
    unitFormat: z.custom<UnitFormat>().nullable(),
    inventoryEnabled: z.boolean(),
    lowStockThreshold: z.number().min(0),
  })
  .refine(
    data => {
      // If real estate and not landlord, visit fees are required
      if (data.category === "real-estate" && !data.isLandlord) {
        return data.visitFees && Number(data.visitFees) > 0;
      }
      return true;
    },
    {
      message: "Visit fees are required for intermediaries",
      path: ["visitFees"],
    },
  );

export function AddProductForm({
  organizationId,
  storeSlug,
}: {
  organizationId: string;
  storeSlug: string;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [availableUnitFormats, setAvailableUnitFormats] = useState<
    UnitFormat[]
  >([]);

  const handleUpgradeClick = () => {
    setDialogOpen(false);
    router.push("/usage/pricing");
  };

  const { data: productLimit, isLoading } = useQuery({
    queryKey: ["productLimit", organizationId],
    queryFn: () => checkProductLimit(organizationId),
    enabled: dialogOpen,
    gcTime: 0,
  });

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      slug: "",
      price: "",
      imageUrls: [],
      videoUrl: "",
      description: "",
      category: "",
      specifications: "",
      isLandlord: false,
      visitFees: "0",
      tags: [],
      unitFormat: null,
      inventoryEnabled: false,
      lowStockThreshold: 5,
    },
  });

  useEffect(() => {
    if (dialogOpen) {
      getAllTags().then(result => {
        if (result.ok) setAvailableTags(result.tags);
      });
      getAllUnitFormats().then(result => {
        if (result.ok) setAvailableUnitFormats(result.unitFormats);
      });
    }
  }, [dialogOpen]);

  const watchedName = form.watch("name");
  useEffect(() => {
    if (watchedName) {
      const s = slugify(watchedName);
      form.setValue("slug", s, { shouldValidate: true });
    } else {
      form.setValue("slug", "", { shouldValidate: false });
    }
  }, [watchedName, form]);

  function onSubmit(values: z.infer<typeof schema>) {
    startTransition(async () => {
      try {
        await createProduct({
          organizationId,
          name: values.name,
          slug: values.slug,
          price: values.price,
          description: values.description || "",
          imageUrls: values.imageUrls || [],
          videoUrl: values.videoUrl || "",
          category: values.category,
          specifications: values.specifications ?? "",
          isLandlord: values.isLandlord,
          visitFees: values.visitFees,
          tagNames: values.tags.map(t => t.name),
          unitFormatId: values.unitFormat?.id || null,
          unitFormatName: values.unitFormat?.name,
          inventoryEnabled: values.inventoryEnabled,
          lowStockThreshold: values.lowStockThreshold,
          revalidateTargetPath: `/stores/${storeSlug}`,
        });
        form.reset();
        toast.success("Success", {
          description:
            "Product created in draft status. Set stock in inventory to make it available.",
        });
        setDialogOpen(false);
      } catch (error: unknown) {
        const e = error as Error;
        console.error(e);
        toast.error("Failure", {
          description:
            e.message || "Failed to add product. Please try again later.",
        });
      }
    });
  }

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button size="sm" type="button" onClick={() => setDialogOpen(true)}>
          <Plus className="size-4 sm:hidden" />
          <span className="hidden sm:block">Add product</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Add a new product</DialogTitle>
          <DialogDescription>
            {isLoading
              ? "Checking your product limits..."
              : productLimit?.canCreate
                ? "Provide details below. Slug is auto-generated."
                : "Product limit reached"}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[calc(100vh-15rem)]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center gap-2 py-8">
              <Spinner />
              <p className="text-sm text-muted-foreground font-mono tracking-tighter">
                Checking your product limits...
              </p>
            </div>
          ) : !productLimit?.canCreate ? (
            <Card className="border border-dashed bg-sidebar">
              <CardContent className="flex flex-col gap-4 py-6">
                <div className="text-center space-y-2">
                  <h3 className="font-medium">Product Limit Reached</h3>
                  <p className="text-xs text-muted-foreground font-mono tracking-tighter">
                    You've reached your limit of {productLimit?.maxProducts}{" "}
                    products on the {productLimit?.planName} plan.
                  </p>
                  <p className="text-xs text-muted-foreground font-mono tracking-tighter">
                    Current products: {productLimit?.currentProducts}/
                    {productLimit?.maxProducts}
                  </p>
                </div>
                <Button
                  onClick={handleUpgradeClick}
                  className="w-full"
                  variant="outline"
                >
                  <span>Upgrade Plan</span>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Grilled chicken"
                          className="placeholder:text-sm"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="slug"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Slug</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="grilled-chicken"
                          readOnly
                          className="bg-muted cursor-not-allowed text-muted-foreground placeholder:text-sm"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:justify-items-end">
                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Price (RF)</FormLabel>
                        <FormControl>
                          <Input
                            inputMode="decimal"
                            placeholder="2500"
                            className="placeholder:text-sm"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select a category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="z-64">
                            {getCategoryOptions().map(category => (
                              <SelectItem
                                key={category.value}
                                value={category.value}
                              >
                                {category.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="specifications"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {getCategorySpecificationLabel(form.watch("category"))}
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder={getCategorySpecificationPlaceholder(
                            form.watch("category"),
                          )}
                          className="placeholder:text-sm"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {form.watch("category") === "real-estate" && (
                  <>
                    <FormField
                      control={form.control}
                      name="isLandlord"
                      render={({ field }) => (
                        <FormItem className="flex items-start space-x-3 space-y-0 rounded-md border p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Are you the landlord?</FormLabel>
                            <p className="text-sm text-muted-foreground">
                              Check if you are the property owner
                            </p>
                          </div>
                        </FormItem>
                      )}
                    />

                    {!form.watch("isLandlord") && (
                      <FormField
                        control={form.control}
                        name="visitFees"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Visit Fees (RF)</FormLabel>
                            <FormControl>
                              <Input
                                inputMode="decimal"
                                placeholder="5000"
                                className="placeholder:text-sm"
                                {...field}
                              />
                            </FormControl>
                            <p className="text-sm text-muted-foreground">
                              Fees customers pay for property visits
                            </p>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </>
                )}

                <FormField
                  control={form.control}
                  name="imageUrls"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Product Images (Up to 3)</FormLabel>
                      <FormControl>
                        <div className="flex flex-col gap-3">
                          <div className="grid grid-cols-3 gap-2">
                            {field.value?.map((url, index) => (
                              <div
                                key={`image-${url.slice(-10)}-${url.slice(-8)}`}
                                className="relative group"
                              >
                                <div className="relative aspect-square overflow-hidden rounded-md border">
                                  <Image
                                    src={url}
                                    alt={`Product image ${index + 1}`}
                                    fill
                                    sizes="(max-width: 640px) 30vw, 120px"
                                    unoptimized
                                    className="object-cover"
                                  />
                                  <Button
                                    type="button"
                                    variant="destructive"
                                    size="sm"
                                    className="absolute top-1 right-1 size-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={() => {
                                      const newUrls =
                                        field.value?.filter(
                                          (_, i) => i !== index,
                                        ) || [];
                                      field.onChange(newUrls);
                                    }}
                                  >
                                    ×
                                  </Button>
                                </div>
                              </div>
                            ))}
                            {(field.value?.length || 0) < 3 && (
                              <div className="aspect-square border-2 border-dashed border-muted-foreground/25 rounded-md flex items-center justify-center">
                                <UploadButton
                                  endpoint="productMedia"
                                  className="ut-button:bg-primary ut-button:ut-readying:bg-primary/50"
                                  headers={{ "x-store-slug": storeSlug }}
                                  content={{
                                    allowedContent: () => "Images only",
                                  }}
                                  onClientUploadComplete={res => {
                                    const imageUrls =
                                      res
                                        ?.filter(file =>
                                          file.type?.startsWith("image/"),
                                        )
                                        .map(file => file.ufsUrl) || [];
                                    const currentUrls = field.value || [];
                                    const newUrls = [
                                      ...currentUrls,
                                      ...imageUrls,
                                    ].slice(0, 3);
                                    field.onChange(newUrls);
                                  }}
                                  onUploadError={err => {
                                    console.error(err);
                                    toast.error(
                                      err?.message ||
                                        "Upload failed. Please try again.",
                                    );
                                  }}
                                />
                              </div>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {field.value?.length || 0}/3 images uploaded
                          </p>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="videoUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Product Video (Optional)</FormLabel>
                      <FormControl>
                        <div className="flex flex-col gap-3">
                          {field.value ? (
                            <div className="flex items-center gap-3">
                              <div className="relative overflow-hidden rounded-md border">
                                <video
                                  src={field.value}
                                  className="object-cover"
                                  muted
                                  playsInline
                                  autoPlay
                                  loop
                                />
                              </div>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  form.setValue("videoUrl", "", {
                                    shouldValidate: true,
                                  })
                                }
                              >
                                Remove
                              </Button>
                            </div>
                          ) : null}

                          {!field.value && (
                            <UploadButton
                              endpoint="productMedia"
                              className="ut-button:bg-primary ut-button:ut-readying:bg-primary/50"
                              headers={{ "x-store-slug": storeSlug }}
                              content={{ allowedContent: () => "Video only" }}
                              onClientUploadComplete={res => {
                                const videoUrl =
                                  res?.find(file =>
                                    file.type?.startsWith("video/"),
                                  )?.ufsUrl || "";
                                if (videoUrl)
                                  form.setValue("videoUrl", videoUrl, {
                                    shouldValidate: true,
                                  });
                              }}
                              onUploadError={err => {
                                console.error(err);
                                toast.error(
                                  err?.message ||
                                    "Video upload failed. Please try again.",
                                );
                              }}
                            />
                          )}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Short description"
                          className="placeholder:text-sm"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="unitFormat"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unit Format</FormLabel>
                      <FormControl>
                        <UnitFormatInput
                          availableUnitFormats={availableUnitFormats}
                          selectedUnitFormat={field.value || null}
                          onUnitFormatChangeAction={field.onChange}
                          disabled={isPending}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="inventoryEnabled"
                  render={({ field }) => (
                    <FormItem className="flex items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Enable inventory tracking</FormLabel>
                        <p className="text-sm text-muted-foreground">
                          Track stock levels and get low stock alerts
                        </p>
                      </div>
                    </FormItem>
                  )}
                />

                {form.watch("inventoryEnabled") && (
                  <FormField
                    control={form.control}
                    name="lowStockThreshold"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Low Stock Alert Threshold</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            placeholder="5"
                            {...field}
                            onChange={e =>
                              field.onChange(Number(e.target.value))
                            }
                          />
                        </FormControl>
                        <p className="text-sm text-muted-foreground">
                          Get notified when stock reaches this level
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="tags"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tags</FormLabel>
                      <FormControl>
                        <TagInput
                          availableTags={availableTags}
                          selectedTags={field.value || []}
                          onTagsChangeAction={field.onChange}
                          disabled={isPending}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button type="submit" disabled={isPending}>
                    {isPending ? (
                      <span className="inline-flex items-center gap-2">
                        <Spinner />
                        Saving...
                      </span>
                    ) : (
                      "Save product"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
