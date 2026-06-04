const { db, getUseDb } = require("../config/db");
const { SAMPLE_PRODUCTS } = require("../utils/demoData");

const productsCache = [];

const addProduct = (req, res) => {
    const {
        name, price, brand, category, originalPrice, discountedPrice,
        rating, soldCount, tags, images, description, youtubeVideo,
        reviewImage, specs, reviews, condition, ebayDetails, stock
    } = req.body;
    const useDb = getUseDb();

    if (!useDb) {
        const id = productsCache.length + 1;
        productsCache.push({
            id, name, price, brand, category, originalPrice, discountedPrice,
            rating, soldCount, tags, images, description, youtubeVideo,
            reviewImage, specs, reviews, condition, ebayDetails, stock: stock || 0
        });
        return res.json({ message: "Product added (memory)" });
    }

    db.query(
        `INSERT INTO products 
        (name, price, brand, category, originalPrice, discountedPrice, rating, soldCount, tags, images, description, youtubeVideo, reviewImage, specs, reviews, \`condition\`, ebayDetails, image_url, stock) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            name, price, brand, category, originalPrice, discountedPrice,
            rating, soldCount, JSON.stringify(tags || []), JSON.stringify(images || []),
            description, youtubeVideo, reviewImage, JSON.stringify(specs || {}),
            JSON.stringify(reviews || []), condition, JSON.stringify(ebayDetails || {}),
            images && images[0] ? images[0] : null,
            stock || 0
        ],
        err => {
            if (err) {
                console.error("Add Product Error:", err);
                return res.status(500).json(err);
            }
            res.json({ message: "Product added" });
        }
    );
};

const getProducts = (req, res) => {
    const useDb = getUseDb();

    if (!useDb) {
        if (productsCache.length === 0) {
            productsCache.push(...SAMPLE_PRODUCTS);
        }
        return res.json(productsCache);
    }

    db.query("SELECT * FROM products", (err, results) => {
        if (err) {
            console.error("Get Products Error:", err);
            return res.status(500).json(err);
        }

        const parsedResults = results.map(p => ({
            ...p,
            tags: typeof p.tags === 'string' ? JSON.parse(p.tags) : p.tags,
            images: typeof p.images === 'string' ? JSON.parse(p.images) : p.images,
            specs: typeof p.specs === 'string' ? JSON.parse(p.specs) : p.specs,
            reviews: typeof p.reviews === 'string' ? JSON.parse(p.reviews) : p.reviews,
            ebayDetails: typeof p.ebayDetails === 'string' ? JSON.parse(p.ebayDetails) : p.ebayDetails,
        }));

        res.json(parsedResults);
    });
};

const updateProduct = (req, res) => {
    const { id } = req.params;
    const {
        name, brand, category, originalPrice, discountedPrice,
        rating, soldCount, tags, images, description, youtubeVideo,
        reviewImage, specs, reviews, condition, ebayDetails, image_url, stock
    } = req.body;
    const useDb = getUseDb();

    if (!useDb) {
        return res.json({ message: "Product updated (memory)" });
    }

    db.query(
        `UPDATE products SET 
        name = ?, brand = ?, category = ?, originalPrice = ?, discountedPrice = ?, 
        rating = ?, soldCount = ?, tags = ?, images = ?, description = ?, youtubeVideo = ?, 
        reviewImage = ?, specs = ?, reviews = ?, \`condition\` = ?, ebayDetails = ?, image_url = ?, stock = ?
        WHERE id = ?`,
        [
            name, brand, category, originalPrice, discountedPrice,
            rating, soldCount, JSON.stringify(tags || []), JSON.stringify(images || []),
            description, youtubeVideo, reviewImage, JSON.stringify(specs || {}),
            JSON.stringify(reviews || []), condition, JSON.stringify(ebayDetails || {}),
            image_url || (images && images[0] ? images[0] : null),
            stock || 0,
            id
        ],
        err => {
            if (err) {
                console.error("Update Product Error:", err);
                return res.status(500).json(err);
            }
            res.json({ message: "Product updated successfully" });
        }
    );
};

const deleteProduct = (req, res) => {
    const { id } = req.params;
    const useDb = getUseDb();

    if (!useDb) {
        return res.json({ message: "Product deleted (memory)" });
    }

    db.query("DELETE FROM products WHERE id = ?", [id], err => {
        if (err) {
            console.error("Delete Product Error:", err);
            return res.status(500).json(err);
        }
        res.json({ message: "Product deleted successfully" });
    });
};

const addReview = (req, res) => {
    const { id } = req.params;
    const { user, rating, comment } = req.body;
    const useDb = getUseDb();

    if (!useDb) {
        return res.json({ message: "Review added (memory)" });
    }

    db.query("SELECT reviews FROM products WHERE id = ?", [id], (err, results) => {
        if (err) return res.status(500).json(err);
        if (results.length === 0) return res.status(404).json({ message: "Product not found" });

        let reviews = [];
        try {
            reviews = JSON.parse(results[0].reviews || "[]");
        } catch (e) {
            reviews = [];
        }

        reviews.push({ user, rating, comment, date: new Date().toISOString() });

        db.query("UPDATE products SET reviews = ? WHERE id = ?", [JSON.stringify(reviews), id], err => {
            if (err) return res.status(500).json(err);
            res.json({ message: "Review added successfully" });
        });
    });
};

module.exports = { addProduct, getProducts, updateProduct, deleteProduct, addReview };
