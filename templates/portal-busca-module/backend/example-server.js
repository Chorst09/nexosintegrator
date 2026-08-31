const express = require('express');
const cors = require('cors');

const b2gSearchRoutes = require('./routes/b2g-search');
const bllProxyRoutes = require('./routes/bll-proxy');
const comprasnetProxyRoutes = require('./routes/comprasnet-proxy');
const b2gManagedBidsRoutes = require('./routes/b2g-managed-bids');

const app = express();

app.use(cors());
app.use(express.json({ limit: '2mb' }));

app.use('/api/b2g-search', b2gSearchRoutes);
app.use('/api/bll-proxy', bllProxyRoutes);
app.use('/api/comprasnet-proxy', comprasnetProxyRoutes);
app.use('/api/b2g', b2gManagedBidsRoutes);

app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

const port = Number(process.env.PORT || 3002);
app.listen(port, () => {
  console.log(`Portal Busca API rodando em http://127.0.0.1:${port}`);
});
