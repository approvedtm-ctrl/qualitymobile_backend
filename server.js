require("dotenv").config();
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const authRoutes = require("./routes/authRoutes");
const productRoutes = require("./routes/productRoutes");
const orderRoutes = require("./routes/orderRoutes");
const stripeRoutes = require("./routes/stripeRoutes");
const btcpayRoutes = require("./routes/btcpayRoutes");
const nowpaymentsRoutes = require("./routes/nowpaymentsRoutes");
const wooRoutes = require("./routes/wooRoutes");
const cartRoutes = require("./routes/cartRoutes");

const app = express();

const allowedOrigins = [
   process.env.FRONTEND_URL,
   "http://localhost:3000",
   "http://localhost:64952",
   "http://localhost:5173",
   'http://darkgreen-wallaby-121005.hostingersite.com',
   'http://shop.qualitymobileshop.de',
   'http://next.qualitymobileshop.de'
];

app.use(
   cors({
      origin: function (origin, callback) {
         // allow requests with no origin (like Postman)
         if (!origin) return callback(null, true);

         if (allowedOrigins.includes(origin)) {
            return callback(null, true);
         } else {
            return callback(new Error("Not allowed by CORS"));
         }
      },
      methods: ["GET", "POST", "PUT", "DELETE"],
      credentials: true,
   })
);

app.use(express.json());
app.use("/images", express.static(path.join(__dirname, "../public/images")));

// Set Cross-Origin-Opener-Policy for Google Auth
app.use((req, res, next) => {
   res.setHeader("Cross-Origin-Opener-Policy", "unsafe-none");
   next();
});

/* ===========================
   ROUTES
=========================== */

app.use("/api", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api", stripeRoutes);
// app.use("/api/btcpay", btcpayRoutes);
app.use("/api/nowpayments", nowpaymentsRoutes);
app.use("/api/wc", wooRoutes);
app.use("/api/cart", cartRoutes);

// Multer Config
const storage = multer.diskStorage({
   destination: function (req, file, cb) {
      const brand = req.body.brand || "General";
      const dir = path.join(__dirname, "../public/images", brand);

      if (!fs.existsSync(dir)) {
         fs.mkdirSync(dir, { recursive: true });
      }
      cb(null, dir);
   },
   filename: function (req, file, cb) {
      // Sanitize filename to prevent issues
      const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_");
      cb(null, Date.now() + '-' + safeName);
   }
});
const upload = multer({ storage: storage });

app.post("/api/upload", upload.single("image"), (req, res) => {
   if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
   }

   const brand = req.body.brand || "General";
   // The path accessible by frontend relative to public/
   const imageUrl = `/images/${brand}/${req.file.filename}`;
   res.json({ url: imageUrl, message: "File uploaded successfully" });
});



// 27-04-2026
const { db, getUseDb } = require("./config/db");
app.post("/create-invoice", async (req, res) => {
   try {


      const { id, price_amount } = req.body;

      const response = await fetch("https://api.nowpayments.io/v1/invoice", {
         method: "POST",
         headers: {
            "x-api-key": process.env.NowPayments_API_Key,
            "Content-Type": "application/json"
         },
         body: JSON.stringify({
            price_amount: price_amount,
            price_currency: "usd",
            order_id: id,
            order_description: "Apple Macbook Pro 2019 x 1",
            ipn_callback_url: "https://nowpayments.io",
            success_url: "https://bzr-coolyourhome-backend.onrender.com/success?id=" + id + "&price=" + price_amount,
            cancel_url: "https://bzr-coolyourhome-backend.onrender.com/cancel"
         })
      });




      const data = await response.json();

      // send invoice_url to frontend
      res.json({ invoice_url: data.invoice_url });

   } catch (err) {
      res.status(500).json({ error: err.message });
   }
});











