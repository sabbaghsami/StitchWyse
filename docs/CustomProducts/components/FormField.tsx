/**
 * Reusable Form Field Component
 * DRY - Single place for all input fields
 */

import * as React from "react"
import { addPropertyControls, ControlType } from "framer"

interface FormFieldProps {
    label: string
    name: string
    value: string
    type?: "text" | "email"
    placeholder?: string
    required?: boolean
    error?: string
    maxLength?: number
    onChange: (name: string, value: string) => void
}

/**
 * @framerSupportedLayoutWidth auto
 * @framerSupportedLayoutHeight auto
 */
export default function FormField(props: FormFieldProps) {
    const {
        label,
        name,
        value,
        type = "text",
        placeholder = "",
        required = false,
        error = "",
        maxLength = 100,
        onChange,
    } = props

    return (
        <div style={{ marginBottom: 20, width: "100%" }}>
            <label
                htmlFor={name}
                style={{
                    display: "block",
                    fontSize: 13,
                    fontWeight: 600,
                    marginBottom: 6,
                    color: "#2D2D2D",
                    fontFamily: "DM Sans, system-ui, sans-serif",
                }}
            >
                {label} {required && "*"}
            </label>
            <input
                id={name}
                name={name}
                type={type}
                value={value}
                placeholder={placeholder}
                maxLength={maxLength}
                onChange={(e) => onChange(name, e.target.value)}
                style={{
                    width: "100%",
                    padding: "10px 12px",
                    fontSize: 14,
                    border: error
                        ? "2px solid #D32F2F"
                        : "1px solid rgba(0,0,0,0.12)",
                    borderRadius: 8,
                    backgroundColor: "white",
                    fontFamily: "DM Sans, system-ui, sans-serif",
                    outline: "none",
                }}
            />
            {error && (
                <p
                    style={{
                        fontSize: 12,
                        color: "#D32F2F",
                        marginTop: 4,
                        fontWeight: 600,
                        fontFamily: "DM Sans, system-ui, sans-serif",
                    }}
                >
                    {error}
                </p>
            )}
        </div>
    )
}

addPropertyControls(FormField, {
    label: { type: ControlType.String, title: "Label", defaultValue: "Field" },
    name: { type: ControlType.String, title: "Name", defaultValue: "field" },
    value: { type: ControlType.String, title: "Value", defaultValue: "" },
    type: {
        type: ControlType.Enum,
        title: "Type",
        options: ["text", "email"],
        defaultValue: "text",
    },
    required: {
        type: ControlType.Boolean,
        title: "Required",
        defaultValue: false,
    },
    error: { type: ControlType.String, title: "Error", defaultValue: "" },
})
