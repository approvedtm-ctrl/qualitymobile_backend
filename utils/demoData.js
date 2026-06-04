const SAMPLE_PRODUCTS = [
    {
        id: 1,
        name: "Samsung Galaxy S24",
        category: "Electronics",
        price: 15000,
        discountedPrice: 12000,
        rating: 4.5,
        soldCount: "500+ sold",
        condition: "New",
        stock: 50,
        images: ["/images/demo-phone.jpg"],
        ebayDetails: {
            model: "S24",
            storage: "128GB",
            ram: "8GB",
            network: "Unlocked",
            color: "Black",
            warranty: "1 year"
        }
    }
];

const SAMPLE_ORDERS = [
    {
        id: 1,
        user_email: "guest@bzr.com",
        customer_id: 1,
        order_date: "2024-03-09T10:00:00.000Z",
        total: 12000,
        status: "Shipped",
        items: [{ product_id: 1, product_name: "Samsung Galaxy S24", price: 12000, quantity: 1 }],
        delivery: {
            address: "123 Demo St, Mumbai, India",
            partner: "BlueDart",
            tracking_number: "DEMO123456",
            status: "Shipped",
            date: "2024-03-10"
        }
    }
];

module.exports = { SAMPLE_PRODUCTS, SAMPLE_ORDERS };
