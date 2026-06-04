const express = require("express");
const router = express.Router();
const { addProduct, getProducts, updateProduct, deleteProduct, addReview } = require("../controllers/productController");

router.post("/", addProduct);
router.get("/", getProducts);
router.put("/:id", updateProduct);
router.delete("/:id", deleteProduct);
router.post("/:id/reviews", addReview);

module.exports = router;