app.post("/createBtcpayInvoice", async (req, res) => {
   try {
      const { cart, deliveryAddress, user, rate } = req.body;

      const parsedCart =
         typeof cart === "string" ? JSON.parse(cart) : cart;

      let orderAmount = 0;

      parsedCart.items.forEach((item) => {
         orderAmount +=
            parseInt(item.price || "0", 10) *
            (item.quantity || 1);
      });

      orderAmount = ((orderAmount / rate) * 100) / 9565;

      const userId = Number(user.id);
      const userBalance = Number(user.balance);
      console.log("userr balance"); console.log(user.balance);
      // userId = parseInt(user.id, 10);
      const orderProductJson = JSON.stringify(parsedCart.items);
      db.query(
         "SELECT balance FROM users WHERE id = ?",
         [userId],
         (err, results) => {
            if (err) {
               return res.status(500).json({
                  success: false,
                  message: err.message,
               });
            }

            if (results.length === 0) {
               return res.status(404).json({
                  success: false,
                  message: "User not found",
               });
            }

            const userBalance = parseFloat(results[0].balance);




            const checkSql = `
      SELECT id
      FROM orders
      WHERE customer_id = ?
      LIMIT 1
    `;

            db.query(checkSql, [user.id], (err, rows) => {
               if (err) {
                  console.error(err);
                  return res.status(500).json({
                     success: false,
                     error: err.message
                  });
               }

               let discountApplied = false;

               // If NO previous order → apply 40% discount
               if (rows.length === 0) {
                  console.log("actual order amount");
                  console.log(orderAmount);
                  orderAmount = orderAmount * 0.6;
                  console.log("40% off"); console.log(orderAmount);
                  if (userBalance >= orderAmount) {
                     db.query(
                        "UPDATE users SET  balance = balance - ? WHERE id = ?",
                        [orderAmount, userId],
                        (err) => {
                           if (err) {
                              return res.status(500).json({
                                 success: false,
                                 message: err.message,
                              });
                           }


                           const orderProduct = JSON.stringify(parsedCart.items);

                           const sql = `
      INSERT INTO orders
      (
        customer_id,
        user_email,
        total,
        status,
        order_date,
        order_product,

        paid
      )
      VALUES (?, ?, ?, ?, ?, ?,?)
    `;

                           const values = [
                              user.id,                         // customer_id
                              user.email,                      // user_email
                              orderAmount || "0",               // total
                              "pending",                       // status
                              new Date().toISOString(),        // order_date
                              orderProductJson,
                              "paid"                  // order_product JSON
                           ];

                           db.query(sql, values, (err, result) => {
                              if (err) {
                                 console.error("Insert error:", err);

                                 return res.status(500).json({
                                    success: false,
                                    error: err.message
                                 });
                              }



                              console.log("Order inserted. ID:", result.insertId);



                              const orderId = results.insertId;
                              console.log(
                                 "Order inserted. ID:",
                                 orderId
                              );

                              //  const orderId = result.insertId;

                              db.query(
                                 `INSERT INTO delivery 
     (order_id, delivery_address, delivery_status)
     VALUES (?, ?, ?)`,
                                 [
                                    orderId,
                                    deliveryAddress.address || "",
                                    "Pending",
                                 ],
                                 (err, deliveryResult) => {
                                    if (err) {
                                       console.error(
                                          "Insert delivery error:",
                                          err
                                       );

                                       return res.status(500).json({
                                          success: false,
                                          message: err.message,
                                       });
                                    }

                                    console.log(
                                       "Delivery inserted:",
                                       deliveryResult.insertId
                                    );



                                 });

                           });


                           db.query(
                              "SELECT id, fullname, email, balance FROM users WHERE id = ?",
                              [userId],
                              (err, results) => {
                                 if (err) {
                                    return res.status(500).json({
                                       success: false,
                                       message: err.message,
                                    });
                                 }

                                 return res.json({
                                    success: true,
                                    message: "Order placed successfully",
                                    user: results[0],
                                 });
                              }
                           );
                        }
                     );
                  } else {
                     return res.json({
                        success: false,
                        message: "Require more balance",
                     });
                  }


                  // reduce 40%
                  discountApplied = true;
               }

               else {
                  if (userBalance >= orderAmount) {
                     db.query(
                        "UPDATE users SET  balance = balance - ? WHERE id = ?",
                        [orderAmount, userId],
                        (err) => {
                           if (err) {
                              return res.status(500).json({
                                 success: false,
                                 message: err.message,
                              });
                           }


                           const orderProduct = JSON.stringify(parsedCart.items);


                           const sql = `
      INSERT INTO orders
      (
        customer_id,
        user_email,
        total,
        status,
        order_date,
        order_product,

        paid
      )
      VALUES (?, ?, ?, ?, ?, ?,?)
    `;

                           const values = [
                              user.id,                         // customer_id
                              user.email,                      // user_email
                              orderAmount || "0",               // total
                              "pending",                       // status
                              new Date().toISOString(),        // order_date
                              orderProductJson,
                              "paid"                  // order_product JSON
                           ];

                           db.query(sql, values, (err, result) => {
                              if (err) {
                                 console.error("Insert error:", err);

                                 return res.status(500).json({
                                    success: false,
                                    error: err.message
                                 });
                              }

                              console.log("Order inserted. ID:", result.insertId);


                              const orderId = results.insertId;
                              console.log(
                                 "Order inserted. ID:",
                                 orderId
                              );

                              //  const orderId = result.insertId;

                              db.query(
                                 `INSERT INTO delivery 
     (order_id, delivery_address, delivery_status)
     VALUES (?, ?, ?)`,
                                 [
                                    result.insertId,
                                    deliveryAddress.address || "",
                                    "Pending",
                                 ],
                                 (err, deliveryResult) => {
                                    if (err) {
                                       console.error(
                                          "Insert delivery error:",
                                          err
                                       );

                                       return res.status(500).json({
                                          success: false,
                                          message: err.message,
                                       });
                                    }

                                    console.log(
                                       "Delivery inserted:",
                                       deliveryResult.insertId
                                    );



                                 });



                           });




                           db.query(
                              "SELECT id, fullname, email, balance FROM users WHERE id = ?",
                              [userId],
                              (err, results) => {
                                 if (err) {
                                    return res.status(500).json({
                                       success: false,
                                       message: err.message,
                                    });
                                 }

                                 return res.json({
                                    success: true,
                                    message: "Order placed successfully",
                                    user: results[0],
                                 });
                              }
                           );
                        }
                     );
                  } else {
                     return res.json({
                        success: false,
                        message: "Require more balance",
                     });
                  }


               }
            });













         }
      );

   } catch (error) {
      console.error("MAIN ERROR:", error);
      return res.status(500).json({
         success: false,
         message: error.message,
      });
   }
});










