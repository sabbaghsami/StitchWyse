# Claude Instructions for StitchWyse Project

## Project Overview

This is a **Stripe Checkout Backend** for a Framer storefront. The backend is a Next.js API that creates Stripe checkout sessions and handles webhooks. The Framer frontend displays products, manages a cart, and redirects to Stripe for payment.

## Core Principles

### 1. Modular Code Architecture

**CRITICAL:** Always follow a modular approach when writing Framer code components. Avoid creating monolithic files with too much logic.

**Bad Example (Current FilteredProductsGrid):**
- 300+ lines in a single file
- Mixes cart logic, UI rendering, filtering, URL state management
- Tightly coupled components
- Hard to test and maintain

**Good Example (Target Architecture):**
```
Products/
├── FilteredProductsGrid.tsx       ← Main component (orchestrator only)
├── hooks/
│   ├── useCart.ts                 ← Cart state management
│   ├── useProductFilter.ts        ← Product filtering logic
│   └── useCheckout.ts             ← Stripe checkout logic
├── components/
│   ├── ProductCard.tsx            ← Individual product display
│   ├── CartDrawer.tsx             ← Cart UI
│   ├── QuickViewModal.tsx         ← Product quick view
│   └── FilterPills.tsx            ← Category filters
└── utils/
    ├── cartUtils.ts               ← Cart operations (add, remove, update)
    ├── productUtils.ts            ← Product helpers
    └── stripeUtils.ts             ← Stripe integration helpers
```

### 2. File Size Guidelines

- **Main components:** Max 150 lines (orchestration only)
- **Utility functions:** Max 100 lines per file
- **Hooks:** Max 80 lines (single responsibility)
- **Components:** Max 120 lines (presentational only)

**When a file exceeds these limits, break it into smaller modules.**

### 3. Separation of Concerns

Always separate:
1. **State Management** - Custom hooks (`useCart`, `useCheckout`)
2. **Business Logic** - Utility functions (`cartUtils.ts`, `stripeUtils.ts`)
3. **UI Components** - Pure presentational components
4. **Data Fetching** - Separate hooks for API calls
5. **Type Definitions** - Dedicated `types.ts` files

### 4. Code Organization Patterns

#### ✅ DO: Single Responsibility

```typescript
// hooks/useCart.ts - ONLY manages cart state
export function useCart() {
    const [cart, setCart] = useState(() => loadCart())

    const addToCart = useCallback((product, qty) => {
        setCart(prev => addProductToCart(prev, product, qty))
    }, [])

    const removeFromCart = useCallback((slug) => {
        setCart(prev => removeProductFromCart(prev, slug))
    }, [])

    return { cart, addToCart, removeFromCart, count: cartCount(cart) }
}

// hooks/useCheckout.ts - ONLY handles Stripe checkout
export function useCheckout(apiBaseUrl: string) {
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const checkout = useCallback(async (items: CartItem[]) => {
        setIsLoading(true)
        setError(null)
        try {
            await createStripeCheckout(items, { apiBaseUrl, ... })
        } catch (err) {
            setError(err.message)
            throw err
        } finally {
            setIsLoading(false)
        }
    }, [apiBaseUrl])

    return { checkout, isLoading, error }
}

// Main component - ONLY orchestrates
export default function FilteredProductsGrid(props) {
    const { cart, addToCart, removeFromCart } = useCart()
    const { checkout, isLoading } = useCheckout(props.apiBaseUrl)
    const { filtered, setFilter } = useProductFilter(props.products)

    return (
        <div>
            <FilterPills onFilterChange={setFilter} />
            <ProductGrid products={filtered} onAddToCart={addToCart} />
            <CartDrawer cart={cart} onCheckout={checkout} isLoading={isLoading} />
        </div>
    )
}
```

#### ❌ DON'T: Mix Concerns

```typescript
// BAD: Everything in one file
export default function FilteredProductsGrid(props) {
    // 50 lines of state declarations
    // 100 lines of business logic
    // 150 lines of JSX
    // All tightly coupled and hard to test
}
```

