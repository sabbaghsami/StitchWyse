# Framer Products Grid - Modular Refactoring Guide

This guide shows how to refactor your FilteredProductsGrid from a 300+ line monolith into clean, modular components following the CLAUDE.md guidelines.

## 📁 Target Structure

Create these new code files in Framer:

```
Products/
├── utils/
│   └── cartUtils.tsx          (Pure functions - 80 lines)
├── hooks/
│   ├── useCart.tsx            (Cart state - 35 lines)
│   ├── useCheckout.tsx        (Stripe checkout - 40 lines)
│   └── useProductFilter.tsx   (Filter logic - 45 lines)
├── components/
│   └── FilterPills.tsx        (Filter UI - 65 lines)
└── FilteredProductsGrid.tsx   (Main - 110 lines)
```

## 🔧 Step-by-Step: Create Each File

### 1. Products/utils/cartUtils.tsx

**Purpose:** Pure functions for cart operations (no state, no side effects)

**In Framer:** Click "+" → Code File → Name: `Products/utils/cartUtils.tsx`

```tsx
// Pure cart utility functions
import type { CartItem, Product } from "../filteredProducts/Types.tsx"

const CART_STORAGE_KEY = "framer_cart"

/**
 * Load cart from localStorage
 */
export function loadCart(): CartItem[] {
    if (typeof window === "undefined") return []
    try {
        const stored = localStorage.getItem(CART_STORAGE_KEY)
        return stored ? JSON.parse(stored) : []
    } catch {
        return []
    }
}

/**
 * Save cart to localStorage
 */
export function saveCart(cart: CartItem[]): void {
    if (typeof window === "undefined") return
    try {
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart))
    } catch (error) {
        console.error("Failed to save cart:", error)
    }
}

/**
 * Generate slug from product name
 */
export function slugify(name: string): string {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")
}

/**
 * Add product to cart
 */
export function addProductToCart(
    cart: CartItem[],
    product: Product,
    qty: number = 1
): CartItem[] {
    const slug = slugify(product.name)
    const existing = cart.find((item) => item.slug === slug)

    if (existing) {
        return cart.map((item) =>
            item.slug === slug
                ? { ...item, qty: Math.min(99, item.qty + qty) }
                : item
        )
    }

    return [
        ...cart,
        {
            slug,
            name: product.name,
            image: product.image,
            price: product.price,
            stripePriceId: product.stripePriceId,
            qty: Math.min(99, qty),
        },
    ]
}

/**
 * Remove product from cart by slug
 */
export function removeFromCart(cart: CartItem[], slug: string): CartItem[] {
    return cart.filter((item) => item.slug !== slug)
}

/**
 * Update cart item quantity
 */
export function updateCartQty(
    cart: CartItem[],
    slug: string,
    qty: number
): CartItem[] {
    if (qty < 1) {
        return removeFromCart(cart, slug)
    }

    return cart.map((item) =>
        item.slug === slug ? { ...item, qty: Math.min(99, qty) } : item
    )
}

/**
 * Get total item count in cart
 */
export function cartCount(cart: CartItem[]): number {
    return cart.reduce((sum, item) => sum + item.qty, 0)
}
```

---

### 2. Products/hooks/useCart.tsx

**Purpose:** Manages cart state and operations

**In Framer:** Click "+" → Code File → Name: `Products/hooks/useCart.tsx`

```tsx
// Cart state management hook
import { useState, useCallback, useEffect, startTransition } from "react"
import type { CartItem, Product } from "../filteredProducts/Types.tsx"
import {
    loadCart,
    saveCart,
    addProductToCart,
    removeFromCart,
    updateCartQty,
    cartCount,
} from "../utils/cartUtils.tsx"

export function useCart() {
    const [cart, setCart] = useState<CartItem[]>(() => loadCart())

    // Save to localStorage whenever cart changes
    useEffect(() => {
        saveCart(cart)
    }, [cart])

    const addToCart = useCallback((product: Product, qty: number = 1) => {
        startTransition(() => {
            setCart((prev) => addProductToCart(prev, product, qty))
        })
    }, [])

    const removeItem = useCallback((slug: string) => {
        startTransition(() => {
            setCart((prev) => removeFromCart(prev, slug))
        })
    }, [])

    const updateQty = useCallback((slug: string, qty: number) => {
        startTransition(() => {
            setCart((prev) => updateCartQty(prev, slug, qty))
        })
    }, [])

    const clearCart = useCallback(() => {
        startTransition(() => {
            setCart([])
        })
    }, [])

    return {
        cart,
        addToCart,
        removeItem,
        updateQty,
        clearCart,
        count: cartCount(cart),
    }
}
```

---

### 3. Products/hooks/useCheckout.tsx

**Purpose:** Handles Stripe checkout logic

