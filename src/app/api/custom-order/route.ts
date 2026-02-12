import { NextRequest, NextResponse } from "next/server"
import { corsHeaders } from "@/lib/cors"
import { Resend } from "resend"
import { rateLimit } from "@/lib/rate-limit"

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MAX_REQUEST_BYTES = 3 * 1024 * 1024
const MAX_DESIGN_IMAGE_BYTES = 2 * 1024 * 1024
const MAX_CAPTCHA_TOKEN_LENGTH = 2048
const MAX_NAME_LENGTH = 100
const MAX_EMAIL_LENGTH = 254
const MAX_PRODUCT_FIELD_LENGTH = 100
const MAX_COLOR_LENGTH = 64
const MAX_COLORS = 10
const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"

interface CustomOrderData {
    name: string
    email: string
    productType: string
    colors: string[]
    orientation: string
    stitchType: string
    designImage?: string | null
}

type ValidationResult =
    | {
          payload: CustomOrderData
          captchaToken: string | null
      }
    | {
          error: string
      }

interface ParsedContentLength {
    bytes: number | null
    invalid: boolean
}

type BodyReadResult = { ok: true; body: string } | { ok: false; reason: "too_large" | "invalid" }

interface TurnstileVerificationResponse {
    success?: boolean
    "error-codes"?: unknown
}

function sanitizeInput(input: string, maxLength: number): string {
    return input
        .replace(/[<>]/g, "")
        .replace(/javascript:/gi, "")
        .replace(/on\w+=/gi, "")
        .trim()
        .slice(0, maxLength)
}

function parseContentLength(headerValue: string | null): ParsedContentLength {
    if (headerValue === null) {
        return { bytes: null, invalid: false }
    }

    const trimmed = headerValue.trim()

    if (!/^\d+$/.test(trimmed)) {
        return { bytes: null, invalid: true }
    }

    const bytes = Number.parseInt(trimmed, 10)

    if (!Number.isSafeInteger(bytes)) {
        return { bytes: null, invalid: true }
    }

    return { bytes, invalid: false }
}

async function readRequestBodyWithLimit(request: NextRequest, maxBytes: number): Promise<BodyReadResult> {
    const reader = request.body?.getReader()

    if (!reader) {
        return { ok: true, body: "" }
    }

    const chunks: Buffer[] = []
    let totalBytes = 0

    try {
        while (true) {
            const { done, value } = await reader.read()

            if (done) {
                break
            }

            if (!value) {
                continue
            }

            totalBytes += value.byteLength

            if (totalBytes > maxBytes) {
                await reader.cancel()
                return { ok: false, reason: "too_large" }
            }

            chunks.push(Buffer.from(value))
        }
    } catch {
        return { ok: false, reason: "invalid" }
    } finally {
        reader.releaseLock()
    }

    return { ok: true, body: Buffer.concat(chunks, totalBytes).toString("utf8") }
}

function getTurnstileSecret(): string | null {
    const secret = process.env.TURNSTILE_SECRET_KEY?.trim()
    return secret && secret.length > 0 ? secret : null
}

async function verifyTurnstileToken({
    token,
    secret,
    ip,
}: {
    token: string
    secret: string
    ip: string
}): Promise<{ verified: boolean; errorCodes: string[] }> {
    const form = new URLSearchParams({
        secret,
        response: token,
    })

    if (ip !== "unknown") {
        form.set("remoteip", ip)
    }

    let response: Response
    try {
        response = await fetch(TURNSTILE_VERIFY_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: form.toString(),
            cache: "no-store",
        })
    } catch {
        return { verified: false, errorCodes: ["network_error"] }
    }

    if (!response.ok) {
        return { verified: false, errorCodes: [`http_${response.status}`] }
    }

    let payload: TurnstileVerificationResponse
    try {
        payload = (await response.json()) as TurnstileVerificationResponse
    } catch {
        return { verified: false, errorCodes: ["invalid_response"] }
    }

    const parsedErrorCodes = Array.isArray(payload["error-codes"])
        ? payload["error-codes"].filter((code): code is string => typeof code === "string")
        : []

    return {
        verified: payload.success === true,
        errorCodes: parsedErrorCodes,
    }
}

function getClientIp(request: NextRequest): string {
    const forwardedFor = request.headers.get("x-forwarded-for")
    if (forwardedFor) {
        const firstHop = forwardedFor.split(",")[0]?.trim()
        if (firstHop) {
            return firstHop.slice(0, 100)
        }
    }

    const realIp = request.headers.get("x-real-ip")
    if (realIp?.trim()) {
        return realIp.trim().slice(0, 100)
    }

    return "unknown"
}

