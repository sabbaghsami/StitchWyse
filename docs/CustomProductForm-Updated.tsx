// UPDATED CustomProductForm.tsx
// Copy this into your Framer component to update it
//
// New Features:
// 1. File upload security - Only PNG/JPG allowed, max 5MB
// 2. Custom color picker - Users can add any color they want
// 3. Better UX - Shows selected colors with remove buttons

import * as React from "react"
import { addPropertyControls, ControlType } from "framer"

interface CustomProductFormProps {
    apiBaseUrl: string
    productTypes: string[]
    stitchTypes: string[]
    colorPalette: string[]
    showDesignUploadFor: string[]
    submitButtonText: string
    submitButtonColor: string
}

export default function CustomProductForm(props: CustomProductFormProps) {
    const {
        apiBaseUrl = "https://stitch-wyse.vercel.app",
        productTypes = ["Beanies", "Scrunchies"],
        stitchTypes = ["Waffle Stitch", "Ribbed", "Chunky Cuff", "Classic"],
        colorPalette = [
            "#F8E8E8", "#FFB5C5", "#B5E7FF", "#D4C5F9",
            "#FFE5B4", "#C8E6C9", "#FFCDD2", "#B2DFDB",
            "#F0E68C", "#E0BBE4", "#C5E1A5", "#FFE082",
        ],
        showDesignUploadFor = ["Beanies"],
        submitButtonText = "Submit Custom Order",
        submitButtonColor = "#2D2D2D",
    } = props

    const [formData, setFormData] = React.useState({
        name: "",
        email: "",
        productType: productTypes[0] || "",
        colors: [] as string[],
        orientation: "Horizontal",
        stitchType: stitchTypes[0] || "",
        designImage: null as File | null,
    })

    const [customColor, setCustomColor] = React.useState("#000000")
    const [isSubmitting, setIsSubmitting] = React.useState(false)
    const [message, setMessage] = React.useState<{
        type: "success" | "error"
        text: string
    } | null>(null)

    const handleColorToggle = (color: string) => {
        setFormData((prev) => ({
            ...prev,
            colors: prev.colors.includes(color)
                ? prev.colors.filter((c) => c !== color)
                : [...prev.colors, color],
        }))
    }

    const handleAddCustomColor = () => {
        if (!formData.colors.includes(customColor)) {
            setFormData((prev) => ({
                ...prev,
                colors: [...prev.colors, customColor],
            }))
        }
    }

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]

        if (file) {
            // SECURITY: Only allow PNG and JPG files
            const allowedTypes = ["image/png", "image/jpeg", "image/jpg"]
            if (!allowedTypes.includes(file.type)) {
                setMessage({
                    type: "error",
                    text: "Only PNG and JPG files are allowed",
                })
                e.target.value = ""
                return
            }

            // Check file size (5MB limit)
            const maxSize = 5 * 1024 * 1024
            if (file.size > maxSize) {
                setMessage({
                    type: "error",
                    text: "File size must be less than 5MB",
                })
                e.target.value = ""
                return
            }

            setFormData((prev) => ({ ...prev, designImage: file }))
            setMessage(null)
        }
    }

    const getCaptchaToken = (): string | null => {
        if (typeof window === "undefined") return null
        const turnstile = (window as Window & { turnstile?: { getResponse?: () => string | undefined } }).turnstile
        if (!turnstile || typeof turnstile.getResponse !== "function") return null
        const token = turnstile.getResponse()
        return typeof token === "string" && token.trim() ? token.trim() : null
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSubmitting(true)
        setMessage(null)

        if (!formData.name || !formData.email) {
            setMessage({ type: "error", text: "Please fill in all required fields" })
            setIsSubmitting(false)
            return
        }

        if (formData.colors.length === 0) {
            setMessage({ type: "error", text: "Please select at least one color" })
            setIsSubmitting(false)
            return
        }

        try {
            let designImageBase64 = undefined
            if (formData.designImage) {
                const reader = new FileReader()
                designImageBase64 = await new Promise<string>((resolve) => {
                    reader.onload = (e) => resolve(e.target?.result as string)
                    reader.readAsDataURL(formData.designImage!)
                })
            }

            const captchaToken = getCaptchaToken()
            const requestBody: Record<string, unknown> = {
                ...formData,
                designImage: designImageBase64,
            }

            if (captchaToken) {
                requestBody.captchaToken = captchaToken
            }

            const response = await fetch(`${apiBaseUrl}/api/custom-order`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(requestBody),
            })

            const result = await response.json()

            if (response.ok) {
                setMessage({
                    type: "success",
                    text: result.message || "Order submitted successfully!",
                })
                setFormData({
                    name: "",
                    email: "",
                    productType: productTypes[0] || "",
                    colors: [],
                    orientation: "Horizontal",
                    stitchType: stitchTypes[0] || "",
                    designImage: null,
                })
            } else {
                setMessage({
                    type: "error",
                    text: result.error || "Failed to submit order",
                })
            }
        } catch (error) {
            setMessage({ type: "error", text: "Network error. Please try again." })
        } finally {
            setIsSubmitting(false)
        }
    }

    const showDesignUpload = showDesignUploadFor.includes(formData.productType)

    return (
        <div style={{ width: "100%", maxWidth: 600, margin: "0 auto", padding: 24, fontFamily: "DM Sans, system-ui, sans-serif", backgroundColor: "rgb(247, 245, 242)", borderRadius: 12, border: "1px solid rgba(0,0,0,0.08)" }}>
            <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8, color: "#2D2D2D" }}>Custom Product Order</h2>
            <p style={{ fontSize: 14, opacity: 0.7, marginBottom: 24 }}>Configure your perfect handmade crochet item</p>

            <form onSubmit={handleSubmit}>
                {/* Name & Email - unchanged */}
                <div style={{ marginBottom: 20 }}>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: "#2D2D2D" }}>Name *</label>
                    <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required style={{ width: "100%", padding: "10px 12px", fontSize: 14, border: "1px solid rgba(0,0,0,0.12)", borderRadius: 8, backgroundColor: "white" }} />
                </div>

                <div style={{ marginBottom: 20 }}>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: "#2D2D2D" }}>Email *</label>
                    <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required style={{ width: "100%", padding: "10px 12px", fontSize: 14, border: "1px solid rgba(0,0,0,0.12)", borderRadius: 8, backgroundColor: "white" }} />
                </div>

                <div style={{ marginBottom: 20 }}>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: "#2D2D2D" }}>Product Type</label>
                    <select value={formData.productType} onChange={(e) => setFormData({ ...formData, productType: e.target.value })} style={{ width: "100%", padding: "10px 12px", fontSize: 14, border: "1px solid rgba(0,0,0,0.12)", borderRadius: 8, backgroundColor: "white" }}>
                        {productTypes.map((type) => <option key={type} value={type}>{type}</option>)}
                    </select>
                </div>

                {/* NEW: Enhanced color section with custom picker */}
                <div style={{ marginBottom: 20 }}>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: "#2D2D2D" }}>Colors * (Select multiple)</label>

                    {/* Predefined palette */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 8, marginBottom: 12 }}>
                        {colorPalette.map((color) => (
                            <button key={color} type="button" onClick={() => handleColorToggle(color)} style={{ width: "100%", aspectRatio: "1", backgroundColor: color, border: formData.colors.includes(color) ? "3px solid #2D2D2D" : "1px solid rgba(0,0,0,0.12)", borderRadius: 8, cursor: "pointer", transition: "all 0.2s", boxShadow: formData.colors.includes(color) ? "0 2px 8px rgba(0,0,0,0.15)" : "none" }} />
                        ))}
                    </div>

                    {/* NEW: Custom color picker */}
                    <div style={{ display: "flex", gap: 8, alignItems: "center", padding: 12, backgroundColor: "white", borderRadius: 8, border: "1px solid rgba(0,0,0,0.08)" }}>
                        <label style={{ fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" }}>Custom:</label>
                        <input type="color" value={customColor} onChange={(e) => setCustomColor(e.target.value)} style={{ width: 48, height: 32, border: "1px solid rgba(0,0,0,0.12)", borderRadius: 6, cursor: "pointer" }} />
                        <button type="button" onClick={handleAddCustomColor} style={{ padding: "6px 12px", fontSize: 12, fontWeight: 600, backgroundColor: "#2D2D2D", color: "white", border: "none", borderRadius: 6, cursor: "pointer" }}>Add Color</button>
                    </div>

                    {/* NEW: Show selected colors */}
                    {formData.colors.length > 0 && (
                        <div style={{ marginTop: 12 }}>
                            <p style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Selected ({formData.colors.length}):</p>
                            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                                {formData.colors.map((color) => (
                                    <div key={color} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 8px", backgroundColor: "white", borderRadius: 6, border: "1px solid rgba(0,0,0,0.08)" }}>
                                        <div style={{ width: 16, height: 16, backgroundColor: color, borderRadius: 4, border: "1px solid rgba(0,0,0,0.12)" }} />
                                        <span style={{ fontSize: 11 }}>{color}</span>
                                        <button type="button" onClick={() => handleColorToggle(color)} style={{ padding: 0, width: 16, height: 16, fontSize: 10, backgroundColor: "transparent", border: "none", cursor: "pointer", color: "#999" }}>✕</button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Orientation & Stitch Type - unchanged */}
                <div style={{ marginBottom: 20 }}>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: "#2D2D2D" }}>Color Orientation</label>
                    <div style={{ display: "flex", gap: 12 }}>
                        {["Horizontal", "Vertical"].map((option) => (
                            <button key={option} type="button" onClick={() => setFormData({ ...formData, orientation: option })} style={{ flex: 1, padding: "10px 12px", fontSize: 14, fontWeight: 600, backgroundColor: formData.orientation === option ? "#2D2D2D" : "white", color: formData.orientation === option ? "white" : "#2D2D2D", border: "1px solid rgba(0,0,0,0.12)", borderRadius: 8, cursor: "pointer", transition: "all 0.2s" }}>{option}</button>
                        ))}
                    </div>
                </div>

                <div style={{ marginBottom: 20 }}>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: "#2D2D2D" }}>Stitch Type</label>
                    <select value={formData.stitchType} onChange={(e) => setFormData({ ...formData, stitchType: e.target.value })} style={{ width: "100%", padding: "10px 12px", fontSize: 14, border: "1px solid rgba(0,0,0,0.12)", borderRadius: 8, backgroundColor: "white" }}>
                        {stitchTypes.map((type) => <option key={type} value={type}>{type}</option>)}
                    </select>
                </div>

                {/* NEW: Secure file upload */}
                {showDesignUpload && (
                    <div style={{ marginBottom: 20 }}>
                        <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: "#2D2D2D" }}>Custom Design (PNG/JPG only)</label>
                        <input type="file" accept=".png,.jpg,.jpeg,image/png,image/jpeg" onChange={handleImageUpload} style={{ width: "100%", padding: "10px 12px", fontSize: 14, border: "1px solid rgba(0,0,0,0.12)", borderRadius: 8, backgroundColor: "white" }} />
                        {formData.designImage && <p style={{ fontSize: 12, marginTop: 8, color: "#4CAF50", fontWeight: 600 }}>✓ {formData.designImage.name}</p>}
                        <p style={{ fontSize: 11, marginTop: 6, opacity: 0.6 }}>Max 5MB. Only PNG and JPG files allowed.</p>
                    </div>
                )}

                {message && (
                    <div style={{ padding: 12, marginBottom: 20, borderRadius: 8, fontSize: 13, backgroundColor: message.type === "success" ? "#C8E6C9" : "#FFCDD2", color: "#2D2D2D" }}>{message.text}</div>
                )}

                <button type="submit" disabled={isSubmitting} style={{ width: "100%", padding: "14px 20px", fontSize: 16, fontWeight: 700, backgroundColor: submitButtonColor, color: "white", border: "none", borderRadius: 8, cursor: isSubmitting ? "not-allowed" : "pointer", opacity: isSubmitting ? 0.6 : 1, transition: "all 0.2s" }}>
                    {isSubmitting ? "Submitting..." : submitButtonText}
                </button>
            </form>
        </div>
    )
}

