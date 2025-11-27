const express = require('express');
const mysql = require('mysql');
const multer = require('multer');
const session = require('express-session');
const bcrypt = require("bcryptjs");
const path = require('path');
const dotenv = require('dotenv');
const hbs = require("hbs");

hbs.registerHelper("eq", function (a, b) {
    return a === b;
});


dotenv.config();
const app = express();
const port = 5000;

// SET HBS
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));

// STATIC FOLDER
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use(session({
    secret: "mysecret123",
    resave: false,
    saveUninitialized: true,
}));

function isAdmin(req, res, next) {
    if (req.session && req.session.user && req.session.user.role == "admin") {
        return next();
    }
    return res.status(403).send("Access denied. Admins only.");
}

function isLoggedIn(req, res, next) {
    if (req.session.user) {
        next();
    } else {
        res.redirect('/login');
    }
}

exports.isLoggedIn = (req, res, next) => {
    if (!req.session.user) return res.redirect("/login");
    next();
};

exports.isAdmin = (req, res, next) => {
    if (!req.session.user || req.session.user.role !== "admin") {
        return res.status(403).send("Access denied");
    }
    next();
};
// Register users
app.get("/register", (req, res) => {
    res.render("register");
});

app.post("/register", async (req, res) => {
    try {
        const { username, email, phone, password, role } = req.body;

        // 1. Check if role is valid
        const allowedRoles = ["admin", "seller"];
        if (!allowedRoles.includes(role)) {
            return res.status(400).json({ message: "Invalid role selected" });
        }

        // 2. Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // 3. SQL insert including the role
        const sql = "INSERT INTO users(username, email, phone, password, role) VALUES(?,?,?,?,?)";
        db.query(sql, [username, email, phone, hashedPassword, role], (err) => {
            if (err) return res.status(500).json({ error: err });
            return res.status(201).json({ message: "User registered successfully" });
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


//Login route for navigating to our system
app.get("/login", (req, res) => {
    res.render("login");
});

app.post("/login", (req, res) => {
    const { username, password } = req.body;

    const sql = "SELECT * FROM users WHERE username = ?";
    db.query(sql, [username,password], async (err, results) => {
        if (err) return res.status(500).send("Database error");

        if (results.length === 0) {
            return res.status(404).send("User not found");
        }

        const user = results[0];

        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            return res.status(400).send("Incorrect password");
        }

        // ↓↓↓ SAVE USER INTO SESSION ↓↓↓
        req.session.user = {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role
        };

        // ↓↓↓ ROLE BASED REDIRECTION ↓↓↓
        if (user.role === "admin") {
            return res.redirect("/admin");
        }
        if (user.role === "seller") {
            return res.redirect("/seller");
        }

        return res.send("Logged in, but role not recognized.");
    });
});


// Dashboard for admin 
app.get("/dashboard", isLoggedIn, (req, res) => {
    if (req.session.user.role === "admin") {
        res.redirect("/admin");
    } else {
        res.redirect("/addproduct");
    }
});
// admin route 

app.get("/admin", isAdmin, (req, res) => {
    const sql = "SELECT * FROM products";

    db.query(sql, (err, products) => {
        res.render("admin", { products });
    });
});

//Approve product by admin 

app.get("/approve/:id", isAdmin, (req, res) => {
    db.query("UPDATE products SET status='approved' WHERE productid=?", 
    [req.params.id], () => {
        res.redirect("/admin");
    });
});

// Edit Page

app.get("/edit/:id", isAdmin, (req, res) => {
    db.query("SELECT * FROM products WHERE productid=?", [req.params.id], (err, data) => {
        res.render("edit-product", { products: data[0] });
    });
});

// Update Route
app.post("/edit/:id", isAdmin, (req, res) => {
    const { productname, unit_price, quantity } = req.body;

    db.query("UPDATE products SET productname=?, unit_price=?, quantity=? WHERE productid=?",
        [productname, unit_price, quantity, req.params.id],
        () => res.redirect("/admin")
    );
});

// Delete Product

app.get("/delete/:id", isAdmin, (req, res) => {
    db.query("DELETE FROM products WHERE productid=?", [req.params.id], () => {
        res.redirect("/admin");
    });
});

// show only approved products 

app.get("/", (req, res) => {
    db.query("SELECT * FROM products WHERE status='approved'", (err, products) => {
        res.render("home", { products });
    });
});


app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});


app.get('/addproduct', isLoggedIn, (req, res) => {
    res.render('addproduct');
});


// IMAGE UPLOAD SETTINGS
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, './public/uploads');
    },
    filename: function(req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// DATABASE CONNECTION
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

// RENDER HOMEPAGE
app.get('/', (req, res) => {
    res.render('index', { user: req.session.user });
});

// DISPLAY ALL PRODUCTS
app.get('/products', (req, res) => {
    const sql = 'SELECT * FROM products';
    db.query(sql, (err, results) => {
        if (err) res.status(500).send(err);
        res.render('products', { products: results });
    });
});

// ADD PRODUCT FORM PAGE
app.get('/addproduct', (req, res) => {
    res.render('addproduct');
});

// ADD PRODUCT WITH IMAGE UPLOAD
app.post('/addproduct', isLoggedIn, upload.single('image'), (req, res) => {

    const { productid, seller_id, title, description, price, quantity } = req.body;
    const image_url = req.file ? '/uploads/' + req.file.filename : null;

    const sql = `INSERT INTO products 
    (productid, seller_id, title, description, price, quantity, image_url, approved, is_sold, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, NOW())`;

    db.query(sql, [productid, seller_id, title, description, price, quantity, image_url],
        (err, result) => {
            if (err) res.status(500).send(err);
            res.redirect('/products');
        });
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);

    // FIX: dynamic import for ESM module
    import('open').then(open => {
        open.default(`http://localhost:${port}`);
    });
})