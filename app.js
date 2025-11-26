const express = require('express');
const mysql = require('mysql');
const multer = require('multer');
const session = require('express-session');
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

function isLoggedIn(req, res, next) {
    if (req.session.user) {
        next();
    } else {
        res.redirect('/login');
    }
}

app.get('/login', (req, res) => {
    res.render('login');
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;

    const sql = "SELECT * FROM users WHERE username = ? AND password = ?";
    db.query(sql, [username, password], (err, results) => {
        if (err) return res.status(500).send(err);

        if (results.length > 0) {
            req.session.user = results[0];  // save user session
            res.redirect('/addproduct');
        } else {
            res.render('login', { error: "Invalid username or password" });
        }
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