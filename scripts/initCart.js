const mysql = require("mysql2/promise");
require("dotenv").config({ path: "./backend/.env" });

async function init() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || "localhost",
        user: process.env.DB_USER || "root",
        password: process.env.DB_PASSWORD || "1234",
        database: process.env.DB_NAME || "coolyourhome"
    });

    console.log("Connected to MySQL");

    // Create cart table
    console.log("Creating cart table...");
    await connection.execute(`
        CREATE TABLE IF NOT EXISTS cart (
            cart_id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    `);

    // Create cart_items table
    console.log("Creating cart_items table...");
    await connection.execute(`
        CREATE TABLE IF NOT EXISTS cart_items (
            cart_item_id INT AUTO_INCREMENT PRIMARY KEY,
            cart_id INT NOT NULL,
            product_id INT NOT NULL,
            quantity INT DEFAULT 1,
            price DECIMAL(10,2),
            added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (cart_id) REFERENCES cart(cart_id),
            FOREIGN KEY (product_id) REFERENCES products(id)
        )
    `);

    console.log("Cart tables initialization complete");
    await connection.end();
}

init().catch(err => {
    console.error("Cart Initialization Failed:", err);
    process.exit(1);
});
