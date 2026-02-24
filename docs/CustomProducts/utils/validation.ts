/**
 * Form Validation Utilities
 * Pure validation functions - easy to test
 */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validateName(value: string): string {
    if (!value) return "Name is required"
    if (value.length < 2) return "Name must be at least 2 characters"
    if (value.length > 100) return "Name is too long (max 100 characters)"
    return ""
}

export function validateEmail(value: string): string {
    if (!value) return "Email is required"
    if (!EMAIL_REGEX.test(value)) return "Invalid email address"
    if (value.length > 254) return "Email is too long"
    return ""
}

export function validateColors(colors: string[]): string {
    if (colors.length === 0) return "Please select at least one color"
    if (colors.length > 10) return "Maximum 10 colors allowed"
    return ""
}

export function validateFile(file: File | null): string {
    if (!file) return ""

    const allowedTypes = ["image/png", "image/jpeg", "image/jpg"]
    if (!allowedTypes.includes(file.type)) {
        return "Only PNG and JPG files are allowed"
    }

    const maxSize = 2 * 1024 * 1024 // 2MB
    if (file.size > maxSize) {
        return "File size must be less than 2MB"
    }

    return ""
}

export function validateFileMagicBytes(
    file: File,
    callback: (error: string) => void
): void {
    const reader = new FileReader()
    reader.onload = (event) => {
        const arr = new Uint8Array(event.target?.result as ArrayBuffer)
        const header = Array.from(arr.subarray(0, 4))
            .map((byte) => byte.toString(16).padStart(2, "0"))
            .join("")

        const isPNG = header === "89504e47"
        const isJPEG = header.startsWith("ffd8ff")

        if (!isPNG && !isJPEG) {
            callback("Invalid image file (may be corrupted or renamed)")
        } else {
            callback("")
        }
    }
    reader.readAsArrayBuffer(file.slice(0, 4))
}
