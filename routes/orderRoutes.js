const express = require("express");
const router = express.Router();
const { createOrder, getOrders, updateOrderStatus, getMyOrders, updateDeliveryDetails } = require("../controllers/orderController");

router.post("/", createOrder);
router.get("/", getOrders);
router.get("/user/:email", getMyOrders);
router.put("/:id", updateOrderStatus);
router.put("/:id/delivery", updateDeliveryDetails);

module.exports = router;
