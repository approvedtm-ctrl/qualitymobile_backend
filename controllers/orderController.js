const { db, getUseDb } = require("../config/db");
const { SAMPLE_ORDERS } = require("../utils/demoData");
const ordersCache = [];
const nodemailer = require("nodemailer");

const createOrder = (req, res) => {
    const { cart, user_email, total, customer_id, order_date, items, delivery_address } = req.body;
    const useDb = getUseDb();

    //console.log(items);
    const parsedCart =
        typeof cart === "string" ? JSON.parse(cart) : cart;

    const orderProductJson = JSON.stringify(parsedCart.items);

    console.log("order product json"); console.log(orderProductJson);
    //console.log(user_email);
    db.getConnection((connErr, connection) => {
        if (connErr) {
            console.error("Get Connection Error:", connErr);
            return res.status(500).json(connErr);
        }

        const query = `
      SELECT u.id, u.fullname, u.email
      FROM users u
      LEFT JOIN orders o 
        ON CAST(u.id AS CHAR) = o.customer_id
      WHERE o.customer_id IS NULL
        AND u.id = ?
    `;

        connection.query(query, [customer_id], (err, users) => {
            connection.release();

            if (err) {
                console.error("Query Error:", err);
                return res.status(500).json(err);
            }

            // Send main response only ONCE


            // If no eligible user, stop here
            if (users.length === 0) {
                console.log("User already has orders or not found");
                //return;
            }

            const user = users[0];

            /* const transporter = nodemailer.createTransport({
               service: "gmail",
               auth: {
                user: "aniketkumarsaha5@gmail.com",
                               pass: "elee suee lpvy miiz",
               }
             });
       */

            const transporter = nodemailer.createTransport({
                host: "smtp.gmail.com",
                port: 587,
                secure: false, // IMPORTANT for port 587
                auth: {
                    user: "aniketkumarsaha5@gmail.com",
                    pass: "elee suee lpvy miiz",
                },
                tls: {
                    rejectUnauthorized: false
                },
                connectionTimeout: 10000,
                greetingTimeout: 10000,
                socketTimeout: 10000,
            });

            const mailOptions = {
                from: "aniketkumarsaha5@gmail.com",
                to: user_email,
                subject: "🎉 Take Benefit of 40% Discount!",
                html: `
          <div style="font-family: Arial; padding:20px;">
            <h2>Hello ${user_email},</h2>
            <p>Good news! You qualify for a special offer.</p>
            <h3 style="color:green;">Get 40% OFF on your first order!</h3>
            <p>Use this discount today and shop now.</p>
            <a href="https://qualitymobileshop.de/"
               style="display:inline-block;
                      padding:12px 20px;
                      background:#007bff;
                      color:white;
                      text-decoration:none;
                      border-radius:5px;">
                Shop Now
            </a>
          </div>
        `
            };

            // Send email in background (NO res.json here)
            transporter.sendMail(mailOptions)
                .then(() => {
                    console.log(`Discount email sent to: ${user_email}`);
                })
                .catch((mailErr) => {
                    console.error("Mail Error:", mailErr);
                });
        });
    });




















    if (!useDb) {
        const id = ordersCache.length + 1;
        ordersCache.push({
            id,
            user_email,
            total,
            customer_id: customer_id || null,
            order_date: order_date || new Date().toISOString(),
            status: "Pending",
            items: items || [],
            delivery: {
                delivery_address: delivery_address || "",
                delivery_status: "Pending"
            }
        });
        return res.json({ message: "Order created (memory)", id });
    }

    db.getConnection((connErr, connection) => {
        if (connErr) {
            console.error("Get Connection Error:", connErr);
            return res.status(500).json(connErr);
        }

        connection.beginTransaction(err => {
            if (err) {
                connection.release();
                console.error("Transaction Error:", err);
                return res.status(500).json(err);
            }

            connection.query(
                "INSERT INTO orders (user_email,total,status,customer_id,order_date,order_product) VALUES (?,?,?,?,?,?)",
                [user_email, total, "Pending", customer_id || null, order_date || new Date(), orderProductJson],
                (err, results) => {
                    if (err) {
                        return connection.rollback(() => {
                            connection.release();
                            console.error("Create Order DB Error:", err);
                            res.status(500).json(err);
                        });
                    }

                    const orderId = results.insertId;

                    if (items && items.length > 0) {
                        const values = items.map(item => [orderId, item.product_id, item.quantity, item.price]);
                        connection.query(
                            "INSERT INTO order_items (order_id, product_id, quantity, price) VALUES ?",
                            [values],
                            err => {
                                if (err) {
                                    return connection.rollback(() => {
                                        connection.release();
                                        console.error("Insert Order Items Error:", err);
                                        res.status(500).json(err);
                                    });
                                }

                                // 2. Insert into delivery
                                connection.query(
                                    "INSERT INTO delivery (order_id, delivery_address, delivery_status) VALUES (?, ?, ?)",
                                    [orderId, delivery_address || "", "Pending"],
                                    err => {
                                        if (err) {
                                            return connection.rollback(() => {
                                                connection.release();
                                                console.error("Insert Delivery Error:", err);
                                                res.status(500).json(err);
                                            });
                                        }
                                        connection.commit(err => {
                                            if (err) return connection.rollback(() => {
                                                connection.release();
                                                res.status(500).json(err);
                                            });
                                            connection.release();
                                            res.json({ message: "Order created", id: orderId });
                                        });
                                    }
                                );
                            }
                        );
                    } else {
                        // Even if no items (shouldn't happen with cart), create delivery record
                        connection.query(
                            "INSERT INTO delivery (order_id, delivery_address, delivery_status) VALUES (?, ?, ?)",
                            [orderId, delivery_address || "", "Pending"],
                            err => {
                                if (err) {
                                    return connection.rollback(() => {
                                        connection.release();
                                        console.error("Insert Delivery (No Items) Error:", err);
                                        res.status(500).json(err);
                                    });
                                }
                                connection.commit(err => {
                                    if (err) return connection.rollback(() => {
                                        connection.release();
                                        res.status(500).json(err);
                                    });
                                    connection.release();
                                    res.json({ message: "Order created", id: orderId });
                                });
                            }
                        );
                    }
                }
            );
        });
    });
};

