const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY || "sk_test_dummy");

const createCheckoutSession = async (req, res) => {
    try {
        const cart = req.body.items || req.body.cart || [];

        if (cart.length === 0)
            return res.status(400).json({ message: "Cart empty" });

        const lineItems = cart.map(item => ({
            price_data: {
                currency: "usd",
                product_data: { name: item.name },
                unit_amount: Math.round(
                    (item.price || item.discountedPrice) * 100
                )
            },
            quantity: item.quantity || 1
        }));

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            line_items: lineItems,
            mode: "payment",
            success_url:
                (req.headers.origin || "http://localhost:5173") +
                "/?paid=true",
            cancel_url:
                (req.headers.origin || "http://localhost:5173") +
                "/?canceled=true"
        });

        res.json({
            id: session.id,
            url: session.url
        });
    } catch (err) {
        console.error(err);
        res.status(500).json(err);
    }
};

module.exports = { createCheckoutSession };
