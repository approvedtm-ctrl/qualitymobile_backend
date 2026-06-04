const mysql = require("mysql2/promise");
require("dotenv").config({ path: "../.env" });

const products = [
    {
        id: 1,
        name: "Samsung Galaxy S24",
        brand: "Samsung",
        category: "Cell Phones & Accessories",
        originalPrice: 155000,
        discountedPrice: 145000,
        rating: 4.5,
        soldCount: "500+ sold",
        tags: ["Premium", "New"],
        images: [
            "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=800&q=80",
            "https://images.unsplash.com/photo-1580910051074-3eb694886505?auto=format&fit=crop&w=800&q=80"
        ],
        description: "Samsung Galaxy S24 — flagship compact with powerful camera",
        youtubeVideo: "https://www.youtube.com/embed/u9yv3RmqAm8",
        condition: "New",
        ebayDetails: { model: "SM-S921", network: "Unlocked", warranty: "1 Year Samsung" }
    },
    {
        id: 2,
        name: "Samsung Galaxy S24+",
        brand: "Samsung",
        category: "Cell Phones & Accessories",
        originalPrice: 165000,
        discountedPrice: 152000,
        rating: 4.4,
        soldCount: "420+ sold",
        tags: ["Premium"],
        images: [
            "https://images.unsplash.com/photo-1603899123095-04cba5e8f7d0?auto=format&fit=crop&w=800&q=80",
            "https://images.unsplash.com/photo-1598327105666-5b89351aff97?auto=format&fit=crop&w=800&q=80"
        ],
        description: "S24+ — larger display, long battery",
        youtubeVideo: "https://www.youtube.com/embed/5uoOudL_cKE",
        condition: "New",
        ebayDetails: { model: "SM-S926", network: "Unlocked", warranty: "1 Year Samsung" }
    },
    {
        id: 3,
        name: "Samsung Galaxy S24 Ultra",
        brand: "Samsung",
        category: "Cell Phones & Accessories",
        originalPrice: 225000,
        discountedPrice: 199000,
        rating: 4.7,
        soldCount: "1200+ sold",
        tags: ["FlashSale", "Premium"],
        images: [
            "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=800&q=80",
            "https://images.unsplash.com/photo-1565372911796-6d9e7d2c5c7f?auto=format&fit=crop&w=800&q=80"
        ],
        description: "S24 Ultra — top camera, S-Pen support",
        youtubeVideo: "https://www.youtube.com/embed/ePdbj2bZ-Ro",
        condition: "New",
        ebayDetails: { model: "SM-S928", network: "Unlocked", warranty: "1 Year Samsung" }
    },
    {
        id: 10,
        name: "iPhone 17 Pro Max 1 TB",
        brand: "Apple",
        category: "Cell Phones & Accessories",
        originalPrice: 240000,
        discountedPrice: 215000,
        rating: 4.7,
        soldCount: "900+ sold",
        tags: ["Premium", "HotDeals"],
        images: [
            "https://images.unsplash.com/photo-1695048133142-1a20484f3d5c?auto=format&fit=crop&w=800&q=80",
            "https://images.unsplash.com/photo-1512499617640-c2f999098c01?auto=format&fit=crop&w=800&q=80"
        ],
        description: "iPhone 17 Pro Max 1 TB — titanium frame, A17 Pro",
        youtubeVideo: "https://www.youtube.com/embed/wqcjKkyuoZk",
        condition: "New",
        ebayDetails: { model: "iPhone 17 PM", network: "Unlocked", warranty: "1 Year Apple" }
    },
    {
        id: 11,
        name: "iPhone 15 Pro Max",
        brand: "Apple",
        category: "Cell Phones & Accessories",
        originalPrice: 240000,
        discountedPrice: 215000,
        rating: 4.7,
        soldCount: "900+ sold",
        tags: ["Premium", "HotDeals"],
        images: [
            "https://images.unsplash.com/photo-1695048133142-1a20484f3d5c?auto=format&fit=crop&w=800&q=80",
            "https://images.unsplash.com/photo-1512499617640-c2f999098c01?auto=format&fit=crop&w=800&q=80"
        ],
        description: "iPhone 15 Pro Max — titanium frame, A17 Pro",
        youtubeVideo: "https://www.youtube.com/embed/wqcjKkyuoZk",
        condition: "New",
        ebayDetails: { model: "iPhone 15 PM", network: "Unlocked", warranty: "1 Year Apple" }
    },
    {
        id: 12,
        name: "iPhone 15",
        brand: "Apple",
        category: "Cell Phones & Accessories",
        originalPrice: 135000,
        discountedPrice: 125000,
        rating: 4.3,
        soldCount: "700+ sold",
        tags: ["New"],
        images: [
            "https://images.unsplash.com/photo-1510557880182-3c6f00f48cde?auto=format&fit=crop&w=800&q=80"
        ],
        description: "iPhone 15 — USB-C, new camera features",
        youtubeVideo: "https://www.youtube.com/embed/3AysfXKBJW8",
        condition: "New",
        ebayDetails: { model: "iPhone 15", network: "Unlocked", warranty: "1 Year Apple" }
    },
    {
        id: 20,
        name: "Xiaomi 13 Pro",
        brand: "Xiaomi",
        category: "Cell Phones & Accessories",
        originalPrice: 125000,
        discountedPrice: 110000,
        rating: 4.2,
        soldCount: "300+ sold",
        tags: ["Premium"],
        images: [
            "https://images.unsplash.com/photo-1580910051074-3eb694886505?auto=format&fit=crop&w=800&q=80"
        ],
        description: "Xiaomi 13 Pro — Leica camera co-engineered",
        youtubeVideo: "https://www.youtube.com/embed/kvEroKBGzYM",
        condition: "New",
        ebayDetails: { model: "13 Pro", network: "Unlocked", warranty: "1 Year Global" }
    },
    {
        id: 30,
        name: "Vivo X100 Pro",
        brand: "Vivo",
        category: "Cell Phones & Accessories",
        originalPrice: 95000,
        discountedPrice: 86000,
        rating: 4.1,
        soldCount: "220+ sold",
        tags: ["New"],
        images: [
            "https://images.unsplash.com/photo-1603899123095-04cba5e8f7d0?auto=format&fit=crop&w=800&q=80"
        ],
        description: "Vivo X100 Pro — flagship camera-first phone",
        youtubeVideo: "https://www.youtube.com/embed/Km80ZTTaXsI",
        condition: "New",
        ebayDetails: { model: "X100 Pro", network: "Unlocked", warranty: "1 Year Global" }
    },
    {
        id: 40,
        name: "Oppo Find X6 pro",
        brand: "Oppo",
        category: "Cell Phones & Accessories",
        originalPrice: 110000,
        discountedPrice: 98000,
        rating: 4.2,
        soldCount: "150+ sold",
        tags: ["Premium"],
        images: [
            "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=800&q=80"
        ],
        description: "Oppo Find X6 pro — imaging flagship",
        youtubeVideo: "https://www.youtube.com/embed/0gHwRR6I494",
        condition: "New",
        ebayDetails: { model: "X6 Pro", network: "Unlocked", warranty: "1 Year Global" }
    },
    {
        id: 50,
        name: "Moto Edge 40",
        brand: "Motorola",
        category: "Cell Phones & Accessories",
        originalPrice: 65000,
        discountedPrice: 58000,
        rating: 4.0,
        soldCount: "120+ sold",
        tags: ["HotDeals"],
        images: [
            "https://images.unsplash.com/photo-1598327105666-5b89351aff97?auto=format&fit=crop&w=800&q=80"
        ],
        description: "Moto Edge 40 — clean Android, solid battery",
        youtubeVideo: "https://www.youtube.com/embed/BiRMEYBL62I",
        condition: "New",
        ebayDetails: { model: "Edge 40", network: "Unlocked", warranty: "1 Year Global" }
    },
    {
        id: 80,
        name: "itel A70",
        brand: "Itel",
        category: "Electronics",
        originalPrice: 12000,
        discountedPrice: 9900,
        rating: 4.2,
        soldCount: "40+ sold",
        tags: ["Budget", "HotDeals"],
        images: [
            "/images/itel-A70/BB17.jpg",
            "/images/itel-A70/BB18.jpg",
            "/images/itel-A70/BB41.jpg",
            "/images/itel-A70/BBB11.jpg"
        ],
        youtubeVideo: "https://www.youtube.com/embed/3eZb1Z8v3Z8",
        reviewImage: "/images/itel-A70/Review/71sQVuTgPjL.jpg",
        description: "itel A70 (4GB RAM, 256GB ROM) with Memory Fusion up to 12GB, 13MP AI Dual Camera.",
        specs: {
            display: "6.56 IPS HD+ Dynamic Bar",
            processor: "Unisoc T603 Octa-Core",
            ram: "4GB + Memory Fusion (up to 12GB)",
            storage: "256GB"
        },
        reviews: [
            { name: "Eissa", rating: 5, country: "Egypt", text: "Excellent price and good quality." }
        ],
        condition: "New",
        ebayDetails: { model: "A70", network: "Unlocked", warranty: "1 Year Brand" }
    }
];

