const fetch = require('node-fetch');

class D1Client {
  constructor() {
    this.accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    this.apiToken = process.env.CLOUDFLARE_API_TOKEN;
    this.databaseId = process.env.CLOUDFLARE_D1_DATABASE_ID;
    
    if (!this.accountId || !this.apiToken || !this.databaseId) {
      console.warn('[D1 Client] Missing configuration. D1 queries will fail.');
    }
    
    this.baseUrl = `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/d1/database/${this.databaseId}`;
  }

  async query(sql, params = []) {
    try {
      const response = await fetch(`${this.baseUrl}/query`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sql,
          params
        })
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('[D1 Query Error]', error);
        throw new Error(`D1 Query failed: ${response.status} ${error}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(`D1 Query failed: ${JSON.stringify(data.errors)}`);
      }
      
      return data.result[0];
    } catch (error) {
      console.error('[D1 Client Error]', error);
      throw error;
    }
  }

  async execute(sql, params = []) {
    return this.query(sql, params);
  }

  async all(sql, params = []) {
    const result = await this.query(sql, params);
    return result.results || [];
  }

  async first(sql, params = []) {
    const result = await this.query(sql, params);
    return result.results && result.results.length > 0 ? result.results[0] : null;
  }
  
  // Método para executar múltiplas queries (batch)
  async batch(queries) {
    try {
      const response = await fetch(`${this.baseUrl}/query`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(queries)
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`D1 Batch failed: ${error}`);
      }

      const data = await response.json();
      return data.result;
    } catch (error) {
      console.error('[D1 Batch Error]', error);
      throw error;
    }
  }
}

module.exports = { D1Client };