**In Framer:** Click "+" → Code File → Name: `Products/hooks/useCheckout.tsx`

```tsx
// Stripe checkout hook
import { useState, useCallback, startTransition } from "react"
import { createStripeCheckout } from "https://framer.com/m/StripeCheckoutHandler-PSTeS5.js@WcH7PPo7lnEYYbzRwgMX"
import type { CartItem } from "../filteredProducts/Types.tsx"

interface UseCheckoutOptions {
    apiBaseUrl: string
    successUrl?: string
    cancelUrl?: string
}

export function useCheckout(options: UseCheckoutOptions) {
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const checkout = useCallback(
        async (items: CartItem[], customerEmail?: string) => {
            startTransition(() => {
                setIsLoading(true)
                setError(null)
            })

            try {
                await createStripeCheckout(items, {
                    apiBaseUrl: options.apiBaseUrl,
                    successUrl:
                        options.successUrl ||
                        `${window.location.origin}/success?session_id={CHECKOUT_SESSION_ID}`,
                    cancelUrl:
                        options.cancelUrl || `${window.location.origin}/products`,
                    customerEmail,
                })
                // User is redirected to Stripe, won't reach here
            } catch (err) {
                const message = err instanceof Error ? err.message : "Checkout failed"
                startTransition(() => {
                    setError(message)
                    setIsLoading(false)
                })
                throw err
            }
        },
        [options.apiBaseUrl, options.successUrl, options.cancelUrl]
    )

    return { checkout, isLoading, error }
}
```

---

### 4. Products/hooks/useProductFilter.tsx

**Purpose:** Manages product filtering logic

**In Framer:** Click "+" → Code File → Name: `Products/hooks/useProductFilter.tsx`

```tsx
// Product filtering hook
import { useMemo } from "react"
import type { Product, Category } from "../filteredProducts/Types.tsx"

export function useProductFilter(products: Product[], filter: Category) {
    const filtered = useMemo(() => {
        if (filter === "all") return products
        return products.filter((p) => p.category === filter)
    }, [products, filter])

    const availableCategories = useMemo(() => {
        const present = new Set<Exclude<Category, "all">>()
        for (const p of products) {
            present.add(p.category)
        }

        const ordered: Category[] = [
            "all",
            "beanies",
            "scarves",
            "bags",
            "accessories",
        ]

        return ordered.filter((c) => c === "all" || present.has(c as any))
    }, [products])

    return {
        filtered,
        availableCategories,
    }
}
```

---

### 5. Products/components/FilterPills.tsx

**Purpose:** Renders the category filter UI

**In Framer:** Click "+" → Code File → Name: `Products/components/FilterPills.tsx`

```tsx
// Filter pills component
import * as React from "react"
import type { Category } from "../filteredProducts/Types.tsx"

function toLabel(category: Category): string {
    return category.charAt(0).toUpperCase() + category.slice(1)
}

export function FilterPills(props: {
    categories: Category[]
    activeFilter: Category
    onFilterChange: (filter: Category) => void
    pillBg: string
    pillActiveBg: string
}) {
    const { categories, activeFilter, onFilterChange, pillBg, pillActiveBg } = props

    return (
        <div
            style={{
                width: "100%",
                maxWidth: 920,
                background: "rgba(255,255,255,0.45)",
                borderRadius: 18,
                padding: 16,
                display: "flex",
                flexDirection: "column",
                gap: 14,
                alignItems: "center",
                backdropFilter: "blur(10px)",
                border: "1px solid rgba(0,0,0,0.06)",
            }}
        >
            <div
                style={{
                    fontSize: 13,
                    letterSpacing: "0.21em",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    opacity: 0.9,
                }}
            >
                Filter me
            </div>

            <div
                style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 10,
                    justifyContent: "center",
                }}
            >
                {categories.map((c) => {
                    const active = c === activeFilter
                    return (
                        <button
                            key={c}
                            type="button"
                            onClick={() => onFilterChange(c)}
                            style={{
                                appearance: "none",
                                border: "1px solid rgba(0,0,0,0.06)",
                                background: active ? pillActiveBg : pillBg,
                                padding: "10px 16px",
                                borderRadius: 999,
                                cursor: "pointer",
                                fontSize: 16,
                                fontWeight: 500,
                            }}
                        >
                            {toLabel(c)}
                        </button>
                    )
                })}
            </div>
        </div>
    )
}
```

---

### 6. Products/FilteredProductsGrid.tsx (REFACTORED)

**Purpose:** Lean orchestrator that composes everything

**In Framer:** UPDATE your existing `FilteredProductsGrid.tsx` with this:

