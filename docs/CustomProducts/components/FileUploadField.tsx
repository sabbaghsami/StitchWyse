/**
 * File Upload Field Component
 * Handles secure file uploads with validation
 */

import * as React from "react"
import { addPropertyControls, ControlType } from "framer"
import {
    validateFile,
    validateFileMagicBytes,
} from "../utils/validation"

interface FileUploadFieldProps {
    label: string
    file: File | null
    error: string
    onFileChange: (file: File | null) => void
    onError: (error: string) => void
}

/**
 * @framerSupportedLayoutWidth auto
 * @framerSupportedLayoutHeight auto
 */
export default function FileUploadField(props: FileUploadFieldProps) {
    const { label, file, error, onFileChange, onError } = props

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0]

        if (selectedFile) {
            // Basic validation
            const basicError = validateFile(selectedFile)
            if (basicError) {
                onError(basicError)
                e.target.value = ""
                return
            }

            // Magic bytes validation
            validateFileMagicBytes(selectedFile, (magicBytesError) => {
                if (magicBytesError) {
                    onError(magicBytesError)
                    e.target.value = ""
                } else {
                    onFileChange(selectedFile)
                    onError("")
                }
            })
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
                {label}
            </label>
            <input
                type="file"
                accept=".png,.jpg,.jpeg,image/png,image/jpeg"
                onChange={handleFileUpload}
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
            {file && !error && (
                <p
                    style={{
                        fontSize: 12,
                        marginTop: 8,
                        color: "#4CAF50",
                        fontWeight: 600,
                        fontFamily: "DM Sans, system-ui, sans-serif",
                    }}
                >
                    ✓ {file.name}
                </p>
            )}
            <p
                style={{
                    fontSize: 11,
                    marginTop: 6,
                    opacity: 0.6,
                    fontFamily: "DM Sans, system-ui, sans-serif",
                }}
            >
                Max 2MB. PNG or JPG only.
            </p>
        </div>
    )
}

addPropertyControls(FileUploadField, {
    label: {
        type: ControlType.String,
        title: "Label",
        defaultValue: "Upload File",
    },
    error: {
        type: ControlType.String,
        title: "Error",
        defaultValue: "",
    },
})