addPropertyControls(CustomProductForm, {
    apiBaseUrl: { type: ControlType.String, title: "API Base URL", defaultValue: "https://stitch-wyse.vercel.app" },
    productTypes: { type: ControlType.Array, title: "Product Types", control: { type: ControlType.String }, defaultValue: ["Beanies", "Scrunchies"] },
    stitchTypes: { type: ControlType.Array, title: "Stitch Types", control: { type: ControlType.String }, defaultValue: ["Waffle Stitch", "Ribbed", "Chunky Cuff", "Classic"] },
    colorPalette: { type: ControlType.Array, title: "Color Palette", control: { type: ControlType.Color }, defaultValue: ["#F8E8E8", "#FFB5C5", "#B5E7FF", "#D4C5F9", "#FFE5B4", "#C8E6C9", "#FFCDD2", "#B2DFDB", "#F0E68C", "#E0BBE4", "#C5E1A5", "#FFE082"] },
    showDesignUploadFor: { type: ControlType.Array, title: "Show Design Upload For", control: { type: ControlType.String }, defaultValue: ["Beanies"] },
    submitButtonText: { type: ControlType.String, title: "Submit Button Text", defaultValue: "Submit Custom Order" },
    submitButtonColor: { type: ControlType.Color, title: "Submit Button Color", defaultValue: "#2D2D2D" },
})
