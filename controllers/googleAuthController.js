const { OAuth2Client } = require("google-auth-library");
const jwt = require("jsonwebtoken");
const axios = require("axios");
const { db, getUseDb } = require("../config/db");

const handleUserLoginOrRegister = (userData, res) => {
    const { googleId, email, name, picture } = userData;
    const useDb = getUseDb();

    if (!useDb) {
        console.log("Google Login/Callback: Running in memory mode");
        const token = jwt.sign(
            { id: 1, role: "user" },
            process.env.JWT_SECRET || "secret",
            { expiresIn: "1d" }
        );
        return res.json({
            token,
            user: { id: 1, email, name, picture, role: "user" }
        });
    }

    // Check if user exists with this googleId
    db.query("SELECT id, email, password, role, fullname AS name, phone, alternate_phone, google_id FROM users WHERE google_id = ?", [googleId], (err, results) => {
        if (err) {
            console.error("Google Login/Callback: DB Error (select by google_id):", err);
            return res.status(500).json({ error: err.message, details: err });
        }

        if (results.length > 0) {
            console.log("Google Login/Callback: User found by google_id");
            const user = results[0];
            const token = jwt.sign(
                { id: user.id, role: user.role },
                process.env.JWT_SECRET || "secret",
                { expiresIn: "1d" }
            );
            const { password: _, ...userWithoutPassword } = user;
            return res.json({ token, user: userWithoutPassword });
        } else {
            console.log("Google Login/Callback: User not found by google_id, checking email...");
            db.query("SELECT id, email, password, role, fullname AS name, phone, alternate_phone, google_id FROM users WHERE email = ?", [email], (err, emailResults) => {
                if (err) {
                    console.error("Google Login/Callback: DB Error (select by email):", err);
                    return res.status(500).json({ error: err.message, details: err });
                }

                if (emailResults.length > 0) {
                    console.log("Google Login/Callback: User found by email, linking google_id...");
                    const user = emailResults[0];
                    db.query("UPDATE users SET google_id = ? WHERE id = ?", [googleId, user.id], (updateErr) => {
                        if (updateErr) {
                            console.error("Google Login/Callback: DB Error (update google_id):", updateErr);
                            return res.status(500).json({ error: updateErr.message, details: updateErr });
                        }

                        const token = jwt.sign(
                            { id: user.id, role: user.role },
                            process.env.JWT_SECRET || "secret",
                            { expiresIn: "1d" }
                        );
                        const { password: _, ...userWithoutPassword } = user;
                        return res.json({ token, user: userWithoutPassword });
                    });
                } else {
                    console.log("Google Login/Callback: Creating new user...");
                    const newUser = {
                        email,
                        fullname: name,
                        google_id: googleId,
                        role: "user",
                        date_time: new Date()
                    };
                    db.query(
                        "INSERT INTO users (email, fullname, google_id, role, date_time) VALUES (?, ?, ?, ?, ?)",
                        [newUser.email, newUser.fullname, newUser.google_id, newUser.role, newUser.date_time],
                        (insertErr, insertResult) => {
                            if (insertErr) {
                                console.error("Google Login/Callback: DB Error (insert user):", insertErr);
                                return res.status(500).json({ error: insertErr.message, details: insertErr });
                            }

                            const token = jwt.sign(
                                { id: insertResult.insertId, role: newUser.role },
                                process.env.JWT_SECRET || "secret",
                                { expiresIn: "1d" }
                            );
                            res.json({
                                token,
                                user: { id: insertResult.insertId, email: newUser.email, name: newUser.fullname, role: newUser.role }
                            });
                        }
                    );
                }
            });
        }
    });
};

