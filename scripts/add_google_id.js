require("dotenv").config({ path: "../.env" });
const mysql = require("mysql2");

const db = mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "bzr_db"
});

db.connect(err => {
    if (err) {
        console.error("Database connection failed:", err.message);
        process.exit(1);
    }
    console.log("Connected to database.");

    const alterQuery = "ALTER TABLE users ADD COLUMN google_id VARCHAR(255) DEFAULT NULL UNIQUE AFTER password";

    db.query(alterQuery, (err) => {
        if (err) {
            if (err.code === 'ER_DUP_COLUMN_NAME') {
                console.log("Column google_id already exists.");
            } else {
                console.error("Error adding column google_id:", err);
            }
        } else {
            console.log("Column google_id added successfully.");
        }
        db.end();
    });
});
