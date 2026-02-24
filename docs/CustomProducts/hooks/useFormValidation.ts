/**
 * Form Validation Hook
 * Manages form state and validation
 */

import { useState, useCallback } from "react"
import {
    validateName,
    validateEmail,
    validateColors,
} from "../utils/validation"

export interface FormData {
    name: string
    email: string
    productType: string
    colors: string[]
    orientation: string
    stitchType: string
    designImage: File | null
}

export interface FormErrors {
    name: string
    email: string
    colors: string
    file: string
}

export function useFormValidation(
    initialProductType: string,
    initialStitchType: string
) {
    const [formData, setFormData] = useState<FormData>({
        name: "",
        email: "",
        productType: initialProductType,
        colors: [],
        orientation: "Horizontal",
        stitchType: initialStitchType,
        designImage: null,
    })

    const [errors, setErrors] = useState<FormErrors>({
        name: "",
        email: "",
        colors: "",
        file: "",
    })

    const handleNameChange = useCallback((value: string) => {
        setFormData((prev) => ({ ...prev, name: value }))
        setErrors((prev) => ({ ...prev, name: validateName(value) }))
    }, [])

    const handleEmailChange = useCallback((value: string) => {
        setFormData((prev) => ({ ...prev, email: value }))
        setErrors((prev) => ({ ...prev, email: validateEmail(value) }))
    }, [])

    const handleColorToggle = useCallback((color: string) => {
        setFormData((prev) => {
            const newColors = prev.colors.includes(color)
                ? prev.colors.filter((c) => c !== color)
                : [...prev.colors, color]
            return { ...prev, colors: newColors }
        })
        setErrors((prev) => ({
            ...prev,
            colors: validateColors(
                formData.colors.includes(color)
                    ? formData.colors.filter((c) => c !== color)
                    : [...formData.colors, color]
            ),
        }))
    }, [formData.colors])

    const setFieldError = useCallback((field: keyof FormErrors, error: string) => {
        setErrors((prev) => ({ ...prev, [field]: error }))
    }, [])

    const updateFormData = useCallback(
        (updates: Partial<FormData>) => {
            setFormData((prev) => ({ ...prev, ...updates }))
        },
        []
    )

    const validateAll = useCallback((): boolean => {
        const nameError = validateName(formData.name)
        const emailError = validateEmail(formData.email)
        const colorsError = validateColors(formData.colors)

        setErrors({
            name: nameError,
            email: emailError,
            colors: colorsError,
            file: errors.file,
        })

        return !nameError && !emailError && !colorsError
    }, [formData, errors.file])

    const resetForm = useCallback(
        (productType: string, stitchType: string) => {
            setFormData({
                name: "",
                email: "",
                productType,
                colors: [],
                orientation: "Horizontal",
                stitchType,
                designImage: null,
            })
            setErrors({ name: "", email: "", colors: "", file: "" })
        },
        []
    )

    return {
        formData,
        errors,
        handleNameChange,
        handleEmailChange,
        handleColorToggle,
        setFieldError,
        updateFormData,
        validateAll,
        resetForm,
    }
}
