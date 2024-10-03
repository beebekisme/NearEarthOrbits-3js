const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = 3000; // You can choose any port

app.use(cors());

app.get('/api/sbdb', async (req, res) => {
    const { sstr } = req.query;

    try {
        const response = await axios.get(`https://ssd-api.jpl.nasa.gov/sbdb.api?sstr=${sstr}`);
        res.json(response.data);
    } catch (error) {
        res.status(500).send('Error fetching data from JPL API');
    }
});

app.listen(PORT, () => {
    console.log(`Proxy server running on http://localhost:${PORT}`);
});