app.get("/success", (req, res) => {
   const { id, price } = req.query;

   if (!id || !price) {
      return res.status(400).json({ error: "Missing id or price" });
   }

   const userId = parseInt(id, 10);
   const amount = parseFloat(price);

   if (isNaN(userId) || isNaN(amount)) {
      return res.status(400).json({ error: "Invalid id or price" });
   }

   db.query(
      "UPDATE users SET balance = balance + ? WHERE id = ?",
      [amount, userId],
      (err) => {
         if (err) {
            console.error("BALANCE UPDATE ERROR:", err);
            return res.status(500).json({ error: err.message });
         }

         // fetch updated user
         db.query(
            "SELECT id, fullname, email, balance FROM users WHERE id = ?",
            [userId],
            (err, results) => {
               if (err) {
                  return res.status(500).json({ error: err.message });
               }

               if (results.length === 0) {
                  return res.status(404).json({ error: "User not found" });
               }

               res.json({
                  message: "Balance updated successfully",
                  user: results[0]
               });
            }
         );
      }
   );
});

const API_KEY = process.env.MAXELPAY_API_KEY;

app.post("/create_payment", async (req, res) => {
   try {
      const { id, price_amount } = req.body;
      console.log("price");
      console.log(price_amount);


      const paymentData = {
         orderId: "order_123",
         amount: price_amount,
         currency: "USD",
         description: "Order #123 - Premium Package",
         successUrl: `https://bzr-coolyourhome-backend.onrender.com/success?id=${id}&price=${price_amount}`,
         cancelUrl: "https://yoursite.com/cancel",
         callbackUrl: "https://yoursite.com/webhook"
      };

      const response = await fetch(
         "https://api.maxelpay.com/api/v1/payments/sessions",
         {
            method: "POST",
            headers: {
               "X-API-KEY": API_KEY,
               "Content-Type": "application/json"
            },
            body: JSON.stringify(paymentData)
         }
      );

      const data = await response.json();
      console.log(data);
      res.json(data);

   } catch (error) {
      console.error(error);

      res.status(500).json({
         success: false,
         error: error.message
      });
   }
});



