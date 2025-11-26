const express = require('express');
const mysql = require('mysql');
const multer = require('multer');
const session = require('express-session');
const bcrypt = require("bcryptjs");
const path = require('path');
const dotenv = require('dotenv');

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
    if (req.session && req.session.user && req.session.user.role === "admin") {
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
    const { username, email, password } = req.body;

    const hash = await bcrypt.hash(password, 10);

    const sql = "INSERT INTO users(username,email,password,phone) VALUES(?,?,?,?)";
    db.query(sql, [username, phone, email, hash], (err) => {
        if (err) return res.send(err);
        res.redirect("/login");
    });
});

//Login route for navigating to our system
app.get("/login", (req, res) => {
    res.render("login");
});

app.post("/login", (req, res) => {
    const { email, password } = req.body;

    db.query("SELECT * FROM users WHERE email=?", [email], async (err, rows) => {
        if (err) return res.send(err);
        if (rows.length === 0) return res.send("User not found");

        const user = rows[0];
        const match = await bcrypt.compare(password, user.password);

        if (!match) return res.send("Incorrect password");

        // store session
        req.session.user = {
            id: user.userid,
            username: user.username,
            role: user.role
        };

        res.redirect("/dashboard");
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
    db.query("DELETE FROM product WHERE productid=?", [req.params.id], () => {
        res.redirect("/admin");
    });
});

// show only approved products 

app.get("/", (req, res) => {
    db.query("SELECT * FROM product WHERE status='approved'", (err, products) => {
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