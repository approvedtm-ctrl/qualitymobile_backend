const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const axios = require("axios");
const { db, getUseDb } = require("../config/db");

const register = async (req, res) => {
    try {
        const { email, password, role, name } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required" });
        }

        const hashed = await bcrypt.hash(password, 10);
        const useDb = getUseDb();

        if (!useDb) {
            return res.json({ message: "User Registered (memory mode)" });
        }

        db.query(
            "INSERT INTO users (email,password,role,fullname,date_time) VALUES (?,?,?,?,?)",
            [email, hashed, role || "user", name || "User", new Date()],
            err => {
                if (err) {
                    if (err.code === 'ER_DUP_ENTRY') {
                        return res.status(400).json({ message: "Email already exists" });
                    }
                    console.error("Register Error:", err);
                    return res.status(500).json(err);
                }
                res.json({ message: "User Registered Successfully" });
            }
        );
    } catch (err) {
        res.status(500).json(err);
    }
};

const login = async (req, res) => {
    const { email, password } = req.body;

    const useDb = getUseDb();
    if (!useDb) {
        return res.json({
            token: "demo_token",
            user: { id: 1, email, role: "user", name: "Demo User" }
        });
    }

    db.query(
        "SELECT id, email, password, role, fullname AS name, phone, alternate_phone FROM users WHERE email=?",
        [email],
        async (err, results) => {
            if (results.length === 0)
                return res.status(404).json({ message: "User not found" });

            const valid = await bcrypt.compare(
                password,
                results[0].password
            );

            if (!valid)
                return res.status(401).json({ message: "Wrong password" });

            const token = jwt.sign(
                { id: results[0].id, role: results[0].role },
                process.env.JWT_SECRET || "secret",
                { expiresIn: "1d" }
            );

            const { password: _, ...userWithoutPassword } = results[0];
            res.json({ token, user: userWithoutPassword });
        }
    );
};

const getMe = (req, res) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Unauthorized" });

    jwt.verify(token, process.env.JWT_SECRET || "secret", (err, decoded) => {
        if (err) {
            console.error("JWT Verify Error:", err);
            return res.status(401).json({ message: "Invalid token" });
        }

        const useDb = getUseDb();
        if (!useDb) {
            return res.json({ id: 1, email: "demo@bzr.com", role: "user", name: "Demo User" });
        }

        db.query("SELECT id, email, role, fullname AS name, phone, alternate_phone, balance FROM users WHERE id=?", [decoded.id], (err, results) => {
            if (err) {
                console.error("GetMe DB Error:", err);
                return res.status(500).json(err);
            }
            if (results.length === 0) return res.status(404).json({ message: "User not found" });
            res.json(results[0]);
        });
    });
};

const getAdmins = (req, res) => {
    const useDb = getUseDb();
    if (!useDb) {
        return res.json([{ id: 1, email: "admin@bzr.com", role: "admin", name: "Demo Admin" }]);
    }

    db.query("SELECT id, email, role, fullname AS name FROM users WHERE role='admin'", (err, results) => {
        if (err) {
            console.error("Get Admins Error:", err);
            return res.status(500).json(err);
        }
        res.json(results);
    });
};

const addAdmin = async (req, res) => {
    try {
        const { email, password, name } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required" });
        }

        const hashed = await bcrypt.hash(password, 10);
        const useDb = getUseDb();

        if (!useDb) {
            return res.json({ message: "Admin added (memory mode)" });
        }

        db.query(
            "INSERT INTO users (email,password,role,fullname,date_time) VALUES (?,?,?,?,?)",
            [email, hashed, "admin", name || "Admin User", new Date()],
            err => {
                if (err) {
                    if (err.code === 'ER_DUP_ENTRY') {
                        return res.status(400).json({ message: "Email already exists" });
                    }
                    console.error("Add Admin Error:", err);
                    return res.status(500).json(err);
                }
                res.json({ message: "Admin Added Successfully" });
            }
        );
    } catch (err) {
        res.status(500).json(err);
    }
};

const removeAdmin = (req, res) => {
    const { id } = req.params;
    const useDb = getUseDb();

    if (!useDb) {
        return res.json({ message: "Admin removed (memory mode)" });
    }

    // Rather than deleting, downgrade to user to preserve history, or delete depending on requirements.
    // Let's delete to keep it simple, or downgrade.
    db.query("DELETE FROM users WHERE id = ? AND role = 'admin'", [id], err => {
        if (err) {
            console.error("Remove Admin Error:", err);
            return res.status(500).json(err);
        }
        res.json({ message: "Admin removed successfully" });
    });
};

const editAdmin = async (req, res) => {
    try {
        const { id } = req.params;
        const { email, password, name } = req.body;
        const useDb = getUseDb();

        if (!useDb) {
            return res.json({ message: "Admin updated (memory mode)" });
        }

        if (password) {
            const hashed = await bcrypt.hash(password, 10);
            db.query(
                "UPDATE users SET email=?, password=?, fullname=? WHERE id=? AND role='admin'",
                [email, hashed, name, id],
                err => {
                    if (err) return res.status(500).json(err);
                    res.json({ message: "Admin Updated Successfully" });
                }
            );
        } else {
            db.query(
                "UPDATE users SET email=?, fullname=? WHERE id=? AND role='admin'",
                [email, name, id],
                err => {
                    if (err) return res.status(500).json(err);
                    res.json({ message: "Admin Updated Successfully" });
                }
            );
        }
    } catch (err) {
        res.status(500).json(err);
    }
};

const updateMe = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        if (!token) return res.status(401).json({ message: "Unauthorized" });

        jwt.verify(token, process.env.JWT_SECRET || "secret", async (err, decoded) => {
            if (err) return res.status(401).json({ message: "Invalid token" });

            const { name, email, phone, alternate_phone } = req.body;
            const useDb = getUseDb();

            if (!useDb) {
                return res.json({ message: "User updated (memory mode)" });
            }

            db.query(
                "UPDATE users SET fullname=?, email=?, phone=?, alternate_phone=? WHERE id=?",
                [name, email, phone, alternate_phone, decoded.id],
                err => {
                    if (err) return res.status(500).json(err);
                    res.json({ message: "Profile Updated Successfully" });
                }
            );
        });
    } catch (err) {
        res.status(500).json(err);
    }
};

module.exports = { register, login, getMe, getAdmins, addAdmin, removeAdmin, editAdmin, updateMe };