function parseDesignImage(input: unknown): string | null | undefined {
    if (input === undefined) {
        return undefined
    }

    if (input === null) {
        return null
    }

    if (typeof input !== "string") {
        return undefined
    }

    const trimmed = input.trim()

    if (!trimmed) {
        return null
    }

    const match = trimmed.match(/^data:(image\/png|image\/jpeg);base64,([A-Za-z0-9+/=]+)$/)
    if (!match) {
        return undefined
    }

    const encoded = match[2]
    const decodedBuffer = Buffer.from(encoded, "base64")

    if (decodedBuffer.byteLength === 0 || decodedBuffer.byteLength > MAX_DESIGN_IMAGE_BYTES) {
        return undefined
    }

    return trimmed
}

function validatePayload(input: unknown): ValidationResult {
    if (!input || typeof input !== "object" || Array.isArray(input)) {
        return { error: "Body must be a JSON object." }
    }

    const body = input as Record<string, unknown>
    const { name, email, productType, colors, orientation, stitchType } = body

    if (typeof name !== "string" || typeof email !== "string" || typeof productType !== "string") {
        return { error: "Missing required fields." }
    }

    const trimmedName = name.trim()
    const trimmedEmail = email.trim()
    const trimmedProductType = productType.trim()

    if (!trimmedName || !trimmedEmail || !trimmedProductType) {
        return { error: "Missing required fields." }
    }

    if (!EMAIL_REGEX.test(trimmedEmail)) {
        return { error: "Invalid email format." }
    }

    if (
        trimmedName.length < 2 ||
        trimmedName.length > MAX_NAME_LENGTH ||
        trimmedEmail.length > MAX_EMAIL_LENGTH ||
        trimmedProductType.length > MAX_PRODUCT_FIELD_LENGTH
    ) {
        return { error: "Invalid field length." }
    }

    if (!Array.isArray(colors) || colors.length === 0 || colors.length > MAX_COLORS) {
        return { error: "Invalid colors selection (1-10 colors required)." }
    }

    const sanitizedColors: string[] = []
    for (const color of colors) {
        if (typeof color !== "string") {
            return { error: "Each color must be a string." }
        }

        const sanitizedColor = sanitizeInput(color, MAX_COLOR_LENGTH)
        if (!sanitizedColor) {
            return { error: "Each color must be non-empty." }
        }

        sanitizedColors.push(sanitizedColor)
    }

    const orientationValue = typeof orientation === "string" ? orientation : ""
    const stitchTypeValue = typeof stitchType === "string" ? stitchType : ""
    const parsedDesignImage = parseDesignImage(body.designImage)

    if (body.designImage !== undefined && parsedDesignImage === undefined) {
        return { error: "Invalid design image payload." }
    }

    const rawCaptchaToken = body.captchaToken
    let captchaToken: string | null = null

    if (rawCaptchaToken !== undefined && rawCaptchaToken !== null) {
        if (typeof rawCaptchaToken !== "string") {
            return { error: "Invalid captcha token." }
        }

        const trimmedCaptchaToken = rawCaptchaToken.trim()

        if (!trimmedCaptchaToken || trimmedCaptchaToken.length > MAX_CAPTCHA_TOKEN_LENGTH) {
            return { error: "Invalid captcha token." }
        }

        captchaToken = trimmedCaptchaToken
    }

    return {
        payload: {
            name: sanitizeInput(trimmedName, MAX_NAME_LENGTH),
            email: sanitizeInput(trimmedEmail, MAX_EMAIL_LENGTH),
            productType: sanitizeInput(trimmedProductType, MAX_PRODUCT_FIELD_LENGTH),
            colors: sanitizedColors,
            orientation: sanitizeInput(orientationValue, MAX_PRODUCT_FIELD_LENGTH),
            stitchType: sanitizeInput(stitchTypeValue, MAX_PRODUCT_FIELD_LENGTH),
            designImage: parsedDesignImage,
        },
        captchaToken,
    }
}

