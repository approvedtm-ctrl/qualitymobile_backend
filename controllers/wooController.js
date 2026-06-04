const wooApi = require("../config/wooCommerce");

const getWooProducts = async (req, res) => {
    if (!wooApi)
        return res.status(400).json({
            message: "WooCommerce not configured"
        });

    try {
        const response = await wooApi.get("products");
        res.json(response.data);
    } catch (err) {
        console.error("WooCommerce API Error:", err.message || err);
        res.status(500).json(err.message);
    }
};

const createWooOrder = async (req, res) => {
    if (!wooApi)
        return res.status(400).json({
            message: "WooCommerce not configured"
        });

    try {
        const response = await wooApi.post("orders", req.body);
        res.json(response.data);
    } catch (err) {
        res.status(500).json(err.message);
    }
};

module.exports = { getWooProducts, createWooOrder };
