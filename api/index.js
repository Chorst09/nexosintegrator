// Vercel Serverless Function - API Entry Point
const express = require('express');
const cors = require('cors');

// Import all API routes
const authRoutes = require('../apps/api/api/auth.cjs');
const usersRoutes = require('../apps/api/api/users.js');
const companiesRoutes = require('../apps/api/api/companies.js');
const opportunitiesRoutes = require('../apps/api/api/opportunities.js');
const activitiesRoutes = require('../apps/api/api/activities.js');
const productsRoutes = require('../apps/api/api/products.cjs');
const proposalsRoutes = require('../apps/api/api/proposals.cjs');
const commissionsRoutes = require('../apps/api/api/commissions.js');
const dashboardRoutes = require('../apps/api/api/dashboard.js');
const contractsRoutes = require('../apps/api/api/contracts.cjs');
const postSalesRoutes = require('../apps/api/api/postSales.cjs');
const integrationsRoutes = require('../apps/api/api/integrations.js');
const settingsRoutes = require('../apps/api/api/settings.cjs');
const licensingRoutes = require('../apps/api/api/licensing.cjs');
const checkoutRoutes = require('../apps/api/api/checkout.cjs');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'CRM API is running' });
});

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/companies', companiesRoutes);
app.use('/api/opportunities', opportunitiesRoutes);
app.use('/api/activities', activitiesRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/proposals', proposalsRoutes);
app.use('/api/commissions', commissionsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/contracts', contractsRoutes);
app.use('/api/post-sales', postSalesRoutes);
app.use('/api/integrations', integrationsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/licensing', licensingRoutes);
app.use('/api/checkout', checkoutRoutes);

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

module.exports = app;
