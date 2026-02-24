/**
 * Color Picker Component
 * Handles color palette + custom color selection
 */

import * as React from "react"
import { addPropertyControls, ControlType } from "framer"

interface ColorPickerProps {
    selectedColors: string[]
    colorPalette: string[]
    error?: string
    onColorToggle: (color: string) => void
}

/**
 * @framerSupportedLayoutWidth auto
 * @framerSupportedLayoutHeight auto
 */
export default function ColorPicker(props: ColorPickerProps) {
    const {
        selectedColors = [],
        colorPalette = [],
        error = "",
        onColorToggle,
    } = props

    const [customColor, setCustomColor] = React.useState("#000000")

    const handleAddCustomColor = () => {
        if (selectedColors.length >= 10) return
        if (!selectedColors.includes(customColor)) {
            onColorToggle(customColor)
        }
    }

    return (
        <div style={{ marginBottom: 20, width: "100%" }}>
            <label
                style={{
                    display: "block",
                    fontSize: 13,
                    fontWeight: 600,
                    marginBottom: 6,
                    color: "#2D2D2D",
                    fontFamily: "DM Sans, system-ui, sans-serif",
                }}
            >
                Colors * (Max 10)
            </label>

            {/* Palette */}
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
                        onClick={() => onColorToggle(color)}
                        style={{
                            width: "100%",
                            aspectRatio: "1",
                            backgroundColor: color,
                            border: selectedColors.includes(color)
                                ? "3px solid #2D2D2D"
                                : "1px solid rgba(0,0,0,0.12)",
                            borderRadius: 8,
                            cursor: "pointer",
                            transition: "all 0.2s",
                            boxShadow: selectedColors.includes(color)
                                ? "0 2px 8px rgba(0,0,0,0.15)"
                                : "none",
                        }}
                    />
                ))}
            </div>

            {/* Custom Color Input */}
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
                        fontFamily: "DM Sans, system-ui, sans-serif",
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
                    disabled={selectedColors.length >= 10}
                    style={{
                        padding: "6px 12px",
                        fontSize: 12,
                        fontWeight: 600,
                        backgroundColor:
                            selectedColors.length >= 10 ? "#ccc" : "#2D2D2D",
                        color: "white",
                        border: "none",
                        borderRadius: 6,
                        cursor:
                            selectedColors.length >= 10
                                ? "not-allowed"
                                : "pointer",
                        fontFamily: "DM Sans, system-ui, sans-serif",
                    }}
                >
                    Add Color
                </button>
            </div>

            {/* Error */}
            {error && (
                <p
                    style={{
                        fontSize: 12,
                        color: "#D32F2F",
                        marginTop: 8,
                        fontWeight: 600,
                        fontFamily: "DM Sans, system-ui, sans-serif",
                    }}
                >
                    {error}
                </p>
            )}

            {/* Selected Colors */}
            {selectedColors.length > 0 && (
                <div style={{ marginTop: 12 }}>
                    <p
                        style={{
                            fontSize: 12,
                            fontWeight: 600,
                            marginBottom: 8,
                            fontFamily: "DM Sans, system-ui, sans-serif",
                        }}
                    >
                        Selected ({selectedColors.length}/10):
                    </p>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {selectedColors.map((color) => (
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
                                <span
                                    style={{
                                        fontSize: 11,
                                        fontFamily:
                                            "DM Sans, system-ui, sans-serif",
                                    }}
                                >
                                    {color}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => onColorToggle(color)}
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
    )
}

addPropertyControls(ColorPicker, {
    selectedColors: {
        type: ControlType.Array,
        title: "Selected Colors",
        control: { type: ControlType.Color },
        defaultValue: [],
    },
    colorPalette: {
        type: ControlType.Array,
        title: "Color Palette",
        control: { type: ControlType.Color },
        defaultValue: ["#FF0000", "#00FF00", "#0000FF"],
    },
    error: {
        type: ControlType.String,
        title: "Error",
        defaultValue: "",
    },
})
