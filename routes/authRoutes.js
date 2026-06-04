const express = require("express");
const router = express.Router();
const { register, login, getMe, getAdmins, addAdmin, removeAdmin, editAdmin, updateMe } = require("../controllers/authController");
const { googleLogin, googleAuth, googleCallback } = require("../controllers/googleAuthController");

router.post("/register", register);
router.post("/login", login);
router.post("/google-login", googleLogin);
router.get("/google/auth", googleAuth);
router.get("/google/callback", googleCallback);
router.get("/me", getMe);
router.put("/me", updateMe);
router.get("/admins", getAdmins);
router.post("/admins", addAdmin);
router.put("/admins/:id", editAdmin);
router.delete("/admins/:id", removeAdmin);

module.exports = router;