const googleLogin = async (req, res) => {
    try {
        const { idToken } = req.body;
        if (!idToken) {
            console.error("Google Login: ID Token is missing");
            return res.status(400).json({ message: "ID Token is required" });
        }

        console.log("Google Login: Verifying id token...");
        const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
        const ticket = await client.verifyIdToken({
            idToken,
            audience: process.env.GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();
        console.log("Google Login: Token verified. Payload:", payload);
        const { sub: googleId, email, name, picture } = payload;

        handleUserLoginOrRegister({ googleId, email, name, picture }, res);
    } catch (err) {
        console.error("Google Login Catch Error:", err);
        res.status(500).json({ message: "Internal server error", error: err.message });
    }
};

const googleAuth = (req, res) => {
    const client = new OAuth2Client(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_CALLBACK_URL
    );

    const url = client.generateAuthUrl({
        access_type: "offline",
        scope: ["https://www.googleapis.com/auth/userinfo.profile", "https://www.googleapis.com/auth/userinfo.email"],
    });

    res.redirect(url);
};

const googleCallback = async (req, res) => {
    try {
        const { code } = req.query;
        if (!code) {
            return res.status(400).json({ message: "Authorization code is missing" });
        }

        const client = new OAuth2Client(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            process.env.GOOGLE_CALLBACK_URL
        );

        const { tokens } = await client.getToken(code);
        client.setCredentials(tokens);

        const ticket = await client.verifyIdToken({
            idToken: tokens.id_token,
            audience: process.env.GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();
        const { sub: googleId, email, name, picture } = payload;

        // Note: For the callback flow, we might want to redirect with the token instead of sending JSON
        // But for now, let's keep it consistent or handle the redirect.
        
        // handleUserLoginOrRegister expects res.json(), which works for API tests.
        // For a real browser flow, we'd do:
        // const token = generateToken(user);
        // res.redirect(`${process.env.FRONTEND_URL}/login-success?token=${token}`);
        
        // Let's modify handleUserLoginOrRegister slightly or wrap it.
        // For now, I'll just use res.json and the user can decide how to handle the redirect on frontend if they use this.
        // Actually, if it's a redirect flow, the browser ends up at /api/google/callback.
        // Sending JSON there is okay for debugging, but usually you want a redirect.
        
        // I'll implement a redirect-friendly version.
        
        const userData = { googleId, email, name, picture };
        const useDb = getUseDb();
        
        const finalizeLogin = (user, token) => {
            const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
            res.redirect(`${frontendUrl}/login?token=${token}`);
        };

        if (!useDb) {
            const token = jwt.sign({ id: 1, role: "user" }, process.env.JWT_SECRET || "secret", { expiresIn: "1d" });
            return finalizeLogin({ id: 1, email, name, picture, role: "user" }, token);
        }

        db.query("SELECT id, email, role, fullname AS name, google_id FROM users WHERE google_id = ?", [googleId], (err, results) => {
            if (err || results.length === 0) {
                // Check email logic... (omitted for brevity in this block, but should be complete)
                // For simplicity in this implementation, if not found by googleId, we'll try email or create.
                db.query("SELECT id, email, role, fullname AS name FROM users WHERE email = ?", [email], (err, emailResults) => {
                    if (emailResults && emailResults.length > 0) {
                        const user = emailResults[0];
                        db.query("UPDATE users SET google_id = ? WHERE id = ?", [googleId, user.id], () => {
                            const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET || "secret", { expiresIn: "1d" });
                            finalizeLogin(user, token);
                        });
                    } else {
                        const newUser = { email, fullname: name, google_id: googleId, role: "user", date_time: new Date() };
                        db.query("INSERT INTO users (email, fullname, google_id, role, date_time) VALUES (?, ?, ?, ?, ?)", 
                            [newUser.email, newUser.fullname, newUser.google_id, newUser.role, newUser.date_time], 
                            (err, result) => {
                                const token = jwt.sign({ id: result.insertId, role: newUser.role }, process.env.JWT_SECRET || "secret", { expiresIn: "1d" });
                                finalizeLogin(newUser, token);
                            });
                    }
                });
            } else {
                const user = results[0];
                const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET || "secret", { expiresIn: "1d" });
                finalizeLogin(user, token);
            }
        });

    } catch (err) {
        console.error("Google Callback Catch Error:", err);
        res.status(500).send("Internal server error during Google login");
    }
};

module.exports = { googleLogin, googleAuth, googleCallback };