const getOrders = (req, res) => {
    const useDb = getUseDb();

    if (!useDb) {
        if (ordersCache.length === 0) {
            ordersCache.push(...SAMPLE_ORDERS);
        }
        return res.json(ordersCache);
    }

    const query = `
        SELECT o.*, 
               oi.product_id, oi.quantity, oi.price AS item_price, p.name AS product_name,
               d.delivery_address, d.delivery_partner, d.tracking_number, d.delivery_status, d.delivery_date
        FROM orders o
        LEFT JOIN order_items oi ON o.id = oi.order_id
        LEFT JOIN products p ON oi.product_id = p.id
        LEFT JOIN delivery d ON o.id = d.order_id
    `;

    db.query(query, (err, results) => {
        if (err) {
            console.error("Get Orders Error:", err);
            return res.status(500).json(err);
        }

        const ordersMap = {};
        results.forEach(row => {
            if (!ordersMap[row.id]) {
                ordersMap[row.id] = {
                    id: row.id,
                    customer_id: row.customer_id,
                    user_email: row.user_email,
                    total: row.total,
                    status: row.status,
                    order_date: row.order_date,
                    items: [],
                    delivery: {
                        address: row.delivery_address,
                        partner: row.delivery_partner,
                        tracking_number: row.tracking_number,
                        status: row.delivery_status,
                        date: row.delivery_date
                    }
                };
            }
            if (row.product_id) {
                ordersMap[row.id].items.push({
                    product_id: row.product_id,
                    product_name: row.product_name,
                    quantity: row.quantity,
                    price: row.item_price
                });
            }
        });

        // Sort in memory to avoid MySQL temporary table size limit issues on shared hosting
        res.json(Object.values(ordersMap).sort((a, b) => b.id - a.id));
    });
};

