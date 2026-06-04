const axios = require("axios");
const crypto = require("crypto");
const https = require("https");
const dns = require("dns");

const BTCPAY_URL = process.env.BTCPAY_URL;
const BTCPAY_API_KEY = process.env.BTCPAY_API_KEY;
const BTCPAY_STORE_ID = process.env.BTCPAY_STORE_ID;
const BTCPAY_WEBHOOK_SECRET = process.env.BTCPAY_WEBHOOK_SECRET || "";

// Force IPv4 first (VERY IMPORTANT)
dns.setDefaultResultOrder("ipv4first");

const httpsAgent = new https.Agent({
    keepAlive: true,
    family: 4, // force IPv4
});

const btcpayApi = axios.create({
    baseURL: `${BTCPAY_URL}/api/v1/stores/${BTCPAY_STORE_ID}`,
    timeout: 15000, // ✅ ADD TIMEOUT
    httpsAgent: httpsAgent,
    headers: {
        Authorization: `token ${BTCPAY_API_KEY}`,
        "Content-Type": "application/json",
    },
});

/**
 * POST /api/btcpay/create-invoice
 * Creates a BTCPay invoice from the cart and redirects user to BTCPay checkout.
 */
const createBtcpayInvoice = async (req, res) => {
    try {
        const { cart, user, deliveryAddress } = req.body;

        if (!cart || cart.length === 0) {
            return res.status(400).json({ message: "Cart empty" });
        }

        // Calculate total order amount
        let orderAmount = 0;
        cart.forEach((item) => {
            const price = item.price || item.discountedPrice || 0;
            orderAmount += price * (item.quantity || 1);
        });

        // Generate unique internal order reference
        const internalOrderId =
            "BZR_" + Date.now() + "_" + Math.floor(Math.random() * 1000);

        // Build item description
        const itemDesc = cart
            .map((item) => `${item.name} x${item.quantity || 1}`)
            .join(", ");

        const frontendOrigin =
            req.headers.origin ||
            process.env.FRONTEND_URL ||
            "http://localhost:5173";

        const invoicePayload = {
            amount: String(orderAmount),
            currency: process.env.BTCPAY_CURRENCY || "INR",
            metadata: {
                orderId: internalOrderId,
                customerEmail: user?.email || "guest@example.com",
                customerName:
                    user?.name || deliveryAddress?.name || "Guest User",
                deliveryAddress: deliveryAddress?.address || "",
                itemDesc: itemDesc,
            },
            checkout: {
                redirectURL: `${frontendOrigin}/checkout?invoiceId={InvoiceId}`,
                redirectAutomatically: true,
                defaultLanguage: "en",
            },
            receipt: {
                enabled: true,
                showPayments: true,
                showQR: true,
            },
        };

        const response = await btcpayApi.post("/invoices", invoicePayload);

        const invoice = response.data;

        res.json({
            invoiceId: invoice.id,
            checkoutUrl: invoice.checkoutLink,
            status: invoice.status,
            amount: invoice.amount,
            currency: invoice.currency,
        });
    } catch (error) {
        console.error(
            "Error creating BTCPay invoice:",
            error.response?.data || error.message
        );
        console.log(error);
        res.status(500).json({
            message: "Failed to create BTCPay invoice",
            error: error.response?.data || error.message,
        });
    }
};

/**
 * POST /api/btcpay/verify
 * Verifies a BTCPay invoice status after user returns from checkout.
 */
const verifyBtcpayPayment = async (req, res) => {
    try {
        const { invoiceId } = req.body;

        if (!invoiceId) {
            return res.status(400).json({ message: "Invoice ID is required" });
        }

        const response = await btcpayApi.get(`/invoices/${invoiceId}`);
        const invoice = response.data;

        // BTCPay invoice statuses: New, Processing, Settled, Expired, Invalid
        const isPaid =
            invoice.status === "Settled" || invoice.status === "Processing";

        if (isPaid) {
            res.json({
                success: true,
                message: "Payment verified successfully",
                invoice: {
                    id: invoice.id,
                    status: invoice.status,
                    amount: invoice.amount,
                    currency: invoice.currency,
                    metadata: invoice.metadata,
                },
            });
        } else {
            res.json({
                success: false,
                message: `Payment not completed. Status: ${invoice.status}`,
                invoice: {
                    id: invoice.id,
                    status: invoice.status,
                },
            });
        }
    } catch (error) {
        console.error(
            "Error verifying BTCPay payment:",
            error.response?.data || error.message
        );
        res.status(500).json({
            message: "Failed to verify BTCPay payment",
            error: error.response?.data || error.message,
        });
    }
};

/**
 * POST /api/btcpay/webhook
 * Handles BTCPay webhook events (InvoiceSettled, InvoiceProcessing, etc.)
 * Must receive raw body for HMAC signature verification.
 */
const btcpayWebhook = (req, res) => {
    try {
        // Verify webhook signature if secret is configured
        if (BTCPAY_WEBHOOK_SECRET) {
            const sig = req.headers["btcpay-sig"];
            if (!sig) {
                return res.status(401).json({ message: "Missing signature" });
            }

            const hmac = crypto.createHmac("sha256", BTCPAY_WEBHOOK_SECRET);
            hmac.update(req.body); // req.body is raw Buffer here
            const digest = Buffer.from(
                "sha256=" + hmac.digest("hex"),
                "utf8"
            );
            const checksum = Buffer.from(sig, "utf8");

            if (
                checksum.length !== digest.length ||
                !crypto.timingSafeEqual(digest, checksum)
            ) {
                console.error("BTCPay webhook: Invalid signature");
                return res
                    .status(401)
                    .json({ message: "Invalid signature" });
            }
        }

        const event =
            typeof req.body === "string" || Buffer.isBuffer(req.body)
                ? JSON.parse(req.body.toString())
                : req.body;

        console.log(`BTCPay webhook event: ${event.type}`, event);

        // Handle payment events
        if (
            event.type === "InvoiceSettled" ||
            event.type === "InvoiceProcessing"
        ) {
            const invoiceId = event.invoiceId;
            const metadata = event.metadata || {};
            console.log(
                `✅ Payment ${event.type} for invoice ${invoiceId}, order: ${metadata.orderId}`
            );

            // TODO: Update order status in database here
            // e.g., db.query("UPDATE orders SET status = 'Paid' WHERE ... ")
        }

        if (event.type === "InvoiceExpired") {
            console.log(`⏰ Invoice expired: ${event.invoiceId}`);
        }

        if (event.type === "InvoiceInvalid") {
            console.log(`❌ Invoice invalid: ${event.invoiceId}`);
        }

        res.status(200).json({ received: true });
    } catch (error) {
        console.error("BTCPay webhook error:", error.message);
        res.status(500).json({ message: "Webhook processing failed" });
    }
};

module.exports = { createBtcpayInvoice, verifyBtcpayPayment, btcpayWebhook };