// 23.5.2026
app.get("/product/:id", (req, res) => {
   const { id } = req.params;

   db.getConnection((connErr, connection) => {
      if (connErr) {
         console.error(connErr);
         return res.status(500).json(connErr);
      }

      const query = `
      SELECT 
        *
      FROM products
      WHERE id = ?
    `;

      connection.query(query, [id], (err, result) => {
         connection.release();

         if (err) {
            console.error(err);
            return res.status(500).json(err);
         }

         if (result.length === 0) {
            return res.status(404).json({
               success: false,
               message: "Product not found"
            });
         }

         const product = result[0];

         // convert images string → array (VERY IMPORTANT)
         try {
            product.images = JSON.parse(product.images);
         } catch (e) {
            product.images = [];
         }

         return res.json({
            success: true,
            product
         });
      });
   });
});


// Controller
const getTrackOrders = (req, res) => {
   const { userid } = req.params;

   db.getConnection((connErr, connection) => {
      if (connErr) {
         console.error("Connection Error:", connErr);
         return res.status(500).json({
            success: false,
            error: connErr.message,
         });
      }

      const query = `
      SELECT 
        orders.id,
        orders.customer_id,
        orders.user_email,
        orders.total,
        orders.status,
        orders.order_date,
        orders.order_product,
        orders.paid,
        orders.recieved,
        users.fullname,
        users.email,
        delivery.delivery_date AS delivery_date
      FROM orders
      INNER JOIN users
        ON users.id = orders.customer_id
      LEFT JOIN delivery
        ON orders.id = delivery.order_id
      WHERE orders.customer_id = ?
        AND orders.recieved = 0
      ORDER BY orders.id DESC
    `;

      connection.query(query, [userid], (err, results) => {
         connection.release();

         if (err) {
            console.error("Query Error:", err);
            return res.status(500).json({
               success: false,
               error: err.message,
            });
         }

         console.log("TRACK RESULTS:", results);

         return res.json({
            success: true,
            totalOrders: results.length,
            orders: results,
         });
      });
   });
};

app.get("/track-orders/:userid", getTrackOrders);





// GET all orders + delivery
const getDeliveries = (req, res) => {
   db.getConnection((connErr, connection) => {
      if (connErr) {
         console.error(connErr);
         return res.status(500).json(connErr);
      }

      const query = `
      SELECT
        orders.id,
        orders.customer_id,
        orders.user_email,
        orders.total,
        orders.status,
        orders.order_date,
        orders.order_product,
        orders.paid,
        orders.recieved,

        delivery.delivery_id,
        delivery.order_id,
        delivery.delivery_address,
        delivery.delivery_partner,
        delivery.tracking_number,
        delivery.delivery_status,
        delivery.delivery_date

      FROM orders
      INNER JOIN delivery
      ON orders.id = delivery.order_id
      ORDER BY orders.id DESC
    `;

      connection.query(query, (err, results) => {
         connection.release();

         if (err) {
            console.error(err);
            return res.status(500).json(err);
         }

         res.json({
            success: true,
            deliveries: results,
         });
      });
   });
};

// UPDATE delivery date
const updateDeliveryDate = (req, res) => {
   const { delivery_id } = req.params;
   const { delivery_date } = req.body;

   db.getConnection((connErr, connection) => {
      if (connErr) {
         return res.status(500).json(connErr);
      }

      const query = `
      UPDATE delivery
      SET delivery_date = ?
      WHERE delivery_id = ?
    `;

      connection.query(
         query,
         [delivery_date, delivery_id],
         (err, result) => {
            connection.release();

            if (err) {
               console.error(err);
               return res.status(500).json(err);
            }

            res.json({
               success: true,
               message: "Delivery date updated successfully",
            });
         }
      );
   });
};


app.get("/api/test", (req, res) => {
   res.json({
      message: "testing quality mobile shop"
   });
});



app.get("/all-deliveries", getDeliveries);
app.put("/update-delivery-date/:delivery_id", updateDeliveryDate);
/* ===========================
   SERVER START
=========================== */

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
   console.log("Server running on port " + PORT);
});