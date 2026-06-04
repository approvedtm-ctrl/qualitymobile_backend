const express = require("express");
const router = express.Router();
const {
    createBtcpayInvoice,
    verifyBtcpayPayment,
    btcpayWebhook,
} = require("../controllers/btcpayController");

router.post("/create-invoice", createBtcpayInvoice);
router.post("/verify", verifyBtcpayPayment);

// Webhook needs raw body for signature verification
// The raw body middleware is applied in server.js
router.post("/webhook", btcpayWebhook);

module.exports = router;
