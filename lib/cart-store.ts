import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export interface CartItem {
  productId: string;
  productName: string;
  productSlug: string;
  productImages: string[] | null;
  price: string;
  category: string;
  isLandlord: boolean;
  visitFees: string;
  quantity: number;
  currentStock?: number;
  inventoryEnabled?: boolean;
  notes?: string;
}

type CartState = {
  items: CartItem[];
};

type CartActions = {
  addItem: (item: Omit<CartItem, "quantity"> & { quantity?: number }) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  updateNotes: (productId: string, notes: string) => void;
  clearCart: () => void;
  getTotalPrice: () => number;
  getItemCount: () => number;
  refreshStock: (
    stocks: Array<{
      id: string;
      currentStock: number;
      inventoryEnabled: boolean;
    }>,
  ) => void;
};

type CartStore = CartState & CartActions;

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: item => {
        const existingItem = get().items.find(
          i => i.productId === item.productId,
        );

        // Check stock availability if inventory is enabled
        if (item.inventoryEnabled && item.currentStock !== undefined) {
          const currentCartQty = existingItem?.quantity || 0;
          const requestedQty = (item.quantity || 1) + currentCartQty;

          if (requestedQty > item.currentStock) {
            throw new Error(
              `Only ${item.currentStock} units available in stock`,
            );
          }
        }

        if (existingItem) {
          set({
            items: get().items.map(i =>
              i.productId === item.productId
                ? {
                    ...i,
                    quantity: i.quantity + (item.quantity || 1),
                    currentStock: item.currentStock ?? i.currentStock,
                    inventoryEnabled:
                      item.inventoryEnabled ?? i.inventoryEnabled,
                  }
                : i,
            ),
          });
        } else {
          set({
            items: [...get().items, { ...item, quantity: item.quantity || 1 }],
          });
        }
      },

      removeItem: productId => {
        set({
          items: get().items.filter(i => i.productId !== productId),
        });
      },

      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(productId);
          return;
        }

        // Check stock availability if inventory is enabled
        const item = get().items.find(i => i.productId === productId);
        if (item?.inventoryEnabled && item.currentStock !== undefined) {
          if (quantity > item.currentStock) {
            throw new Error(
              `Only ${item.currentStock} units available in stock`,
            );
          }
        }

        set({
          items: get().items.map(i =>
            i.productId === productId ? { ...i, quantity } : i,
          ),
        });
      },

      updateNotes: (productId, notes) => {
        set({
          items: get().items.map(i =>
            i.productId === productId ? { ...i, notes } : i,
          ),
        });
      },

      clearCart: () => {
        set({ items: [] });
      },

      getTotalPrice: () => {
        return get().items.reduce((total, item) => {
          let itemPrice = 0;

          // Real estate pricing logic
          if (item.category === "real-estate") {
            if (!item.isLandlord) {
              // Intermediary case: Only charge visit fees
              itemPrice = Number(item.visitFees) * item.quantity;
            } else {
              // Landlord case: No platform payment
              itemPrice = 0;
            }
          } else {
            // Normal products: Full price
            itemPrice = Number(item.price) * item.quantity;
          }

          return total + itemPrice;
        }, 0);
      },

      getItemCount: () => {
        return get().items.reduce((count, item) => count + item.quantity, 0);
      },

      refreshStock: stocks => {
        set({
          items: get().items.map(item => {
            const stockInfo = stocks.find(s => s.id === item.productId);
            if (stockInfo) {
              // If quantity exceeds new stock, adjust it down
              const newQuantity = stockInfo.inventoryEnabled
                ? Math.min(item.quantity, stockInfo.currentStock)
                : item.quantity;

              return {
                ...item,
                currentStock: stockInfo.currentStock,
                inventoryEnabled: stockInfo.inventoryEnabled,
                quantity: newQuantity,
              };
            }
            return item;
          }),
        });
      },
    }),
    {
      name: "cart-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: state => ({ items: state.items }),
    },
  ),
);
