const express = require('express');
const mysql = require('mysql');
const multer = require('multer');
const session = require('express-session');
const bcrypt = require("bcryptjs");
const path = require('path');
const dotenv = require('dotenv');
const hbs = require("hbs");

const axios = require('axios');
const { randomUUID } = require('crypto');
require('dotenv').config(); // if not already loaded

const MTN = {
  subscriptionKey: process.env.MTN_SUBSCRIPTION_KEY,
  apiUserId: process.env.MTN_API_USER_ID,
  apiKey: process.env.MTN_API_KEY,
  baseUrl: 'https://sandbox.momodeveloper.mtn.com', // sandbox base
  targetEnv: process.env.MTN_TARGET_ENVIRONMENT || 'sandbox',
  callbackUrl: process.env.MTN_CALLBACK_URL
};

dotenv.config();
const app = express();
const port = 5000;

//   HBS CONFIGURATION
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));
hbs.registerPartials(path.join(__dirname, "views/partials"));

hbs.registerHelper("eq", function (a, b) {
    return a === b;
});

//   MIDDLEWARES
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use(session({
    secret: "mysecret123",
    resave: false,
    saveUninitialized: true,
}));

// Make user available in all hbs files
app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    next();
});

//   LOGIN CHECK HELPERS
function isLoggedIn(req, res, next) {
    if (req.session.user) {
        next();
    } else {
        res.redirect('/login');
    }
}
// middleware for admin
function isAdmin(req, res, next) {
    if (!req.session.user || req.session.user.role !== "admin") {
        return res.status(403).send("Access denied. Admins only.");
    }
    next();
}
// middleware for seller
function isSeller(req, res, next) {
    if (req.session && req.session.user && req.session.user.role === "seller") {
        return next();
    } else {
        return res.redirect("/login");
    }
}
// middleware for customer
function isCustomer(req, res, next) {
    if (!req.session.user || req.session.user.role !== "customer") {
        return res.status(403).send("Ntabwo wigeze wiyandikisha banza wiyandikishe.");
    }
    next();
}
//   MULTER FOR UPLOADS
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, './public/uploads');
    },
    filename: function(req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

//   DATABASE CONNECTION
const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "sellsdb"
});

db.connect(err => {
    if (err) throw err;
    console.log("Database connected");
});

//   PRODUCT ROUTES
app.get("/", (req, res) => {
     const sql = "SELECT * FROM products WHERE status='approved'";
    db.query(sql, (err, products) => {
        if (err) {
            console.log(err);
            return res.status(500).send("Database error");
        }

        res.render("customer/products", { products });
    });
});

// Customers: View all approved products
app.get("/products", (req, res) => {
    const sql = "SELECT * FROM products WHERE status='approved'";
    db.query(sql, (err, products) => {
        if (err) {
            console.log(err);
            return res.status(500).send("Database error");
        }

        res.render("customer/products", { products });
    });
});

// Customers: View product details
app.get("/products/:id", (req, res) => {
    const sql = "SELECT * FROM products WHERE productid=?";
    db.query(sql, [req.params.id], (err, rows) => {
        if (err || rows.length === 0) {
            return res.status(404).send("Product not found");
        }

        res.render("customer/product-details", { product: rows[0] });
    });
});

// buy route when customers need to buy using mtn momo
app.get("/buy/:id", (req, res) => {
    const sql = "SELECT * FROM products WHERE productid=?";
    db.query(sql, [req.params.id], (err, rows) => {
        if (err || rows.length === 0) {
            return res.status(404).send("Product not found");
        }
        res.render("customer/buy", { product: rows[0] });
    });
});

//   AUTH ROUTES
app.get("/register", (req, res) => {
    res.render("register");
});