async function init() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || "localhost",
        user: process.env.DB_USER || "root",
        password: process.env.DB_PASSWORD || "1234",
        database: process.env.DB_NAME || "coolyourhome"
    });

    console.log("Connected to MySQL");

    // Create products table
    await connection.execute("DROP TABLE IF EXISTS products");
    await connection.execute(`
    CREATE TABLE products (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      brand VARCHAR(255),
      category VARCHAR(255),
      originalPrice DECIMAL(10,2),
      discountedPrice DECIMAL(10,2),
      rating DECIMAL(2,1),
      soldCount VARCHAR(255),
      tags JSON,
      images JSON,
      description TEXT,
      youtubeVideo VARCHAR(255),
      reviewImage VARCHAR(255),
      specs JSON,
      reviews JSON,
      \`condition\` VARCHAR(255),
      ebayDetails JSON,
      image_url VARCHAR(255)
    )
  `);

    console.log("Products table drop and recreation complete");

    // Insert products
    const insertQuery = "INSERT INTO products (name, brand, category, originalPrice, discountedPrice, rating, soldCount, tags, images, description, youtubeVideo, reviewImage, specs, reviews, `condition`, ebayDetails, image_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

    for (const p of products) {
        await connection.execute(insertQuery, [
            p.name || null,
            p.brand || null,
            p.category || null,
            p.originalPrice || 0,
            p.discountedPrice || 0,
            p.rating || 0,
            p.soldCount || null,
            JSON.stringify(p.tags || []),
            JSON.stringify(p.images || []),
            p.description || null,
            p.youtubeVideo || null,
            p.reviewImage || null,
            JSON.stringify(p.specs || {}),
            JSON.stringify(p.reviews || []),
            p.condition || "New",
            JSON.stringify(p.ebayDetails || {}),
            p.images && p.images[0] ? p.images[0] : null
        ]);
    }

    console.log(`Inserted ${products.length} products`);
    await connection.end();
}

init().catch(err => {
    console.error("Initialization Failed:", err);
    process.exit(1);
});
