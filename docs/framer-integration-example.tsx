// EXAMPLE: How to update FilteredProductsGrid.tsx to use Stripe Checkout
// This shows the key changes needed in your existing component

import { createStripeCheckout } from "https://framer.com/m/StripeCheckoutHandler-PSTeS5.js"

// 1. Update your Product type to include stripePriceId
export interface Product {
    name: string
    price: string
    stripePriceId: string  // ← ADD THIS FIELD
    category: "beanies" | "scarves" | "bags" | "accessories"
    image?: string
    link?: string
}

// 2. Update your defaultProducts array to include Stripe Price IDs
const defaultProducts: Product[] = [
    {
        name: "Cozy Beanie",
        price: "£25.00",
        stripePriceId: "price_1234567890abcdef",  // ← Add your Stripe Price ID
        category: "beanies",
        image: "https://...",
    },
    {
        name: "Warm Scarf",
        price: "£35.00",
        stripePriceId: "price_0987654321fedcba",  // ← Add your Stripe Price ID
        category: "scarves",
        image: "https://...",
    },
    // ... more products
]

// 3. Update the onCheckout handler in your FilteredProductsGrid component
// Find this section in your component:

export default function FilteredProductsGrid(props) {
    // ... existing code ...

    // REPLACE THIS:
    // onCheckout={() => openCheckout(checkoutLink, cart)}

    // WITH THIS:
    const handleStripeCheckout = async () => {
        try {
            // Show loading state (optional)
            console.log("Starting Stripe checkout...", cart)

            await createStripeCheckout(cart, {
                apiBaseUrl: "http://localhost:3000",  // ← Change to your deployed URL later
                successUrl: window.location.origin + "/success?session_id={CHECKOUT_SESSION_ID}",
                cancelUrl: window.location.origin + "/products",
                customerEmail: undefined,  // Optional: add if you have customer email
            })

            // If we reach here, redirect to Stripe is in progress
            // The page will navigate away
        } catch (error) {
            // Show error to user
            console.error("Checkout error:", error)
            alert(error.message || "Checkout failed. Please try again.")
        }
    }

    return (
        <div>
            {/* ... existing JSX ... */}

            {enableCart && cartOpen ? (
                <CartDrawer
                    label={cartLabel}
                    checkoutLabel={checkoutLabel}
                    checkoutLink={checkoutLink}
                    items={cart}
                    onClose={() => setCartOpen(false)}
                    onInc={(slug) => /* ... */}
                    onDec={(slug) => /* ... */}
                    onRemove={(slug) => /* ... */}
                    onClear={() => setCart([])}
                    onCheckout={handleStripeCheckout}  // ← Use the new handler
                />
            ) : null}
        </div>
    )
}

// 4. Update your property controls to include stripePriceId field
addPropertyControls(FilteredProductsGrid, {
    // ... existing controls ...
    products: {
        type: ControlType.Array,
        title: "Products",
        control: {
            type: ControlType.Object,
            controls: {
                name: { type: ControlType.String, title: "Name" },
                price: { type: ControlType.String, title: "Price" },
                stripePriceId: {  // ← ADD THIS CONTROL
                    type: ControlType.String,
                    title: "Stripe Price ID",
                    placeholder: "price_1234567890abcdef",
                },
                category: {
                    type: ControlType.Enum,
                    title: "Category",
                    options: ["beanies", "scarves", "bags", "accessories"],
                    optionTitles: ["Beanies", "Scarves", "Bags", "Accessories"],
                },
                image: { type: ControlType.Image, title: "Image" },
                link: { type: ControlType.String, title: "Link" },
            },
        },
        defaultValue: defaultProducts as any,
    },
})

// SUMMARY OF CHANGES:
// ✓ Added stripePriceId to Product interface
// ✓ Added stripePriceId to defaultProducts
// ✓ Imported createStripeCheckout function
// ✓ Created handleStripeCheckout function
// ✓ Updated CartDrawer onCheckout prop to use handleStripeCheckout
// ✓ Added stripePriceId to property controls