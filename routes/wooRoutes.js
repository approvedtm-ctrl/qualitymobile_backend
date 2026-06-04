const express = require("express");
const router = express.Router();
const { getWooProducts, createWooOrder } = require("../controllers/wooController");

router.get("/products", getWooProducts);
router.post("/orders", createWooOrder);

module.exports = router;
