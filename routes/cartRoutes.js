const express = require("express");
const router = express.Router();
const cartController = require("../controllers/cartController");
const authMiddleware = require("../utils/authMiddleware");

// All cart routes are protected
router.use(authMiddleware);

router.get("/", cartController.getCart);
router.post("/", cartController.addToCart);
router.put("/:itemId", cartController.updateCartItem);
router.delete("/:itemId", cartController.removeFromCart);
router.delete("/", cartController.clearCart);

module.exports = router;
