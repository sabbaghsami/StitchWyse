/**
 * Form Submit Hook
 * Handles form submission and API calls
 */

import { useState, useCallback } from "react"
import type { FormData } from "./useFormValidation"

export interface SubmitMessage {
    type: "success" | "error"
    text: string
}

function getTurnstileTokenFromWindow(): string | null {
    if (typeof window === "undefined") {
        return null
    }

    const turnstile = (window as Window & {
        turnstile?: { getResponse?: () => string | undefined }
    }).turnstile

    if (!turnstile || typeof turnstile.getResponse !== "function") {
        return null
    }

    const token = turnstile.getResponse()
    return typeof token === "string" && token.trim() ? token.trim() : null
}

export function useFormSubmit(
    apiBaseUrl: string,
    getCaptchaToken?: () => Promise<string | null> | string | null
) {
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [submitMessage, setSubmitMessage] = useState<SubmitMessage | null>(
        null
    )

    const handleSubmit = useCallback(
        async (formData: FormData): Promise<boolean> => {
            setIsSubmitting(true)
            setSubmitMessage(null)

            try {
                // Convert image to base64 if present
                let designImageBase64: string | undefined
                if (formData.designImage) {
                    const reader = new FileReader()
                    designImageBase64 = await new Promise<string>((resolve) => {
                        reader.onload = (e) =>
                            resolve(e.target?.result as string)
                        reader.readAsDataURL(formData.designImage!)
                    })
                }

                const resolvedCaptchaToken = getCaptchaToken
                    ? await Promise.resolve(getCaptchaToken())
                    : getTurnstileTokenFromWindow()

                const captchaToken =
                    typeof resolvedCaptchaToken === "string" &&
                    resolvedCaptchaToken.trim()
                        ? resolvedCaptchaToken.trim()
                        : null

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
                    return true
                } else {
                    setSubmitMessage({
                        type: "error",
                        text: result.error || "Failed to submit order",
                    })
                    return false
                }
            } catch (error) {
                setSubmitMessage({
                    type: "error",
                    text: "Network error. Please try again.",
                })
                return false
            } finally {
                setIsSubmitting(false)
            }
        },
        [apiBaseUrl, getCaptchaToken]
    )

    const clearMessage = useCallback(() => {
        setSubmitMessage(null)
    }, [])

    return {
        isSubmitting,
        submitMessage,
        handleSubmit,
        clearMessage,
    }
}