### 5. Component Communication

**Use composition and props, not prop drilling:**

```typescript
// Good: Lift state to parent, pass down callbacks
function Parent() {
    const cart = useCart()
    return <Child onAddToCart={cart.addToCart} />
}

// Better: Use context for deeply nested state
const CartContext = createContext()
function Parent() {
    const cart = useCart()
    return (
        <CartContext.Provider value={cart}>
            <Child />
        </CartContext.Provider>
    )
}
```

## Stripe Integration Standards

### Import Pattern

Always import the Stripe checkout function at the top of files that need it:

```typescript
import { createStripeCheckout } from "https://framer.com/m/StripeCheckoutHandler-PSTeS5.js"
```

### Error Handling

Always wrap Stripe calls in try/catch with user-friendly errors:

```typescript
try {
    await createStripeCheckout(cart, options)
} catch (error) {
    console.error("Checkout failed:", error)
    // Show user-friendly message
    alert(error.message || "Checkout failed. Please try again.")
}
```

### Product Data Structure

All products MUST include a `stripePriceId`:

```typescript
interface Product {
    name: string
    price: string
    stripePriceId: string  // REQUIRED for Stripe integration
    category: Category
    image?: string
    link?: string
}
```

## Framer MCP Limitations

### What I CAN and CANNOT Edit

**✅ CAN Edit (via Framer MCP):**
- **CodeComponents** - React components registered in Framer's component system
- These have `codeFileId` values exposed through the MCP
- Examples:
  - `FilteredProductsGrid.tsx` (ID: vnSjVw3)
  - `ProductCard.tsx` (ID: dUkbW3w)
  - `CartDrawer.tsx` (ID: a_kl7Ul)
  - `QuickViewModal.tsx` (ID: CVZhFxz)
  - `StripeCheckoutHandler.tsx` (ID: yHIZ5Ge)

**❌ CANNOT Edit (MCP Timeouts):**
- **Helper/Utility Files** - TypeScript modules that don't export React components
- These exist in Framer but don't have exposed `codeFileId` values
- The MCP times out when trying to create or update them
- Examples:
  - `Types.tsx` - Type definitions
  - `Utils.tsx` - Utility functions
  - `Cart.tsx` - Cart utility functions
  - `Hooks.tsx` - Custom React hooks
  - `UrlState.tsx` - URL state management
  - `Styles.tsx` - Style utilities
  - `Defaults.tsx` - Default product data

**Why This Happens:**
1. CodeComponents are registered in Framer's component system and have IDs
2. Helper files are imported modules but not "components" in Framer's system
3. The Framer MCP only exposes CodeComponents through its API
4. Attempts to create/update helper files result in 10-second timeouts

**Solution:**
User must manually edit helper files in Framer's code editor. Provide complete copy/paste code when changes are needed to these files.

**Important:** Even though I can't edit helper files via MCP, they ARE valid Framer code files and work perfectly when the user edits them manually.

## Framer-Specific Guidelines

### 1. Property Controls

- Always add property controls to components
- Use descriptive titles and helpful defaults
- Group related controls using sections
- Provide placeholder text for string inputs

### 2. Code Component Structure

```typescript
/**
 * Component description
 *
 * @framerSupportedLayoutWidth fixed|auto|any
 * @framerSupportedLayoutHeight fixed|auto|any
 */
export default function MyComponent(props: MyComponentProps) {
    // 1. Props destructuring
    // 2. State declarations
    // 3. Custom hooks
    // 4. Effects
    // 5. Event handlers
    // 6. Render
}

// Property controls after component
addPropertyControls(MyComponent, { ... })
```

### 3. Performance Optimization

- Use `useMemo` for expensive computations
- Use `useCallback` for event handlers passed to children
- Wrap state updates in `startTransition` for non-urgent updates
- Use `useIsStaticRenderer` to avoid running effects in Canvas mode

### 4. External Imports

You can import shared utilities from external URLs:

