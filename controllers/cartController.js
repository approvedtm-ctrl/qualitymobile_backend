const { db, getUseDb } = require("../config/db");

// Helper to get or create a cart for a user
const getOrCreateCartId = (userId) => {
    return new Promise((resolve, reject) => {
        db.query("SELECT cart_id FROM cart WHERE user_id = ?", [userId], (err, results) => {
            if (err) {
                console.error("SELECT cart_id ERROR:", err);
                return reject(err);
            }
            if (results.length > 0) {
                resolve(results[0].cart_id);
            } else {
                db.query("INSERT INTO cart (user_id) VALUES (?)", [userId], (err, result) => {
                    if (err) {
                        console.error("INSERT INTO cart ERROR:", err);
                        return reject(err);
                    }
                    resolve(result.insertId);
                });
            }
        });
    });
};

const getCart = async (req, res) => {
    const userId = req.user.id;
    const useDb = getUseDb();

    if (!useDb) {
        return res.json([]); // Simple fallback for memory mode
    }

    try {
        const cartId = await getOrCreateCartId(userId);
        const query = `
            SELECT ci.*, p.name, p.originalPrice as original_price, p.discountedPrice as discounted_price, p.image_url 
            FROM cart_items ci
            JOIN products p ON ci.product_id = p.id
            WHERE ci.cart_id = ?
        `;
        db.query(query, [cartId], (err, results) => {
            if (err) {
                console.error("getCart SELECT ci.* ERROR:", err);
                return res.status(500).json({ error: err.message, sql: err.sql || query });
            }
            res.json(results);
        });
    } catch (err) {
        console.error("getCart CATCH ERROR:", err);
        res.status(500).json({ error: err.message });
    }
};

const addToCart = async (req, res) => {
    const userId = req.user.id;
    const { product_id, quantity, price } = req.body;
    const useDb = getUseDb();

    if (!useDb) {
        return res.json({ message: "Added to cart (memory mode)" });
    }

    try {
        const cartId = await getOrCreateCartId(userId);

        // Check if item already exists in cart
        db.query(
            "SELECT cart_item_id, quantity FROM cart_items WHERE cart_id = ? AND product_id = ?",
            [cartId, product_id],
            (err, results) => {
                if (err) {
                    console.error("addToCart SELECT cart_items ERROR:", err);
                    return res.status(500).json({ error: err.message });
                }

                if (results.length > 0) {
                    // Update quantity
                    const newQuantity = results[0].quantity + (quantity || 1);
                    db.query(
                        "UPDATE cart_items SET quantity = ? WHERE cart_item_id = ?",
                        [newQuantity, results[0].cart_item_id],
                        (err) => {
                            if (err) {
                                console.error("addToCart UPDATE cart_items ERROR:", err);
                                return res.status(500).json({ error: err.message });
                            }
                            res.json({ message: "Cart updated", cart_item_id: results[0].cart_item_id });
                        }
                    );
                } else {
                    // Insert new item
                    db.query(
                        "INSERT INTO cart_items (cart_id, product_id, quantity, price) VALUES (?, ?, ?, ?)",
                        [cartId, product_id, quantity || 1, price],
                        (err, result) => {
                            if (err) {
                                console.error("addToCart INSERT cart_items ERROR:", err);
                                return res.status(500).json({ error: err.message });
                            }
                            res.json({ message: "Added to cart", cart_item_id: result.insertId });
                        }
                    );
                }
            }
        );
    } catch (err) {
        console.error("addToCart CATCH ERROR:", err);
        res.status(500).json({ error: err.message });
    }
};

const updateCartItem = (req, res) => {
    const { itemId } = req.params;
    const { quantity } = req.body;
    const useDb = getUseDb();

    if (!useDb) return res.json({ message: "Updated (memory mode)" });

    db.query(
        "UPDATE cart_items SET quantity = ? WHERE cart_item_id = ?",
        [quantity, itemId],
        (err) => {
            if (err) return res.status(500).json(err);
            res.json({ message: "Quantity updated" });
        }
    );
};

const removeFromCart = (req, res) => {
    const { itemId } = req.params;
    const useDb = getUseDb();

    if (!useDb) return res.json({ message: "Removed (memory mode)" });

    db.query("DELETE FROM cart_items WHERE cart_item_id = ?", [itemId], (err) => {
        if (err) return res.status(500).json(err);
        res.json({ message: "Item removed from cart" });
    });
};

const clearCart = async (req, res) => {
    const userId = req.user.id;
    const useDb = getUseDb();

    if (!useDb) return res.json({ message: "Cart cleared (memory mode)" });

    try {
        const cartId = await getOrCreateCartId(userId);
        db.query("DELETE FROM cart_items WHERE cart_id = ?", [cartId], (err) => {
            if (err) return res.status(500).json(err);
            res.json({ message: "Cart cleared" });
        });
    } catch (err) {
        res.status(500).json(err);
    }
};

module.exports = { getCart, addToCart, updateCartItem, removeFromCart, clearCart };
