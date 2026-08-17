"use client";

import {
  AlertTriangle,
  ArrowUpDown,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Ellipsis,
} from "lucide-react";
import Image from "next/image";
import { useQueryState } from "nuqs";
import { useState } from "react";
import { InventoryHistoryContent } from "@/components/inventory/inventory-history-content";
import { StockAdjustment } from "@/components/inventory/stock-adjustment";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { FALLBACK_PRODUCT_IMG_URL } from "@/lib/constants";
import { cn, formatPriceInRWF } from "@/lib/utils";

type Product = {
  id: string;
  name: string;
  slug: string;
  imageUrls: string[] | null;
  status: "draft" | "in_stock" | "out_of_stock" | "archived";
  currentStock: number;
  lowStockThreshold: number;
  price: string;
};

type SortField = "name" | "currentStock" | "lowStockThreshold" | "price";
type SortDirection = "asc" | "desc";

type ColumnVisibility = {
  product: boolean;
  status: boolean;
  alerts: boolean;
  currentStock: boolean;
  threshold: boolean;
  price: boolean;
};

interface InventoryTableProps {
  products: Product[];
  organizationId: string;
}

export function InventoryTable({
  products,
  organizationId,
}: InventoryTableProps) {
  const [searchQuery, setSearchQuery] = useQueryState("search", {
    defaultValue: "",
  });
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibility>({
    product: true,
    status: true,
    alerts: true,
    currentStock: true,
    threshold: true,
    price: true,
  });

  const itemsPerPage = 10;

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const toggleColumn = (column: keyof ColumnVisibility) => {
    setColumnVisibility(prev => ({
      ...prev,
      [column]: !prev[column],
    }));
  };

  // Filter products by search query
  let filtered = products.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // Sort filtered products
  if (sortField) {
    filtered = [...filtered].sort((a, b) => {
      let aValue: string | number = a[sortField];
      let bValue: string | number = b[sortField];

      if (sortField === "price") {
        aValue = Number(a.price);
        bValue = Number(b.price);
      }

      if (typeof aValue === "string") {
        return sortDirection === "asc"
          ? aValue.localeCompare(bValue as string)
          : (bValue as string).localeCompare(aValue);
      }

      return sortDirection === "asc"
        ? (aValue as number) - (bValue as number)
        : (bValue as number) - (aValue as number);
    });
  }

  const filteredAndSortedProducts = filtered;

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedProducts = filteredAndSortedProducts.slice(
    startIndex,
    startIndex + itemsPerPage,
  );

  const handlePreviousPage = () => {
    setCurrentPage(prev => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(totalPages, prev + 1));
  };

  return (
    <div className="w-full">
      {/* Filter and Column Visibility Controls */}
      <div className="flex items-center gap-4 py-4 px-4">
        <Input
          placeholder="Filter products..."
          value={searchQuery}
          onChange={e => {
            void setSearchQuery(e.target.value);
            setCurrentPage(1);
          }}
          className="max-w-sm"
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="ml-auto">
              Columns <ChevronDown className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuCheckboxItem
              checked={columnVisibility.product}
              onCheckedChange={() => toggleColumn("product")}
            >
              Product
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={columnVisibility.status}
              onCheckedChange={() => toggleColumn("status")}
            >
              Status
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={columnVisibility.alerts}
              onCheckedChange={() => toggleColumn("alerts")}
            >
              Alerts
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={columnVisibility.currentStock}
              onCheckedChange={() => toggleColumn("currentStock")}
            >
              Current Stock
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={columnVisibility.threshold}
              onCheckedChange={() => toggleColumn("threshold")}
            >
              Threshold
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={columnVisibility.price}
              onCheckedChange={() => toggleColumn("price")}
            >
              Price
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Table */}
      <div className="rounded-md border overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b text-sm">
              {columnVisibility.product && (
                <th className="text-left p-4 font-medium">
                  <Button
                    variant="ghost"
                    onClick={() => handleSort("name")}
                    className="h-8"
                  >
                    Product
                    <ArrowUpDown className="size-4" />
                  </Button>
                </th>
              )}
              {columnVisibility.status && (
                <th className="text-left p-4 font-medium">Status</th>
              )}
              {columnVisibility.alerts && (
                <th className="text-left p-4 font-medium">Alerts</th>
              )}
              {columnVisibility.currentStock && (
                <th className="text-right p-4 font-medium">
                  <Button
                    variant="ghost"
                    onClick={() => handleSort("currentStock")}
                    className="h-8"
                  >
                    Current Stock
                    <ArrowUpDown className="size-4" />
                  </Button>
                </th>
              )}
              {columnVisibility.threshold && (
                <th className="text-right p-4 font-medium">
                  <Button
                    variant="ghost"
                    onClick={() => handleSort("lowStockThreshold")}
                    className="h-8"
                  >
                    Threshold
                    <ArrowUpDown className="size-4" />
                  </Button>
                </th>
              )}
              {columnVisibility.price && (
                <th className="text-right p-4 font-medium">
                  <Button
                    variant="ghost"
                    onClick={() => handleSort("price")}
                    className="h-8"
                  >
                    Unit Price
                    <ArrowUpDown className="size-4" />
                  </Button>
                </th>
              )}
              <th className="text-right p-4 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedProducts.length === 0 ? (
              <tr>
                <td
                  colSpan={
                    Object.values(columnVisibility).filter(Boolean).length + 1
                  }
                  className="p-8 text-center text-muted-foreground font-mono tracking-tighter"
                >
                  No product found.
                </td>
              </tr>
            ) : (
              paginatedProducts.map(product => {
                const isLowStock =
                  product.currentStock <= product.lowStockThreshold;
                const isOutOfStock = product.currentStock === 0;

                return (
                  <tr
                    key={product.id}
                    className="border-b last:border-0 hover:bg-muted/50"
                  >
                    {columnVisibility.product && (
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="relative size-12 rounded-md overflow-hidden shrink-0">
                            <Image
                              src={
                                product.imageUrls?.[0] ??
                                FALLBACK_PRODUCT_IMG_URL
                              }
                              alt={product.name}
                              fill
                              sizes="48px"
                              unoptimized
                              className="object-cover"
                            />
                          </div>
                          <div>
                            <p className="font-medium line-clamp-1">
                              {product.name}
                            </p>
                            <p className="text-sm text-muted-foreground font-mono tracking-tighter line-clamp-1">
                              {product.slug}
                            </p>
                          </div>
                        </div>
                      </td>
                    )}
                    {columnVisibility.status && (
                      <td className="p-4">
                        <Badge
                          variant="outline"
                          className={cn("gap-1.5", {
                            "bg-blue-50 text-blue-700 border-blue-200":
                              product.status === "draft",
                            "bg-green-50 text-green-700 border-green-200":
                              product.status === "in_stock",
                            "bg-red-50 text-red-700 border-red-200":
                              product.status === "out_of_stock",
                            "bg-gray-50 text-gray-700 border-gray-200":
                              product.status === "archived",
                          })}
                        >
                          <span
                            className={cn("size-1.5 rounded-full", {
                              "bg-blue-500": product.status === "draft",
                              "bg-green-600": product.status === "in_stock",
                              "bg-red-600": product.status === "out_of_stock",
                              "bg-gray-600": product.status === "archived",
                            })}
                          />
                          {product.status.replace("_", " ")}
                        </Badge>
                      </td>
                    )}
                    {columnVisibility.alerts && (
                      <td className="p-4">
                        {isOutOfStock ? (
                          <Badge
                            variant="outline"
                            className="gap-1 bg-red-50 text-red-700 border-red-200"
                          >
                            <AlertTriangle className="size-3" />
                            Out of Stock
                          </Badge>
                        ) : isLowStock ? (
                          <Badge
                            variant="outline"
                            className="gap-1 bg-orange-50 text-orange-700 border-orange-200"
                          >
                            <AlertTriangle className="size-3" />
                            Low Stock
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">
                            —
                          </span>
                        )}
                      </td>
                    )}
                    {columnVisibility.currentStock && (
                      <td className="p-4 text-right">
                        <span
                          className={cn("font-mono font-medium", {
                            "text-red-600": isOutOfStock,
                            "text-orange-600": isLowStock && !isOutOfStock,
                          })}
                        >
                          {product.currentStock}
                        </span>
                      </td>
                    )}
                    {columnVisibility.threshold && (
                      <td className="p-4 text-right">
                        <span className="text-muted-foreground font-mono">
                          {product.lowStockThreshold}
                        </span>
                      </td>
                    )}
                    {columnVisibility.price && (
                      <td className="p-4 text-right font-mono">
                        {formatPriceInRWF(Number(product.price))}
                      </td>
                    )}
                    <td className="p-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="ml-auto">
                            <Ellipsis className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="flex flex-col space-y-1"
                        >
                          <StockAdjustment
                            product={product}
                            organizationId={organizationId}
                          />
                          <InventoryHistoryContent
                            productId={product.id}
                            productName={product.name}
                            organizationId={organizationId}
                          />
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-end gap-2 py-4 px-4">
        <div className="flex-1 text-sm text-muted-foreground font-mono tracking-tighter">
          {paginatedProducts.length} of {filteredAndSortedProducts.length}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePreviousPage}
            disabled={currentPage === 1}
            title="Previous page"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <div className="text-sm">
            Page {currentPage} of {totalPages || 1}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleNextPage}
            disabled={currentPage >= totalPages}
            title="Next page"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
