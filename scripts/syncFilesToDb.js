const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const IMAGES_DIR = path.join(__dirname, '../../public/images');

async function sync() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || "localhost",
        user: process.env.DB_USER || "root",
        password: process.env.DB_PASSWORD || "1234",
        database: process.env.DB_NAME || "coolyourhome"
    });

    console.log("Connected to MySQL");

    const [dbProducts] = await connection.execute("SELECT id, name FROM products");
    const folders = fs.readdirSync(IMAGES_DIR).filter(f => fs.statSync(path.join(IMAGES_DIR, f)).isDirectory());

    for (const folder of folders) {
        const folderPath = path.join(IMAGES_DIR, folder);
        const files = fs.readdirSync(folderPath);

        // Collect images
        const images = files
            .filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f))
            .map(f => `/images/${folder}/${f}`);

        if (images.length === 0) continue;

        // Try to find a .txt file
        const txtFile = files.find(f => f.endsWith('.txt'));
        let description = "";
        let brand = "";

        if (txtFile) {
            const content = fs.readFileSync(path.join(folderPath, txtFile), 'utf8');

            // Extract description
            const descMatch = content.match(/Product description\r?\n+([^\r\n]+)/i);
            if (descMatch) {
                description = descMatch[1].trim();
            } else {
                const aboutMatch = content.match(/About this item\r?\n+([\s\S]+?)(?=\r?\n\r?\n|$)/i);
                if (aboutMatch) {
                    description = aboutMatch[1].trim().replace(/\r?\n/g, ' ');
                }
            }

            // Extract brand
            const brandMatch = content.match(/Brand\t+([^\r\n]+)/i);
            if (brandMatch) {
                brand = brandMatch[1].trim();
            }
        }

        // Match with DB product
        // 1. Exact match
        // 2. Folder name match (after cleaning)
        // 3. Name contains folder name or vice versa

        const cleanFolderName = folder.replace(/-/g, ' ').toLowerCase();
        let targetProduct = dbProducts.find(p => p.name.toLowerCase() === cleanFolderName);

        if (!targetProduct) {
            targetProduct = dbProducts.find(p => {
                const pName = p.name.toLowerCase();
                return pName.includes(cleanFolderName) || cleanFolderName.includes(pName);
            });
        }

        if (targetProduct) {
            console.log(`Updating product: ${targetProduct.name} (ID: ${targetProduct.id}) from folder: ${folder}`);
            await connection.execute(
                "UPDATE products SET images = ?, image_url = ?, description = ? WHERE id = ?",
                [JSON.stringify(images), images[0], description || null, targetProduct.id]
            );
        } else {
            console.log(`Creating new product for folder: ${folder}`);
            // Simple heuristic for brand if not found in txt
            if (!brand) {
                const brands = ["Samsung", "Xiaomi", "Vivo", "Tecno", "Infinix", "Itel", "Oppo", "Motorola", "Apple"];
                brand = brands.find(b => cleanFolderName.includes(b.toLowerCase())) || "Generic";
            }

            await connection.execute(
                "INSERT INTO products (name, brand, category, originalPrice, discountedPrice, images, image_url, description, tags) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                [
                    folder.replace(/-/g, ' '),
                    brand,
                    "Cell Phones & Accessories",
                    0, 0,
                    JSON.stringify(images),
                    images[0],
                    description || null,
                    JSON.stringify(["New"])
                ]
            );
        }
    }

    console.log("Sync complete");
    await connection.end();
}

sync().catch(err => {
    console.error("Sync Failed:", err);
    process.exit(1);
});
