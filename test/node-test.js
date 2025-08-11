const express = require('express');
const app = express();
const port = 3000;

// Cross-Site Scripting (XSS) Vulnerability
app.get('/profile', (req, res) => {
    const username = req.query.username;  // User input directly in HTML
    res.send(`<h1>Hello, ${username}</h1>`);  // Vulnerable to XSS
});

// Hardcoded Secret Vulnerability
const secretKey = "1234567890abcdef";  // Hardcoded secret key (not secure)

app.listen(port, () => {
    console.log(`App listening at http://localhost:${port}`);
});
