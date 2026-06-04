const mysql = require("mysql2");

let useDb = true;

const pool = mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "bzr_db",

    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,

    connectTimeout: 10000
});

// Test connection
pool.getConnection((err, connection) => {
    if (err) {
        console.log("Database connection failed:", err.message);
        console.log("Database connection failed:", err);
        console.log("Running in memory mode.");
        useDb = false;
    } else {
        console.log("MySQL Connected (Pool)");
        connection.release();
    }
});

// Optional: keep connection alive (prevents timeout)
setInterval(() => {
    if (useDb) {
        pool.query("SELECT 1", (err) => {
            if (err) {
                console.log("Keep-alive failed:", err.message);
            }
        });
    }
}, 5000);

module.exports = { db: pool, getUseDb: () => useDb };