app.post("/register", async (req, res) => {
    try {
        const { username, email, phone, role, password } = req.body;
        const allowedRoles = ["admin", "seller", "customer"];
        if (!allowedRoles.includes(role)) {
            return res.status(400).json({ message: "Invalid role selected" });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const sql = "INSERT INTO users(username, email, phone, role, password) VALUES(?,?,?,?,?)";
        db.query(sql, [username, email, phone, role, hashedPassword], (err) => {
            if (err) return res.status(500).json({ error: err });
            return res.status(201).json({ message: "User registered successfully" });
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get("/login", (req, res) => {
    res.render("login");
});

app.post("/login", (req, res) => {
    const { username, password } = req.body;
    const sql = "SELECT * FROM users WHERE username = ?";
    db.query(sql, [username], async (err, results) => {
        if (err) return res.status(500).send("Database error");
        if (results.length === 0) {
            return res.status(404).send("User not found");
        }
        const user = results[0];
        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            return res.status(400).send("Incorrect password");
        }

        // Save logged in user in session
        req.session.user = {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            profile_image: user.profile_image || null
        };
        // Redirect based on role
        if (user.role === "admin") return res.redirect("/admin");
        if (user.role === "seller") return res.redirect("/addproduct");
        if (user.role === "customer") return res.redirect("/products");
        res.send("Logged in, but role not recognized.");
    });
});

// LOGOUT
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

//   PROFILE ROUTES
app.get("/profile", isLoggedIn, (req, res) => {
    res.render("profile", { user: req.session.user });
});
// change the profile picture 
app.post("/profile", isLoggedIn, upload.single("profile_image"), (req, res) => {
    if (!req.file) return res.send("Please upload an image");
    const imagePath = "/uploads/" + req.file.filename;
    db.query(
        "UPDATE users SET profile_image=? WHERE id=?",
        [imagePath, req.session.user.id],
        (err) => {
            if (err) throw err;
            // Update session
            req.session.user.profile_image = imagePath;
            res.redirect("/profile");
        }
    );
});

//   ADMIN ROUTES
app.get("/dashboard", isLoggedIn, (req, res) => {
  if (req.session.user.role === "admin") {
     res.redirect("/admin");
    } else {
        res.redirect("/addproduct");
    }
});

app.get("/admin", isAdmin, (req, res) => {
    const sql = "SELECT * FROM products";
    db.query(sql, (err, products) => {
        if (err) console.log(err);
        res.render("admin", { products });
    });
});

// admin pending products
app.get("/admin/pending-products", isAdmin, (req, res) => {
    const sql = "SELECT * FROM products WHERE status='pending'";
    db.query(sql, (err, products) => {
        if (err) console.log(err);
        res.render("pending-products", { products });
    });
});

// Approve product (admin)
app.get("/admin/approve/:productid", isAdmin, (req, res) => {
    const productid = req.params.productid;
    const sql = "UPDATE products SET status = 'approved' WHERE productid = ?";

    db.query(sql, [productid], (err, result) => {
        if (err) {
            console.error("Approve error:", err);
            // Optionally set an error message in session and redirect
            req.session.error = "Failed to approve product.";
            return res.redirect("/admin");
        }

        // success message
        req.session.success = "Product approved successfully.";
        return res.redirect("/admin");
    });
});


app.get("/admin/edit/:productid", isAdmin, (req, res) => {
    db.query("SELECT * FROM products WHERE productid=?", [req.params.productid], (err, data) => {
        res.render("edit-product", { product: data[0] });
    });
});

app.post("/admin/edit/:productid", isAdmin, (req, res) => {
    const { title, description, price, quantity } = req.body;

    const sql = `
        UPDATE products 
        SET title=?, description=?, price=?, quantity=? 
        WHERE productid=?
    `;

    db.query(sql, [title, description, price, quantity, req.params.productid], () => {
        res.redirect("/admin");
    });
});
// delete product

app.get("/admin/delete/:productid", isAdmin, (req, res) => {
    const sql = "DELETE FROM products WHERE productid=?";
    db.query(sql, [req.params.productid], () => {
        res.redirect("/admin");
    });
});
// Displaying the products list 
app.get("/products", async (req, res) => {
    const products = await Product.findAll({
        where: { status: "approved" }
    });
    res.json(products);
});

// The seller side dashboard that display all products including pending and approved

app.get("/seller/seller_products", isSeller, (req, res) => {
    const sql = "SELECT * FROM products WHERE seller_id = ?";
    db.query(sql, [req.session.user.id], (err, products) => {
        const success = req.session.success;
        req.session.success = null; // Clear after showing message

        res.render("seller/seller_products", {
            products,
            success
        });
    });
});

// for customers who view only approved products

app.get("/products", async (req, res) => {
    const products = await Product.findAll({
        where: { status: "approved" }
    });
    res.render("products", { products });
});

app.get('/product/:id', (req, res) => {
    const sql = "SELECT * FROM products WHERE productid=?";
    db.query(sql, [req.params.id], (err, result) => {
        if (err) return res.status(500).send(err);

        if (result.length === 0) {
            return res.status(404).send("Product not found");
        }

        res.render("product-details", { product: result[0] });
    });
});

app.get('/addproduct', isLoggedIn, (req, res) => {
    res.render('addproduct');
});

// side of seller once adding product
app.post("/addproduct", isSeller, upload.single("image"), (req, res) => {
    const { productid, title, description, price, quantity } = req.body;
    const seller_id = req.session.user.id;  // extract from session
    const image_url = req.file ? "/uploads/" + req.file.filename : null;

    const sql = `
        INSERT INTO products 
        (productid, seller_id, title, description, price, quantity, image_url, status) 
        VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
    `;

    db.query(
        sql,
        [productid, seller_id, title, description, price, quantity, image_url],
        (err, result) => {
            if (err) {
                console.log(err);
                return res.status(500).send("Database error");
            }

            req.session.success = "Product uploaded successfully!";
            return res.redirect("/seller/seller_products");
        }
    );
});
// add product to cart 
app.post("/cart/add/:id", isCustomer, (req, res) => {
    const productid = req.params.id;
    const customer_id = req.session.user.id;
    const quantity = parseInt(req.body.quantity);

    // Step 1: Fetch price of product
    const getProduct = "SELECT price FROM products WHERE productid=?";
    db.query(getProduct, [productid], (err, pdata) => {
        if (err || pdata.length === 0) {
            console.log(err);
            return res.send("Product not found");
        }

        const price = pdata[0].price;
        const total = price * quantity;

        // Step 2: Check if product already exists in cart
        db.query(
            "SELECT * FROM cart WHERE customer_id=? AND productid=?",
            [customer_id, productid],
            (err, exists) => {
                if (exists.length > 0) {
                    // Update quantity
                    const newQty = exists[0].quantity + quantity;
                    const newTotal = newQty * price;

                    db.query(
                        "UPDATE cart SET quantity=?, total=? WHERE id=?",
                        [newQty, newTotal, exists[0].id],
                        () => {
                            return res.redirect("/cart");
                        }
                    );
                } else {
                    // Insert new row
                    const insertSQL =
                        "INSERT INTO cart (customer_id, seller_id, productid, quantity, price, total) VALUES (?, ?, ?, ?, ?)";

                    db.query(
                        insertSQL,
                        [customer_id, seller_id, productid, quantity, price, total],
                        () => {
                            return res.redirect("/cart");
                        }
                    );
                }
            }
        );
    });
});

// display list of cart
app.get("/cart", isCustomer, (req, res) => {
    const customer_id = req.session.user.id;

    const sql = `
        SELECT cart.*, products.title, products.image_url 
        FROM cart 
        JOIN products ON cart.productid = products.productid 
        WHERE customer_id=?`;

    db.query(sql, [customer_id], (err, items) => {
        if (err) console.log(err);
        res.render("cart", { items });
    });
});
// remove item on cart 
app.get("/cart/remove/:id", isCustomer, (req, res) => {
    db.query("DELETE FROM cart WHERE id=?", [req.params.id], () => {
        res.redirect("/cart");
    });
});
// payment start here
// Helper: get Bearer token (for collections) 
async function getCollectionBearerToken() {
  const tokenUrl = `${MTN.baseUrl}/collection/token/`;

  // Basic auth: username = apiUserId, password = apiKey
  const authString = Buffer.from(`${MTN.apiUserId}:${MTN.apiKey}`).toString('base64');

  try {
    const resp = await axios({
      method: 'post',
      url: tokenUrl,
      headers: {
        'Ocp-Apim-Subscription-Key': MTN.subscriptionKey,
        'Authorization': `Basic ${authString}`,
        'Content-Type': 'application/json'
      }
    });

    // Response contains access_token or similar
    return resp.data.access_token || resp.data['access_token'] || resp.data.token;
  } catch (err) {
    console.error('Failed to get collection token', err.response?.data || err.message);
    throw err;
  }
}

// Helper: send Request To Pay
async function requestToPay({ amount, currency='RWF', externalId, payerPhone, payerMessage='Payment', payeeNote='Thanks' }) {
  // generate a unique X-Reference-Id for this transaction
  const xRef = randomUUID();
  const token = await getCollectionBearerToken();

  const url = `${MTN.baseUrl}/collection/v1_0/requesttopay`;

  const body = {
    amount: amount.toString(),
    currency,
    externalId: externalId || `order-${Date.now()}`,
    payer: {
      partyIdType: "MSISDN",
      partyId: payerPhone
    },
    payerMessage,
    payeeNote
  };

  try {
    const resp = await axios({
      method: 'post',
      url,
      data: body,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-Reference-Id': xRef,
        'X-Target-Environment': MTN.targetEnv,
        'Ocp-Apim-Subscription-Key': MTN.subscriptionKey,
        'X-Callback-Url': MTN.callbackUrl
      },
      validateStatus: () => true // we'll check status ourselves
    });

    // MTN returns 202 Accepted on success
    return {
      status: resp.status,
      data: resp.data,
      referenceId: xRef
    };
  } catch (err) {
    console.error('RequestToPay failed', err.response?.data || err.message);
    throw err;
  }
}


// ensure isCustomer middleware exists (like isLoggedIn + role check)
app.post('/checkout', isCustomer, async (req, res) => {
  try {
    const customerId = req.session.user.id;

    // Get cart items from DB
    const sql = `
      SELECT cart.*, products.title, products.price
      FROM cart
      JOIN products ON cart.productid = products.productid
      WHERE cart.customer_id = ?
    `;
    db.query(sql, [customerId], async (err, items) => {
      if (err) {
        console.error(err);
        return res.status(500).send('DB error');
      }
      if (!items || items.length === 0) return res.redirect('/cart');

      // compute total
      const total = items.reduce((s, it) => s + parseFloat(it.total), 0);

      // customer phone must be collected or in user profile
      // Here we assume req.session.user.phone exists
      const payerPhone = req.session.user.phone;
      if (!payerPhone) {
        return res.status(400).send('Customer phone number required to pay');
      }

      // create an external id (order id)
      const externalId = `order-${customerId}-${Date.now()}`;

      // call MTN requestToPay
      const r = await requestToPay({
        amount: total,
        currency: 'RWF',
        externalId,
        payerPhone,
        payerMessage: `Payment for ${externalId}`,
        payeeNote: 'Thanks for your purchase'
      });

      if (r.status === 202) {
        // Save transaction in your DB (orders/payments table) with referenceId r.referenceId
        const insertSql = `INSERT INTO payments (customer_id, reference_id, external_id, amount, status, created_at)
          VALUES (?, ?, ?, ?, ?, NOW())`;
        db.query(insertSql, [customerId, r.referenceId, externalId, total, 'pending'], () => {
          // redirect to a "waiting for payment" page that polls status or explains to user
          req.session.checkout_ref = r.referenceId;
          return res.redirect(`/checkout/wait/${r.referenceId}`);
        });
      } else {
        console.error('MTN returned non-202', r.status, r.data);
        return res.status(500).send('Payment initiation failed');
      }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).send('Server error');
  }
});


app.get('/checkout/wait/:referenceId', isCustomer, (req, res) => {
  res.render('customer/checkout-wait', { referenceId: req.params.referenceId });
});


// Query MTN request-to-pay status
app.get('/checkout/status/:referenceId', isCustomer, async (req, res) => {
  const referenceId = req.params.referenceId;
  try {
    const token = await getCollectionBearerToken();
    const url = `${MTN.baseUrl}/collection/v1_0/requesttopay/${referenceId}`;

    const resp = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Ocp-Apim-Subscription-Key': MTN.subscriptionKey,
        'X-Target-Environment': MTN.targetEnv
      },
      validateStatus: () => true
    });

    return res.json({ status: resp.status, data: resp.data });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed' });
  }
});


// receives notifications from MTN (POST)
app.post('/momo/notifications', (req, res) => {
  // MTN will send JSON payload with transaction status; log & update DB
  console.log('MTN notification:', req.headers, req.body);

  // update payments table by reference id or external id
  // Example: find reference id within req.body
  // Then update your DB: status = 'successful' or 'failed'
  res.status(200).send('OK');
});
// admin sold products already in cart table only

app.get("/admin/sold-products", isAdmin, (req, res) => {
    let { from_date, to_date, page } = req.query;
    page = parseInt(page) || 1;
    const limit = 10;
    const offset = (page - 1) * limit;

    let sql = `
        SELECT cart.*, products.title, products.image_url, products.seller_id, cart.created_at
        FROM cart 
        JOIN products ON cart.productid = products.productid
    `;
    const params = [];

    if (from_date && to_date) {
        sql += " WHERE cart.created_at BETWEEN ? AND ?";
        params.push(from_date + " 00:00:00", to_date + " 23:59:59");
    }

    sql += " ORDER BY cart.created_at DESC LIMIT ? OFFSET ?";
    params.push(limit, offset);

    db.query(sql, params, (err, data) => {
        if (err) throw err;

        let countSql = "SELECT COUNT(*) as total FROM cart";
        const countParams = [];

        if (from_date && to_date) {
            countSql += " WHERE created_at BETWEEN ? AND ?";
            countParams.push(from_date + " 00:00:00", to_date + " 23:59:59");
        }

        db.query(countSql, countParams, (err2, countResult) => {
            if (err2) throw err2;

            const totalPages = Math.ceil(countResult[0].total / limit);

            res.render("admin/sold-products", {
                sold: data,
                currentPage: page,
                totalPages,
                from_date,
                to_date
            });
        });
    });
});



// register helper file in sold product hbs file 
hbs.registerHelper("increment", function(value) {
    return parseInt(value) + 1;
});

hbs.registerHelper("decrement", function(value) {
    return parseInt(value) - 1;
});

hbs.registerHelper("gt", function(a, b) {
    return a > b;
});

hbs.registerHelper("lt", function(a, b) {
    return a < b;
});


// seller viewing sold product in cart table

app.get("/seller/sold-products", isSeller, (req, res) => {
    const sellerId = req.session.user.id;

    const sql = `
        SELECT cart.*, products.title, products.image_url 
        FROM cart 
        JOIN products ON cart.productid = products.productid
        WHERE products.seller_id = ?
    `;

    db.query(sql, [sellerId], (err, data) => {
        if (err) throw err;

        res.render("seller/sold-products", { sold: data });
    });
});



// calculating the total price in report of sold product
hbs.registerHelper("multiply", function(a, b) {
    return a * b;
});

// download the pdf file as report in admin and seller only

const PDFDocument = require("pdfkit");
const fs = require("fs");

app.get("/admin/sold-products/pdf", isAdmin, (req, res) => {
    const { from_date, to_date } = req.query;

    let sql = `
        SELECT cart.*, products.title, products.image_url, products.seller_id
        FROM cart
        JOIN products products ON cart.productid = products.productid
    `;
    const params = [];

    if (from_date && to_date) {
        sql += " WHERE cart.created_at BETWEEN ? AND ?";
        params.push(from_date + " 00:00:00", to_date + " 23:59:59");
    }

    db.query(sql, params, (err, data) => {
        if (err) throw err;

        const doc = new PDFDocument();
        const filename = "sold-products-report.pdf";

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename=${filename}`);

        doc.pipe(res);

        // Add Logo
        const logoPath = path.join(__dirname, "public/images/logo.png");
        doc.image(logoPath, 50, 20, { width: 100 });
        doc.moveDown(4);

        // Report Title
        doc
            .fontSize(18)
            .font("Times-BoldItalic")
            .text("List of Bought Products", { align: "center" })
            .moveDown();

        // Company Info
        doc
            .fontSize(12)
            .font("Times-Roman")
            .text("Company Name: Valens Online Store")
            .text("Phone: +250 788 000 111")
            .text("Email: info@valensstore.rw")
            .moveDown(2);

        // Table
        doc.font("Times-Bold");
        doc.text("Product", 50);
        doc.text("Qty", 250);
        doc.text("Price", 300);
        doc.text("Total", 370);
        doc.moveDown();
        doc.font("Times-Roman");

        let grandTotal = 0;

        data.forEach(item => {
            const total = item.price * item.quantity;
            grandTotal += total;

            doc.text(item.title, 50);
            doc.text(item.quantity.toString(), 250);
            doc.text(item.price.toString(), 300);
            doc.text(total.toString(), 370);
            doc.moveDown();
        });

        const TVA = grandTotal * 0.15;
        const totalWithTVA = grandTotal - TVA;

        doc.moveDown();
        doc.font("Times-Bold");
        doc.text(`Total Without TVA: ${grandTotal} RWF`, { align: "right" });
        doc.text(`TVA (15%): ${TVA} RWF`, { align: "right" });
        doc.text(`Total With TVA: ${totalWithTVA} RWF`, { align: "right" });

        doc.end();
    });
});


// Auto SERVER START
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
    import('open').then(open => {
        open.default(`http://localhost:${port}`);
    });
});