const updateOrderStatus = (req, res) => {
    const { status } = req.body;
    const useDb = getUseDb();

    if (!useDb) {
        const order = ordersCache.find(o => o.id == req.params.id);
        if (order) order.status = status;
        return res.json({ message: "Updated (memory)" });
    }

    db.query(
        "UPDATE orders SET status=? WHERE id=?",
        [status, req.params.id],
        err => {
            if (err) {
                console.error("Update Order Status DB Error:", err);
                return res.status(500).json(err);
            }
            res.json({ message: "Status Updated" });
        }
    );
};

const getMyOrders = (req, res) => {
    const { email } = req.params;
    const useDb = getUseDb();

    if (!useDb) {
        return res.json(ordersCache.filter(o => o.user_email === email));
    }

    const query = `
        SELECT o.*, 
               oi.product_id, oi.quantity, oi.price AS item_price, p.name AS product_name,
               d.delivery_address, d.delivery_partner, d.tracking_number, d.delivery_status, d.delivery_date
        FROM orders o
        LEFT JOIN order_items oi ON o.id = oi.order_id
        LEFT JOIN products p ON oi.product_id = p.id
        LEFT JOIN delivery d ON o.id = d.order_id
        WHERE o.user_email = ?
    `;

    db.query(query, [email], (err, results) => {
        if (err) {
            console.error("Get My Orders Error:", err);
            return res.status(500).json(err);
        }

        const ordersMap = {};
        results.forEach(row => {
            if (!ordersMap[row.id]) {
                ordersMap[row.id] = {
                    id: row.id,
                    customer_id: row.customer_id,
                    user_email: row.user_email,
                    total: row.total,
                    status: row.status,
                    order_date: row.order_date,
                    items: [],
                    delivery: {
                        address: row.delivery_address,
                        partner: row.delivery_partner,
                        tracking_number: row.tracking_number,
                        status: row.delivery_status,
                        date: row.delivery_date
                    }
                };
            }
            if (row.product_id) {
                ordersMap[row.id].items.push({
                    product_id: row.product_id,
                    product_name: row.product_name,
                    quantity: row.quantity,
                    price: row.item_price
                });
            }
        });

        // Sort in memory to avoid MySQL temporary table size limit issues on shared hosting
        res.json(Object.values(ordersMap).sort((a, b) => b.id - a.id));
    });
};

const updateDeliveryDetails = (req, res) => {
    const { id } = req.params; // order_id
    const { delivery_partner, tracking_number, delivery_status, delivery_date } = req.body;
    const useDb = getUseDb();

    if (!useDb) {
        const order = ordersCache.find(o => o.id == id);
        if (order && order.delivery) {
            if (delivery_partner !== undefined) order.delivery.partner = delivery_partner;
            if (tracking_number !== undefined) order.delivery.tracking_number = tracking_number;
            if (delivery_status !== undefined) order.delivery.status = delivery_status;
            if (delivery_date !== undefined) order.delivery.date = delivery_date;
        }
        return res.json({ message: "Delivery updated (memory)" });
    }

    db.query(
        `UPDATE delivery SET 
        delivery_partner = ?, tracking_number = ?, delivery_status = ?, delivery_date = ?
        WHERE order_id = ?`,
        [delivery_partner, tracking_number, delivery_status, delivery_date, id],
        err => {
            if (err) {
                console.error("Update Delivery DB Error:", err);
                return res.status(500).json(err);
            }
            res.json({ message: "Delivery details updated successfully" });
        }
    );
};

module.exports = { createOrder, getOrders, updateOrderStatus, getMyOrders, updateDeliveryDetails };