export async function POST(request: NextRequest) {
    const ip = getClientIp(request)
    const rateLimitResult = rateLimit(`custom-order:${ip}`, { requests: 5, window: 60000 })

    if (!rateLimitResult.allowed) {
        return NextResponse.json(
            {
                error: "Too many requests. Please try again later.",
                resetAt: new Date(rateLimitResult.resetAt).toISOString(),
            },
            { status: 429, headers: corsHeaders(request) }
        )
    }

    const contentType = request.headers.get("content-type")?.toLowerCase() ?? ""
    if (!contentType.startsWith("application/json")) {
        return NextResponse.json(
            { error: "Unsupported content type. Use application/json." },
            { status: 415, headers: corsHeaders(request) }
        )
    }

    const contentLength = parseContentLength(request.headers.get("content-length"))

    if (contentLength.invalid) {
        return NextResponse.json(
            { error: "Invalid Content-Length header." },
            { status: 400, headers: corsHeaders(request) }
        )
    }

    if (contentLength.bytes !== null && contentLength.bytes > MAX_REQUEST_BYTES) {
        return NextResponse.json({ error: "Payload too large." }, { status: 413, headers: corsHeaders(request) })
    }

    try {
        const rawBody = await readRequestBodyWithLimit(request, MAX_REQUEST_BYTES)

        if (!rawBody.ok) {
            if (rawBody.reason === "too_large") {
                return NextResponse.json(
                    { error: "Payload too large." },
                    { status: 413, headers: corsHeaders(request) }
                )
            }

            return NextResponse.json(
                { error: "Invalid request body." },
                { status: 400, headers: corsHeaders(request) }
            )
        }

        let parsedBody: unknown
        try {
            parsedBody = JSON.parse(rawBody.body)
        } catch {
            return NextResponse.json(
                { error: "Invalid JSON request body." },
                { status: 400, headers: corsHeaders(request) }
            )
        }

        const validation = validatePayload(parsedBody)
        if ("error" in validation) {
            return NextResponse.json(
                { error: validation.error },
                { status: 400, headers: corsHeaders(request) }
            )
        }

        const sanitizedData = validation.payload

        const turnstileSecret = getTurnstileSecret()
        if (turnstileSecret) {
            if (!validation.captchaToken) {
                return NextResponse.json(
                    { error: "Captcha verification is required." },
                    { status: 400, headers: corsHeaders(request) }
                )
            }

            const captchaResult = await verifyTurnstileToken({
                token: validation.captchaToken,
                secret: turnstileSecret,
                ip,
            })

            if (!captchaResult.verified) {
                console.warn(
                    JSON.stringify({
                        event: "custom_order_captcha_failed",
                        errorCodes: captchaResult.errorCodes,
                    })
                )
                return NextResponse.json(
                    { error: "Captcha verification failed." },
                    { status: 403, headers: corsHeaders(request) }
                )
            }
        }

        const emailContent = `
New Custom Order Request

Customer Details:
- Name: ${sanitizedData.name}
- Email: ${sanitizedData.email}

Product Configuration:
- Product Type: ${sanitizedData.productType}
- Colors: ${sanitizedData.colors.join(", ")}
- Orientation: ${sanitizedData.orientation || "Not specified"}
- Stitch Type: ${sanitizedData.stitchType || "Not specified"}
${sanitizedData.designImage ? "- Custom Design: Attached" : ""}

---
Received: ${new Date().toISOString()}
IP Address: ${ip}
        `.trim()

        const orderEmail = process.env.ORDER_EMAIL?.trim()
        const resendApiKey = process.env.RESEND_API_KEY?.trim()

        if (!orderEmail) {
            return NextResponse.json(
                { error: "Server misconfigured: missing ORDER_EMAIL." },
                { status: 500, headers: corsHeaders(request) }
            )
        }

        if (resendApiKey) {
            const resend = new Resend(resendApiKey)
            await resend.emails.send({
                from: "StitchWyse Orders <onboarding@resend.dev>",
                to: orderEmail,
                subject: `New Custom Order - ${sanitizedData.productType}`,
                text: emailContent,
            })
            console.log(
                JSON.stringify({
                    event: "custom_order_email_sent",
                    toDomain: orderEmail.split("@")[1] ?? null,
                })
            )
        } else {
            console.warn(
                JSON.stringify({
                    event: "custom_order_email_skipped",
                    reason: "missing_resend_api_key",
                })
            )
            return NextResponse.json(
                { error: "Server misconfigured: missing RESEND_API_KEY." },
                { status: 500, headers: corsHeaders(request) }
            )
        }

        return NextResponse.json(
            {
                success: true,
                message: "Order received! We'll contact you within 24 hours.",
            },
            { status: 200, headers: corsHeaders(request) }
        )
    } catch (error) {
        console.error(
            JSON.stringify({
                event: "custom_order_request_failed",
                error: error instanceof Error ? error.message : "Unknown error",
            })
        )
        return NextResponse.json(
            { error: "Failed to process order. Please try again." },
            { status: 500, headers: corsHeaders(request) }
        )
    }
}

export async function OPTIONS(request: NextRequest) {
    return new NextResponse(null, { status: 200, headers: corsHeaders(request) })
}
