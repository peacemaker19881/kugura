document.addEventListener("DOMContentLoaded", () => {

    const API = "http://localhost:5000";

    const tbody = document.querySelector("#productsTable tbody");
    const form = document.getElementById("productForm");
    const preview = document.getElementById("preview");

    let editing = false;
    let editId = null;

    // Load all products
    async function loadProducts() {
        const res = await fetch(`${API}/products`);
        const products = await res.json();

        tbody.innerHTML = products.map(p => `
            <tr>
                <td>${p.productid}</td>
                <td>${p.seller_id}</td>
                <td>${p.title}</td>
                <td>${p.price}</td>
                <td>${p.quantity}</td>
                <td><img src="${p.image_url}" width="50"></td>
                <td>
                    <button onclick="editProduct('${p.productid}')">Edit</button>
                    <button onclick="deleteProduct('${p.productid}')">Delete</button>
                </td>
            </tr>
        `).join("");
    }

    loadProducts();

    // Preview image
    document.getElementById("product_image").addEventListener("change", () => {
        preview.src = URL.createObjectURL(event.target.files[0]);
        preview.style.display = "block";
    });

    // Submit form
    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const formData = new FormData(form);

        let url = `${API}/addproduct`;
        let method = "POST";

        if (editing) {
            url = `${API}/updateproduct/${editId}`;
            method = "PUT";
        }

        await fetch(url, { method, body: formData });

        alert("Saved!");
        form.reset();
        preview.style.display = "none";
        editing = false;

        loadProducts();
    });

    // Expose edit function globally
    window.editProduct = async (id) => {
        editing = true;
        editId = id;

        const res = await fetch(`${API}/product/${id}`);
        const p = await res.json();

        form.productid.value = p.productid;
        form.seller_id.value = p.seller_id;
        form.title.value = p.title;
        form.description.value = p.description;
        form.price.value = p.price;
        form.quantity.value = p.quantity;

        preview.src = p.image_url;
        preview.style.display = "block";
    };

    window.deleteProduct = async (id) => {
        if (!confirm("Delete this product?")) return;

        await fetch(`${API}/deleteproduct/${id}`, { method: "DELETE" });
        loadProducts();
    };

    document.getElementById("resetBtn").addEventListener("click", () => {
        editing = false;
        form.reset();
        preview.style.display = "none";
    });
});
