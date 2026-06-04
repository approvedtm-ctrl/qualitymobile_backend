const express = require("express");
const router = express.Router();
const {
    createNowPayment,
    verifyNowPayment,
    nowpaymentsWebhook,
} = require("../controllers/nowpaymentsController");

router.post("/create-payment", createNowPayment);
router.post("/verify", verifyNowPayment);
router.post("/webhook", nowpaymentsWebhook);

module.exports = router;