```typescript
// Good: Share utilities across components
import { slugify } from "https://framer.com/m/Utils-u61Lyu.js"

// Keep component-specific logic in the component file
// Extract reusable logic to shared modules
```

## Backend API Standards

### 1. Type Safety

All API interactions must be typed:

```typescript
interface CheckoutRequest {
    items: Array<{ priceId: string; quantity: number }>
    customerEmail?: string
    metadata?: Record<string, string>
}

interface CheckoutResponse {
    url: string
    id: string
}
```

### 2. Error Responses

Backend always returns structured errors:

```typescript
{
    error: "Human-readable error message"
}
```

### 3. Environment Variables

Never hardcode URLs or keys:

```typescript
// ❌ Bad
const API_URL = "https://my-backend.vercel.app"

// ✅ Good
const API_URL = props.apiBaseUrl || process.env.NEXT_PUBLIC_API_URL
```

## Testing Strategy

### What to Test

1. **Utility functions** - Pure logic (cart operations, formatting)
2. **Custom hooks** - State management behavior
3. **API integrations** - Mock fetch calls
4. **Error handling** - Invalid inputs, network failures

### What NOT to Test

1. **Framer-specific rendering** - Trust Framer
2. **Third-party libraries** - Trust Stripe SDK
3. **Style/layout** - Visual testing only

## Git Workflow

### Commit Messages

Use conventional commits:
```
feat: add Stripe checkout integration
fix: resolve cart quantity bug
refactor: extract cart logic to custom hook
docs: update integration guide
```

### Branch Strategy

- `main` - Production-ready code
- `dev` - Development branch
- `feature/*` - New features
- `fix/*` - Bug fixes

## Documentation Standards

### Code Comments

- **WHY, not WHAT** - Explain reasoning, not obvious code
- Document complex algorithms
- Add JSDoc for exported functions
- Include usage examples for utilities

### File Headers

For utility files:
```typescript
/**
 * Cart Utilities
 *
 * Pure functions for cart operations (add, remove, update quantities).
 * Used by useCart hook and CartDrawer component.
 *
 * @module cartUtils
 */
```

## Security Checklist

- [ ] Never expose Stripe secret keys in Framer code
- [ ] Always use `stripePriceId` from products, never allow price input from client
- [ ] Validate all user inputs before sending to backend
- [ ] Use HTTPS for all API calls in production
- [ ] Enable CORS protection with `ALLOWED_ORIGIN`
- [ ] Verify webhook signatures in backend

## Performance Guidelines

### Bundle Size

- Avoid large dependencies in Framer code
- Lazy load modals and heavy components
- Use dynamic imports for code splitting

### API Calls

- Implement request deduplication
- Add retry logic with exponential backoff
- Use idempotency keys for checkout (already implemented)

### State Management

- Keep cart state in localStorage
- Debounce filter updates
- Avoid unnecessary re-renders with `memo`

## When Refactoring

Before refactoring existing code:

1. **Understand current behavior** - Read and test thoroughly
2. **Identify concerns** - What responsibilities does this file have?
3. **Plan extraction** - Which logic can be extracted to hooks/utils?
4. **Extract incrementally** - One concern at a time
5. **Test after each extraction** - Ensure behavior unchanged
6. **Update imports** - Fix all references

## Questions to Ask

When implementing new features:

1. Can this logic be reused? → Extract to utility
2. Is this stateful? → Create a custom hook
3. Is this presentational? → Make a component
4. Does this belong in this file? → Consider moving
5. Would this be hard to test? → Simplify dependencies

## Additional Context

- **Backend Framework:** Next.js 15 (App Router)
- **Frontend Framework:** Framer (React-based)
- **Payment Provider:** Stripe
- **Deployment:** Vercel (backend), Framer Sites (frontend)
- **Currency:** GBP (configurable)
- **Target Audience:** UK customers (can expand)

---

**Remember:** Prefer many small, focused files over few large ones. Code should be easy to understand, test, and modify. When in doubt, extract to a separate module.