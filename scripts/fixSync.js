const mysql = require('mysql2/promise');
require('dotenv').config({ path: './backend/.env' });

async function fix() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || "localhost",
        user: process.env.DB_USER || "root",
        password: process.env.DB_PASSWORD || "1234",
        database: process.env.DB_NAME || "coolyourhome"
    });

    console.log("Connected to MySQL");

    // 1. Fix Motorola Edge 40 duplicate
    console.log("Fixing Motorola Edge 40...");
    const [motorolaNew] = await connection.execute("SELECT * FROM products WHERE id = 15");
    if (motorolaNew[0]) {
        await connection.execute(
            "UPDATE products SET images = ?, image_url = ?, description = ? WHERE id = 10",
            [motorolaNew[0].images, motorolaNew[0].image_url, motorolaNew[0].description]
        );
        await connection.execute("DELETE FROM products WHERE id = 15");
    }

    // 2. Fix Vivo duplicate
    console.log("Fixing Vivo...");
    const [vivoNew] = await connection.execute("SELECT * FROM products WHERE id = 19");
    if (vivoNew[0]) {
        await connection.execute(
            "UPDATE products SET name = ?, images = ?, image_url = ?, description = ? WHERE id = 8",
            ["Vivo X300 Pro", vivoNew[0].images, vivoNew[0].image_url, vivoNew[0].description]
        );
        await connection.execute("DELETE FROM products WHERE id = 19");
    }

    // 3. Fix Samsung Galaxy S24 Ultra (folder 'name-Samsung-Galaxy-S24-Ultr,' should match ID 3)
    // First, let's get the data from the folder 'name-Samsung-Galaxy-S24-Ultr,'
    // Wait, the sync script updated ID 1 with this data. We need to restore ID 1 and update ID 3.
    console.log("Fixing Samsung Galaxy S24 Ultra...");

    // Restore ID 1 from 'Samsung Galaxy S24' folder (which sync ran correctly but ID 1 was overwritten by the faulty match)
    // Actually, the sync script runs in order, so the LAST update wins.
    // 'Samsung Galaxy S24' folder was processed AFTER 'name-Samsung-Galaxy-S24-Ultr,'?
    // Let's check sync script order. folders = fs.readdirSync(IMAGES_DIR).
    // Let's just manually update ID 1 and ID 3 from their respective folders.

    const fs = require('fs');
    const path = require('path');
    const IMAGES_DIR = './public/images';

    const getFolderData = (folder) => {
        const folderPath = path.join(IMAGES_DIR, folder);
        const files = fs.readdirSync(folderPath);
        const images = files.filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f)).map(f => `/images/${folder}/${f}`);
        const txtFile = files.find(f => f.endsWith('.txt'));
        let description = "";
        if (txtFile) {
            const content = fs.readFileSync(path.join(folderPath, txtFile), 'utf8');
            const descMatch = content.match(/Product description\r?\n+([^\r\n]+)/i);
            if (descMatch) description = descMatch[1].trim();
            else {
                const aboutMatch = content.match(/About this item\r?\n+([\s\S]+?)(?=\r?\n\r?\n|$)/i);
                if (aboutMatch) description = aboutMatch[1].trim().replace(/\r?\n/g, ' ');
            }
        }
        return { images, description };
    };

    const s24 = getFolderData('Samsung Galaxy S24');
    const s24Ultra = getFolderData('name-Samsung-Galaxy-S24-Ultr,');

    await connection.execute(
        "UPDATE products SET images = ?, image_url = ?, description = ? WHERE id = 1",
        [JSON.stringify(s24.images), s24.images[0], s24.description]
    );

    await connection.execute(
        "UPDATE products SET images = ?, image_url = ?, description = ? WHERE id = 3",
        [JSON.stringify(s24Ultra.images), s24Ultra.images[0], s24Ultra.description]
    );

    console.log("Fix complete");
    await connection.end();
}

fix().catch(err => {
    console.error("Fix Failed:", err);
    process.exit(1);
});
