/**
 * Custom Product Form - Main Component
 * KISS: Simple orchestrator, delegates to specialized components
 * ~120 lines vs 820 lines in monolithic version
 */

import * as React from "react"
import { addPropertyControls, ControlType } from "framer"
import { useFormValidation } from "./hooks/useFormValidation"
import { useFormSubmit } from "./hooks/useFormSubmit"
import FormField from "./components/FormField"
import ColorPicker from "./components/ColorPicker"
import FileUploadField from "./components/FileUploadField"

interface CustomProductFormProps {
    apiBaseUrl: string
    productTypes: string[]
    stitchTypes: string[]
    colorPalette: string[]
    showDesignUploadFor: string[]
    submitButtonText: string
    submitButtonColor: string
}

/**
 * @framerSupportedLayoutWidth auto
 * @framerSupportedLayoutHeight auto
 */
export default function CustomProductForm(props: CustomProductFormProps) {
    const {
        apiBaseUrl = "https://stitch-wyse.vercel.app",
        productTypes = ["Beanies", "Scrunchies"],
        stitchTypes = ["Waffle Stitch", "Ribbed", "Chunky Cuff", "Classic"],
        colorPalette = [
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
        showDesignUploadFor = ["Beanies"],
        submitButtonText = "Submit Custom Order",
        submitButtonColor = "#2D2D2D",
    } = props

    // Hooks manage all state and logic
    const {
        formData,
        errors,
        handleNameChange,
        handleEmailChange,
        handleColorToggle,
        setFieldError,
        updateFormData,
        validateAll,
        resetForm,
    } = useFormValidation(productTypes[0] || "", stitchTypes[0] || "")

    const { isSubmitting, submitMessage, handleSubmit } = useFormSubmit(
        apiBaseUrl
    )

    // Honeypot for bot protection
    const [honeypot, setHoneypot] = React.useState("")

    const showDesignUpload = showDesignUploadFor.includes(formData.productType)

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        // Bot check
        if (honeypot) return

        // Validate
        if (!validateAll()) return

        // Submit
        const success = await handleSubmit(formData)
        if (success) {
            resetForm(productTypes[0] || "", stitchTypes[0] || "")
        }
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
            <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>
                Custom Product Order
            </h2>
            <p style={{ fontSize: 14, opacity: 0.7, marginBottom: 24 }}>
                Configure your perfect handmade crochet item
            </p>

            <form onSubmit={onSubmit}>
                {/* Honeypot */}
                <input
                    type="text"
                    name="website"
                    value={honeypot}
                    onChange={(e) => setHoneypot(e.target.value)}
                    tabIndex={-1}
                    autoComplete="off"
                    style={{ position: "absolute", left: "-9999px" }}
                />

                {/* Name - Reusable component */}
                <FormField
                    label="Name"
                    name="name"
                    value={formData.name}
                    required
                    error={errors.name}
                    onChange={(_, value) => handleNameChange(value)}
                />

                {/* Email - Reusable component */}
                <FormField
                    label="Email"
                    name="email"
                    type="email"
                    value={formData.email}
                    required
                    error={errors.email}
                    maxLength={254}
                    onChange={(_, value) => handleEmailChange(value)}
                />

                {/* Product Type */}
                <div style={{ marginBottom: 20 }}>
                    <label
                        style={{
                            display: "block",
                            fontSize: 13,
                            fontWeight: 600,
                            marginBottom: 6,
                        }}
                    >
                        Product Type
                    </label>
                    <select
                        value={formData.productType}
                        onChange={(e) =>
                            updateFormData({ productType: e.target.value })
                        }
                        style={{
                            width: "100%",
                            padding: "10px 12px",
                            fontSize: 14,
                            border: "1px solid rgba(0,0,0,0.12)",
                            borderRadius: 8,
                        }}
                    >
                        {productTypes.map((type) => (
                            <option key={type} value={type}>
                                {type}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Colors - Dedicated component */}
                <ColorPicker
                    selectedColors={formData.colors}
                    colorPalette={colorPalette}
                    error={errors.colors}
                    onColorToggle={handleColorToggle}
                />

                {/* Orientation */}
                <div style={{ marginBottom: 20 }}>
                    <label
                        style={{
                            display: "block",
                            fontSize: 13,
                            fontWeight: 600,
                            marginBottom: 6,
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
                                    updateFormData({ orientation: option })
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
                        }}
                    >
                        Stitch Type
                    </label>
                    <select
                        value={formData.stitchType}
                        onChange={(e) =>
                            updateFormData({ stitchType: e.target.value })
                        }
                        style={{
                            width: "100%",
                            padding: "10px 12px",
                            fontSize: 14,
                            border: "1px solid rgba(0,0,0,0.12)",
                            borderRadius: 8,
                        }}
                    >
                        {stitchTypes.map((type) => (
                            <option key={type} value={type}>
                                {type}
                            </option>
                        ))}
                    </select>
                </div>

                {/* File Upload - Conditional + dedicated component */}
                {showDesignUpload && (
                    <FileUploadField
                        label="Custom Design (Optional)"
                        file={formData.designImage}
                        error={errors.file}
                        onFileChange={(file) =>
                            updateFormData({ designImage: file })
                        }
                        onError={(error) => setFieldError("file", error)}
                    />
                )}

                {/* Submit Message */}
                {submitMessage && (
                    <div
                        style={{
                            padding: 12,
                            marginBottom: 20,
                            borderRadius: 8,
                            backgroundColor:
                                submitMessage.type === "success"
                                    ? "#C8E6C9"
                                    : "#FFCDD2",
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
