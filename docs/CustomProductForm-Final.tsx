// FINAL VERSION - CustomProductForm.tsx
// Features:
// - Field-specific error messages
// - Real-time validation
// - Security hardened
// - Best UX

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

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

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

    // Field-specific errors
    const [errors, setErrors] = React.useState({
        name: "",
        email: "",
        colors: "",
        file: "",
    })

    const [honeypot, setHoneypot] = React.useState("")
    const [customColor, setCustomColor] = React.useState("#000000")
    const [isSubmitting, setIsSubmitting] = React.useState(false)
    const [submitMessage, setSubmitMessage] = React.useState<{
        type: "success" | "error"
        text: string
    } | null>(null)

    // Validate name
    const validateName = (value: string) => {
        if (!value) return "Name is required"
        if (value.length < 2) return "Name must be at least 2 characters"
        if (value.length > 100) return "Name is too long (max 100 characters)"
        return ""
    }

    // Validate email
    const validateEmail = (value: string) => {
        if (!value) return "Email is required"
        if (!EMAIL_REGEX.test(value)) return "Invalid email address"
        if (value.length > 254) return "Email is too long"
        return ""
    }

    // Validate colors
    const validateColors = (colors: string[]) => {
        if (colors.length === 0) return "Please select at least one color"
        if (colors.length > 10) return "Maximum 10 colors allowed"
        return ""
    }

    const handleNameChange = (value: string) => {
        setFormData({ ...formData, name: value })
        setErrors({ ...errors, name: validateName(value) })
    }

    const handleEmailChange = (value: string) => {
        setFormData({ ...formData, email: value })
        setErrors({ ...errors, email: validateEmail(value) })
    }

    const handleColorToggle = (color: string) => {
        const newColors = formData.colors.includes(color)
            ? formData.colors.filter((c) => c !== color)
            : [...formData.colors, color]

        setFormData({ ...formData, colors: newColors })
        setErrors({ ...errors, colors: validateColors(newColors) })
    }

    const handleAddCustomColor = () => {
        if (formData.colors.length >= 10) {
            setErrors({ ...errors, colors: "Maximum 10 colors allowed" })
            return
        }
        if (!formData.colors.includes(customColor)) {
            const newColors = [...formData.colors, customColor]
            setFormData({ ...formData, colors: newColors })
            setErrors({ ...errors, colors: validateColors(newColors) })
        }
    }

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]

        if (file) {
            // Validate file type
            const allowedTypes = ["image/png", "image/jpeg", "image/jpg"]
            if (!allowedTypes.includes(file.type)) {
                setErrors({ ...errors, file: "Only PNG and JPG files are allowed" })
                e.target.value = ""
                return
            }

            // Check file size (2MB limit)
            const maxSize = 2 * 1024 * 1024
            if (file.size > maxSize) {
                setErrors({
                    ...errors,
                    file: "File size must be less than 2MB",
                })
                e.target.value = ""
                return
            }

            // Validate magic bytes
            const reader = new FileReader()
            reader.onload = (event) => {
                const arr = new Uint8Array(event.target?.result as ArrayBuffer)
                const header = Array.from(arr.subarray(0, 4))
                    .map((byte) => byte.toString(16).padStart(2, "0"))
                    .join("")

                const isPNG = header === "89504e47"
                const isJPEG = header.startsWith("ffd8ff")

                if (!isPNG && !isJPEG) {
                    setErrors({
                        ...errors,
                        file: "Invalid image file (may be corrupted or renamed)",
                    })
                    e.target.value = ""
                    return
                }

                setFormData({ ...formData, designImage: file })
                setErrors({ ...errors, file: "" })
            }
            reader.readAsArrayBuffer(file.slice(0, 4))
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
        setSubmitMessage(null)

        // Honeypot check
        if (honeypot) {
            console.log("Bot detected")
            setIsSubmitting(false)
            return
        }

        // Validate all fields
        const nameError = validateName(formData.name)
        const emailError = validateEmail(formData.email)
        const colorsError = validateColors(formData.colors)

        setErrors({
            name: nameError,
            email: emailError,
            colors: colorsError,
            file: errors.file,
        })

        // If any errors, stop
        if (nameError || emailError || colorsError) {
            setSubmitMessage({
                type: "error",
                text: "Please fix the errors above",
            })
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
                setSubmitMessage({
                    type: "success",
                    text: result.message || "Order submitted successfully!",
                })
                // Reset form
                setFormData({
                    name: "",
                    email: "",
                    productType: productTypes[0] || "",
                    colors: [],
                    orientation: "Horizontal",
                    stitchType: stitchTypes[0] || "",
                    designImage: null,
                })
                setErrors({ name: "", email: "", colors: "", file: "" })
            } else {
                setSubmitMessage({
                    type: "error",
                    text: result.error || "Failed to submit order",
                })
            }
        } catch (error) {
            setSubmitMessage({
                type: "error",
                text: "Network error. Please try again.",
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    const showDesignUpload = showDesignUploadFor.includes(formData.productType)

    // Error message style
    const errorStyle = {
        fontSize: 12,
        color: "#D32F2F",
        marginTop: 4,
        fontWeight: 600,
    }

    return (
        <div
            style={{
                width: "100%",
                maxWidth: 600,
                margin: "0 auto",
                padding: 24,
                fontFamily: "DM Sans, system-ui, sans-serif",
                backgroundColor: "rgb(247, 245, 242)",
                borderRadius: 12,
                border: "1px solid rgba(0,0,0,0.08)",
            }}
        >
            <h2
                style={{
                    fontSize: 28,
                    fontWeight: 700,
                    marginBottom: 8,
                    color: "#2D2D2D",
                }}
            >
                Custom Product Order
            </h2>
            <p style={{ fontSize: 14, opacity: 0.7, marginBottom: 24 }}>
                Configure your perfect handmade crochet item
            </p>

            <form onSubmit={handleSubmit}>
                {/* Honeypot */}
                <input
                    type="text"
                    name="website"
                    value={honeypot}
                    onChange={(e) => setHoneypot(e.target.value)}
                    tabIndex={-1}
                    autoComplete="off"
                    style={{
                        position: "absolute",
                        left: "-9999px",
                        width: "1px",
                        height: "1px",
                    }}
                    aria-hidden="true"
                />

                {/* Name */}
                <div style={{ marginBottom: 20 }}>
                    <label
                        style={{
                            display: "block",
                            fontSize: 13,
                            fontWeight: 600,
                            marginBottom: 6,
                            color: "#2D2D2D",
                        }}
                    >
                        Name *
                    </label>
                    <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => handleNameChange(e.target.value)}
                        maxLength={100}
                        style={{
                            width: "100%",
                            padding: "10px 12px",
                            fontSize: 14,
                            border: errors.name
                                ? "2px solid #D32F2F"
                                : "1px solid rgba(0,0,0,0.12)",
                            borderRadius: 8,
                            backgroundColor: "white",
                        }}
                    />
                    {errors.name && <p style={errorStyle}>{errors.name}</p>}
                </div>

                {/* Email */}
                <div style={{ marginBottom: 20 }}>
                    <label
                        style={{
                            display: "block",
                            fontSize: 13,
                            fontWeight: 600,
                            marginBottom: 6,
                            color: "#2D2D2D",
                        }}
                    >
                        Email *
                    </label>
                    <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleEmailChange(e.target.value)}
                        maxLength={254}
                        style={{
                            width: "100%",
                            padding: "10px 12px",
                            fontSize: 14,
                            border: errors.email
                                ? "2px solid #D32F2F"
                                : "1px solid rgba(0,0,0,0.12)",
                            borderRadius: 8,
                            backgroundColor: "white",
                        }}
                    />
                    {errors.email && <p style={errorStyle}>{errors.email}</p>}
                </div>

                {/* Product Type */}
                <div style={{ marginBottom: 20 }}>
                    <label
                        style={{
                            display: "block",
                            fontSize: 13,
                            fontWeight: 600,
                            marginBottom: 6,
                            color: "#2D2D2D",
                        }}
                    >
                        Product Type
                    </label>
                    <select
                        value={formData.productType}
                        onChange={(e) =>
                            setFormData({
                                ...formData,
                                productType: e.target.value,
                            })
                        }
                        style={{
                            width: "100%",
                            padding: "10px 12px",
                            fontSize: 14,
                            border: "1px solid rgba(0,0,0,0.12)",
                            borderRadius: 8,
                            backgroundColor: "white",
                        }}
                    >
                        {productTypes.map((type) => (
                            <option key={type} value={type}>
                                {type}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Colors */}
                <div style={{ marginBottom: 20 }}>
                    <label
                        style={{
                            display: "block",
                            fontSize: 13,
                            fontWeight: 600,
                            marginBottom: 6,
                            color: "#2D2D2D",
                        }}
                    >
                        Colors * (Max 10)
                    </label>
                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(6, 1fr)",
                            gap: 8,
                            marginBottom: 12,
                        }}
                    >
                        {colorPalette.map((color) => (
                            <button
                                key={color}
                                type="button"
                                onClick={() => handleColorToggle(color)}
                                style={{
                                    width: "100%",
                                    aspectRatio: "1",
                                    backgroundColor: color,
                                    border: formData.colors.includes(color)
                                        ? "3px solid #2D2D2D"
                                        : "1px solid rgba(0,0,0,0.12)",
                                    borderRadius: 8,
                                    cursor: "pointer",
                                    transition: "all 0.2s",
                                    boxShadow: formData.colors.includes(color)
                                        ? "0 2px 8px rgba(0,0,0,0.15)"
                                        : "none",
                                }}
                            />
                        ))}
                    </div>

                    {/* Custom color picker */}
                    <div
                        style={{
                            display: "flex",
                            gap: 8,
                            alignItems: "center",
                            padding: 12,
                            backgroundColor: "white",
                            borderRadius: 8,
                            border: "1px solid rgba(0,0,0,0.08)",
                        }}
                    >
                        <label
                            style={{
                                fontSize: 12,
                                fontWeight: 600,
                                whiteSpace: "nowrap",
                            }}
                        >
                            Custom:
                        </label>
                        <input
                            type="color"
                            value={customColor}
                            onChange={(e) => setCustomColor(e.target.value)}
                            style={{
                                width: 48,
                                height: 32,
                                border: "1px solid rgba(0,0,0,0.12)",
                                borderRadius: 6,
                                cursor: "pointer",
                            }}
                        />
                        <button
                            type="button"
                            onClick={handleAddCustomColor}
                            disabled={formData.colors.length >= 10}
                            style={{
                                padding: "6px 12px",
                                fontSize: 12,
                                fontWeight: 600,
                                backgroundColor:
                                    formData.colors.length >= 10
                                        ? "#ccc"
                                        : "#2D2D2D",
                                color: "white",
                                border: "none",
                                borderRadius: 6,
                                cursor:
                                    formData.colors.length >= 10
                                        ? "not-allowed"
                                        : "pointer",
                            }}
                        >
                            Add Color
                        </button>
                    </div>

                    {errors.colors && <p style={errorStyle}>{errors.colors}</p>}

                    {/* Selected colors */}
                    {formData.colors.length > 0 && (
                        <div style={{ marginTop: 12 }}>
                            <p
                                style={{
                                    fontSize: 12,
                                    fontWeight: 600,
                                    marginBottom: 8,
                                }}
                            >
                                Selected ({formData.colors.length}/10):
                            </p>
                            <div
                                style={{
                                    display: "flex",
                                    gap: 6,
                                    flexWrap: "wrap",
                                }}
                            >
                                {formData.colors.map((color) => (
                                    <div
                                        key={color}
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 6,
                                            padding: "4px 8px",
                                            backgroundColor: "white",
                                            borderRadius: 6,
                                            border: "1px solid rgba(0,0,0,0.08)",
                                        }}
                                    >
                                        <div
                                            style={{
                                                width: 16,
                                                height: 16,
                                                backgroundColor: color,
                                                borderRadius: 4,
                                                border: "1px solid rgba(0,0,0,0.12)",
                                            }}
                                        />
                                        <span style={{ fontSize: 11 }}>
                                            {color}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => handleColorToggle(color)}
                                            style={{
                                                padding: 0,
                                                width: 16,
                                                height: 16,
                                                fontSize: 10,
                                                backgroundColor: "transparent",
                                                border: "none",
                                                cursor: "pointer",
                                                color: "#999",
                                            }}
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Orientation */}
                <div style={{ marginBottom: 20 }}>
                    <label
                        style={{
                            display: "block",
                            fontSize: 13,
                            fontWeight: 600,
                            marginBottom: 6,
                            color: "#2D2D2D",
                        }}
                    >
                        Color Orientation
                    </label>
                    <div style={{ display: "flex", gap: 12 }}>
                        {["Horizontal", "Vertical"].map((option) => (
                            <button
                                key={option}
                                type="button"
                                onClick={() =>
                                    setFormData({
                                        ...formData,
                                        orientation: option,
                                    })
                                }
                                style={{
                                    flex: 1,
                                    padding: "10px 12px",
                                    fontSize: 14,
                                    fontWeight: 600,
                                    backgroundColor:
                                        formData.orientation === option
                                            ? "#2D2D2D"
                                            : "white",
                                    color:
                                        formData.orientation === option
                                            ? "white"
                                            : "#2D2D2D",
                                    border: "1px solid rgba(0,0,0,0.12)",
                                    borderRadius: 8,
                                    cursor: "pointer",
                                    transition: "all 0.2s",
                                }}
                            >
                                {option}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Stitch Type */}
                <div style={{ marginBottom: 20 }}>
                    <label
                        style={{
                            display: "block",
                            fontSize: 13,
                            fontWeight: 600,
                            marginBottom: 6,
                            color: "#2D2D2D",
                        }}
                    >
                        Stitch Type
                    </label>
                    <select
                        value={formData.stitchType}
                        onChange={(e) =>
                            setFormData({
                                ...formData,
                                stitchType: e.target.value,
                            })
                        }
                        style={{
                            width: "100%",
                            padding: "10px 12px",
                            fontSize: 14,
                            border: "1px solid rgba(0,0,0,0.12)",
                            borderRadius: 8,
                            backgroundColor: "white",
                        }}
                    >
                        {stitchTypes.map((type) => (
                            <option key={type} value={type}>
                                {type}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Design Upload */}
                {showDesignUpload && (
                    <div style={{ marginBottom: 20 }}>
                        <label
                            style={{
                                display: "block",
                                fontSize: 13,
                                fontWeight: 600,
                                marginBottom: 6,
                                color: "#2D2D2D",
                            }}
                        >
                            Custom Design (Optional)
                        </label>
                        <input
                            type="file"
                            accept=".png,.jpg,.jpeg,image/png,image/jpeg"
                            onChange={handleImageUpload}
                            style={{
                                width: "100%",
                                padding: "10px 12px",
                                fontSize: 14,
                                border: errors.file
                                    ? "2px solid #D32F2F"
                                    : "1px solid rgba(0,0,0,0.12)",
                                borderRadius: 8,
                                backgroundColor: "white",
                            }}
                        />
                        {errors.file && <p style={errorStyle}>{errors.file}</p>}
                        {formData.designImage && !errors.file && (
                            <p
                                style={{
                                    fontSize: 12,
                                    marginTop: 8,
                                    color: "#4CAF50",
                                    fontWeight: 600,
                                }}
                            >
                                ✓ {formData.designImage.name}
                            </p>
                        )}
                        <p
                            style={{
                                fontSize: 11,
                                marginTop: 6,
                                opacity: 0.6,
                            }}
                        >
                            Max 2MB. PNG or JPG only.
                        </p>
                    </div>
                )}

                {/* Submit Message */}
                {submitMessage && (
                    <div
                        style={{
                            padding: 12,
                            marginBottom: 20,
                            borderRadius: 8,
                            fontSize: 13,
                            fontWeight: 600,
                            backgroundColor:
                                submitMessage.type === "success"
                                    ? "#C8E6C9"
                                    : "#FFCDD2",
                            color: "#2D2D2D",
                        }}
                    >
                        {submitMessage.text}
                    </div>
                )}

                {/* Submit Button */}
                <button
                    type="submit"
                    disabled={isSubmitting}
                    style={{
                        width: "100%",
                        padding: "14px 20px",
                        fontSize: 16,
                        fontWeight: 700,
                        backgroundColor: submitButtonColor,
                        color: "white",
                        border: "none",
                        borderRadius: 8,
                        cursor: isSubmitting ? "not-allowed" : "pointer",
                        opacity: isSubmitting ? 0.6 : 1,
                        transition: "all 0.2s",
                    }}
                >
                    {isSubmitting ? "Submitting..." : submitButtonText}
                </button>
            </form>
        </div>
    )
}

addPropertyControls(CustomProductForm, {
    apiBaseUrl: {
        type: ControlType.String,
        title: "API Base URL",
        defaultValue: "https://stitch-wyse.vercel.app",
    },
    productTypes: {
        type: ControlType.Array,
        title: "Product Types",
        control: { type: ControlType.String },
        defaultValue: ["Beanies", "Scrunchies"],
    },
    stitchTypes: {
        type: ControlType.Array,
        title: "Stitch Types",
        control: { type: ControlType.String },
        defaultValue: ["Waffle Stitch", "Ribbed", "Chunky Cuff", "Classic"],
    },
    colorPalette: {
        type: ControlType.Array,
        title: "Color Palette",
        control: { type: ControlType.Color },
        defaultValue: [
            "#FFFFFF",
            "#000000",
            "#FF0000",
            "#00FF00",
            "#0000FF",
            "#FFFF00",
            "#FFA500",
            "#800080",
            "#FFC0CB",
            "#808080",
            "#A52A2A",
            "#00FFFF",

        ],
    },
    showDesignUploadFor: {
        type: ControlType.Array,
        title: "Show Design Upload For",
        control: { type: ControlType.String },
        defaultValue: ["Beanies"],
    },
    submitButtonText: {
        type: ControlType.String,
        title: "Submit Button Text",
        defaultValue: "Submit Custom Order",
    },
    submitButtonColor: {
        type: ControlType.Color,
        title: "Submit Button Color",
        defaultValue: "#2D2D2D",
    },
})
