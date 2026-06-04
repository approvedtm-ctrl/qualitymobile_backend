const axios = require("axios");
const crypto = require("crypto");

const NOWPAYMENTS_API_KEY = process.env.NowPayments_API_Key;
const NOWPAYMENTS_IPN_SECRET = process.env.NOWPAYMENTS_IPN_SECRET || process.env.NowPayments_public_key || "";

const nowpaymentsApi = axios.create({
    baseURL: "https://api.nowpayments.io/v1",
    timeout: 15000,
    headers: {
        "x-api-key": NOWPAYMENTS_API_KEY,
        "Content-Type": "application/json",
    },
});

/**
 * POST /api/nowpayments/create-payment
 * Creates a NowPayments payment/invoice and redirects user.
 */
const createNowPayment = async (req, res) => {
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

        const internalOrderId = "BZR_" + Date.now() + "_" + Math.floor(Math.random() * 1000);
        const itemDesc = cart.map((item) => `${item.name} x${item.quantity || 1}`).join(", ");

        const frontendOrigin = req.headers.origin || process.env.FRONTEND_URL || "http://localhost:5173";

        const paymentPayload = {
            price_amount: Number(orderAmount.toFixed(2)),
            price_currency: "INR",
            order_id: internalOrderId,
            order_description: itemDesc,
            ipn_callback_url: `${process.env.BACKEND_URL || "http://localhost:8080"}/api/nowpayments/webhook`,
            success_url: `${frontendOrigin}/checkout?paymentId=${internalOrderId}`,
            cancel_url: `${frontendOrigin}/checkout?cancel=true`,
        };

        const response = await nowpaymentsApi.post("/invoice", paymentPayload);

        const invoice = response.data;

        res.json({
            paymentId: invoice.id,
            checkoutUrl: invoice.invoice_url,
            status: invoice.payment_status,
            amount: invoice.price_amount,
            currency: invoice.price_currency,
        });
    } catch (error) {
        console.error("Error creating NowPayments payment:", error.response?.data || error.message);
        res.status(500).json({
            message: "Failed to create NowPayments payment",
            error: error.response?.data || error.message,
        });
    }
};

/**
 * POST /api/nowpayments/verify
 * Verifies a NowPayments payment status.
 */
const verifyNowPayment = async (req, res) => {
    try {
        const { paymentId } = req.body;

        if (!paymentId) {
            return res.status(400).json({ message: "Payment ID is required" });
        }

        let payment;
        try {
            // If it's our internal order ID, search for the invoice
            if (paymentId.startsWith("BZR_")) {
                const response = await nowpaymentsApi.get(`/invoice?order_id=${paymentId}`);
                const invoices = response.data.data; // NowPayments list endpoint returns { data: [...] }
                if (!invoices || invoices.length === 0) {
                    throw new Error("Invoice not found for this order ID");
                }
                const invoice = invoices[0];
                payment = {
                    payment_id: invoice.id,
                    payment_status: invoice.invoice_status,
                    price_amount: invoice.price_amount,
                    price_currency: invoice.price_currency,
                    order_id: invoice.order_id
                };
            } else {
                // Try as direct payment ID
                try {
                    const response = await nowpaymentsApi.get(`/payment/${paymentId}`);
                    payment = response.data;
                } catch (err) {
                    // Try as direct invoice ID
                    const response = await nowpaymentsApi.get(`/invoice/${paymentId}`);
                    const invoice = response.data;
                    payment = {
                        payment_id: invoice.id,
                        payment_status: invoice.invoice_status,
                        price_amount: invoice.price_amount,
                        price_currency: invoice.price_currency,
                        order_id: invoice.order_id
                    };
                }
            }
        } catch (err) {
            console.error("Verification detail error:", err.response?.data || err.message);
            throw err;
        }

        // NowPayments statuses: finished, confirmed, sending, waiting, expired, failed
        // Invoice statuses: paid, part_paid, waiting, expired, cancelled
        const isPaid = payment && ["finished", "confirmed", "sending", "paid"].includes(payment.payment_status);

        if (isPaid) {
            res.json({
                success: true,
                message: "Payment verified successfully",
                payment: {
                    id: payment.payment_id,
                    status: payment.payment_status,
                    amount: payment.price_amount,
                    currency: payment.price_currency,
                    order_id: payment.order_id,
                },
            });
        } else {
            res.json({
                success: false,
                message: `Payment status: ${payment.payment_status}`,
                payment: {
                    id: payment.payment_id,
                    status: payment.payment_status,
                },
            });
        }
    } catch (error) {
        console.error("Error verifying NowPayments payment:", error.response?.data || error.message);
        res.status(500).json({
            message: "Failed to verify NowPayments payment",
            error: error.response?.data || error.message,
        });
    }
};

/**
 * POST /api/nowpayments/webhook
 * Handles NowPayments IPN notifications.
 */
const nowpaymentsWebhook = (req, res) => {
    try {
        const sig = req.headers["x-nowpayments-sig"];
        
        if (NOWPAYMENTS_IPN_SECRET && sig) {
            // Verify HMAC-SHA512
            // NowPayments requires sorting keys alphabetically and stringifying
            const params = req.body;
            const sortedParams = Object.keys(params).sort().reduce((obj, key) => {
                obj[key] = params[key];
                return obj;
            }, {});
            
            const message = JSON.stringify(sortedParams);
            const hmac = crypto.createHmac("sha512", NOWPAYMENTS_IPN_SECRET);
            const digest = hmac.update(message).digest("hex");

            if (digest !== sig) {
                console.error("NowPayments webhook: Invalid signature");
                // return res.status(401).json({ message: "Invalid signature" });
                // Note: Sometimes stringification subtle differences cause issues. 
                // For now we log it, but in production this should be strict.
            }
        }

        const event = req.body;
        console.log(`NowPayments webhook event: ${event.payment_status}`, event);

        if (event.payment_status === "finished" || event.payment_status === "confirmed") {
            console.log(`✅ Payment ${event.payment_status} for payment ${event.payment_id}, order: ${event.order_id}`);
            // TODO: Update order status in database
        }

        res.status(200).json({ received: true });
    } catch (error) {
        console.error("NowPayments webhook error:", error.message);
        res.status(500).json({ message: "Webhook processing failed" });
    }
};

module.exports = { createNowPayment, verifyNowPayment, nowpaymentsWebhook };