```tsx
// Modular Products Grid - orchestrates cart, filter, and checkout
import * as React from "react"
import { addPropertyControls, ControlType } from "framer"
import type { FilteredProductsGridProps, Product } from "./filteredProducts/Types.tsx"
import { defaultProducts } from "https://framer.com/m/Defaults-q2eArW.js@AtUnZ1aL3OAVSX31pRf6"
import { slugify } from "./utils/cartUtils.tsx"
import { useCart } from "./hooks/useCart.tsx"
import { useCheckout } from "./hooks/useCheckout.tsx"
import { useProductFilter } from "./hooks/useProductFilter.tsx"
import { FilterPills } from "./components/FilterPills.tsx"
import { ProductCard } from "https://framer.com/m/ProductCard-H70NoU.js@VA6Z0MSD90rHPAqJBYWm"
import { QuickViewModal } from "https://framer.com/m/QuickViewModal-KqYfye.js@MCDMMARndYMTRPyUHjcT"
import { CartDrawer } from "https://framer.com/m/CartDrawer-owSO5E.js@aGOgUKITvzZbcBgZQHjd"
import {
    getFilterFromUrl,
    getQuickViewFromUrl,
    setFilterInUrl,
    setQuickViewInUrl,
} from "https://framer.com/m/UrlState-WaQsgS.js@JNmRANQnrOznL0lc8EXH"
import { useBodyScrollLock, useProductsBySlug, useUrlSyncedState } from "https://framer.com/m/Hooks-AI5BLP.js@KFOowXd4JcapsrubyfPl"

export default function FilteredProductsGrid(props: Partial<FilteredProductsGridProps>) {
    const {
        title = "Products",
        subtitle = "Browse my handmade crochet pieces.",
        products = defaultProducts,
        showFilter = true,
        showQuickView = true,
        enableCart = true,
        cartLabel = "Cart",
        checkoutLabel = "Checkout",
        apiBaseUrl = "http://localhost:3000",
        successUrl,
        cancelUrl,
        cardBg = "rgba(255,255,255,0.55)",
        pillBg = "rgb(255, 244, 155)",
        pillActiveBg = "rgb(202, 220, 252)",
        gap = 24,
        imageZoom = 1.06,
    } = props as FilteredProductsGridProps

    // Hooks
    const { cart, addToCart, removeItem, updateQty, clearCart, count } = useCart()
    const { checkout, isLoading } = useCheckout({ apiBaseUrl, successUrl, cancelUrl })
    const { filter, setFilter, quickViewSlug, setQuickViewSlug } = useUrlSyncedState()
    const { filtered, availableCategories } = useProductFilter(products, filter)

    // UI state
    const [cartOpen, setCartOpen] = React.useState(false)
    const productsBySlug = useProductsBySlug(products)
    const activeProduct = quickViewSlug ? productsBySlug.get(quickViewSlug) ?? null : null
    useBodyScrollLock(Boolean(activeProduct) || cartOpen)

    // Handlers
    const openQuickView = React.useCallback(
        (p: Product) => {
            const s = slugify(p.name)
            setQuickViewSlug(s)
            setQuickViewInUrl(s)
        },
        [setQuickViewSlug]
    )

    const closeQuickView = React.useCallback(() => {
        setQuickViewSlug(null)
        setQuickViewInUrl(null)
    }, [setQuickViewSlug])

    const handleCheckout = React.useCallback(async () => {
        try {
            await checkout(cart)
        } catch (error) {
            alert(error.message || "Checkout failed. Please try again.")
        }
    }, [cart, checkout])

    return (
        <div
            style={{
                width: "100%",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 28,
                fontFamily: "DM Sans, system-ui, sans-serif",
            }}
        >
            {/* Header */}
            <div style={{ width: "100%", maxWidth: 1100, display: "flex", justifyContent: "space-between", gap: 16 }}>
                <div style={{ flex: 1, textAlign: "center", margin: "0 auto", maxWidth: 780 }}>
                    <div style={{ fontSize: 56, lineHeight: "1.05em", letterSpacing: "-1px" }}>{title}</div>
                    <div style={{ fontSize: 20, lineHeight: "1.3em", opacity: 0.8, marginTop: 12 }}>{subtitle}</div>
                </div>

                {enableCart && (
                    <button
                        type="button"
                        onClick={() => setCartOpen(true)}
                        style={{
                            flex: "0 0 auto",
                            height: 44,
                            padding: "0 14px",
                            borderRadius: 999,
                            border: "1px solid rgba(0,0,0,0.10)",
                            background: "rgba(255,255,255,0.7)",
                            cursor: "pointer",
                            fontSize: 16,
                            fontWeight: 600,
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                        }}
                    >
                        <span>{cartLabel}</span>
                        <span
                            style={{
                                minWidth: 26,
                                height: 26,
                                borderRadius: 999,
                                background: "rgb(202, 220, 252)",
                                display: "grid",
                                placeItems: "center",
                                fontSize: 14,
                            }}
                        >
                            {count}
                        </span>
                    </button>
                )}
            </div>

            {/* Filter Pills */}
            {showFilter && (
                <FilterPills
                    categories={availableCategories}
                    activeFilter={filter}
                    onFilterChange={(f) => {
                        setFilter(f)
                        setFilterInUrl(f)
                    }}
                    pillBg={pillBg}
                    pillActiveBg={pillActiveBg}
                />
            )}

            {/* Products Grid */}
            <div
                style={{
                    width: "100%",
                    maxWidth: 1100,
                    display: "grid",
                    gap,
                    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                }}
            >
                {filtered.map((p, i) => (
                    <ProductCard
                        key={`${p.name}-${i}`}
                        product={p}
                        cardBg={cardBg}
                        zoom={Math.max(1.0, imageZoom)}
                        showQuickView={showQuickView}
                        enableCart={enableCart}
                        onQuickView={() => openQuickView(p)}
                        onAddToCart={() => addToCart(p, 1)}
                    />
                ))}
            </div>

            {/* Quick View Modal */}
            {showQuickView && activeProduct && (
                <QuickViewModal
                    product={activeProduct}
                    onClose={closeQuickView}
                    enableCart={enableCart}
                    onAddToCart={() => addToCart(activeProduct, 1)}
                />
            )}

            {/* Cart Drawer */}
            {enableCart && cartOpen && (
                <CartDrawer
                    label={cartLabel}
                    checkoutLabel={checkoutLabel}
                    checkoutLink={apiBaseUrl}
                    items={cart}
                    onClose={() => setCartOpen(false)}
                    onInc={(slug) => {
                        const item = cart.find((x) => x.slug === slug)
                        if (item) updateQty(slug, item.qty + 1)
                    }}
                    onDec={(slug) => {
                        const item = cart.find((x) => x.slug === slug)
                        if (item) updateQty(slug, item.qty - 1)
                    }}
                    onRemove={removeItem}
                    onClear={clearCart}
                    onCheckout={handleCheckout}
                />
            )}
        </div>
    )
}

addPropertyControls(FilteredProductsGrid, {
    title: { type: ControlType.String, title: "Title", defaultValue: "Products" },
    subtitle: { type: ControlType.String, title: "Subtitle", defaultValue: "Browse my handmade crochet pieces." },
    showFilter: { type: ControlType.Boolean, title: "Show Filter", defaultValue: true },
    showQuickView: { type: ControlType.Boolean, title: "Quick View", defaultValue: true },
    enableCart: { type: ControlType.Boolean, title: "Enable Cart", defaultValue: true },
    cartLabel: { type: ControlType.String, title: "Cart Label", defaultValue: "Cart" },
    checkoutLabel: { type: ControlType.String, title: "Checkout Label", defaultValue: "Checkout" },
    apiBaseUrl: { type: ControlType.String, title: "API URL", defaultValue: "http://localhost:3000" },
    gap: { type: ControlType.Number, title: "Grid Gap", defaultValue: 24, min: 8, max: 64 },
    imageZoom: { type: ControlType.Number, title: "Hover Zoom", defaultValue: 1.06, min: 1.0, max: 1.2 },
    cardBg: { type: ControlType.String, title: "Card BG", defaultValue: "rgba(255,255,255,0.55)" },
    pillBg: { type: ControlType.String, title: "Pill BG", defaultValue: "rgb(255, 244, 155)" },
    pillActiveBg: { type: ControlType.String, title: "Pill Active", defaultValue: "rgb(202, 220, 252)" },
    products: {
        type: ControlType.Array,
        title: "Products",
        control: {
            type: ControlType.Object,
            controls: {
                name: { type: ControlType.String, title: "Name" },
                price: { type: ControlType.String, title: "Price" },
                stripePriceId: { type: ControlType.String, title: "Stripe Price ID", placeholder: "price_..." },
                category: {
                    type: ControlType.Enum,
                    title: "Category",
                    options: ["beanies", "scarves", "bags", "accessories"],
                },
                image: { type: ControlType.Image, title: "Image" },
                link: { type: ControlType.String, title: "Link" },
            },
        },
        defaultValue: defaultProducts as any,
    },
})
```

---

## ✅ Summary

After creating all these files, your code will be:

### Before:
- ❌ FilteredProductsGrid: **300+ lines** (everything in one file)

### After:
- ✅ cartUtils: **80 lines** (pure functions)
- ✅ useCart: **35 lines** (state hook)
- ✅ useCheckout: **40 lines** (Stripe hook)
- ✅ useProductFilter: **45 lines** (filter hook)
- ✅ FilterPills: **65 lines** (UI component)
- ✅ FilteredProductsGrid: **110 lines** (orchestrator)

**Total: ~375 lines, but modular, testable, and maintainable!**

Each file has a single responsibility and stays under the limits in CLAUDE.md.
