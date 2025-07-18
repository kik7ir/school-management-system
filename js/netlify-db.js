class NetlifyDB {
  constructor() {
    this.baseUrl = '/.netlify/functions/db-handler';
  }

  async request(action, table, data = {}, id = null) {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action, table, data, id }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Database operation failed:', error);
      throw error;
    }
  }

  // CRUD Operations
  async get(table, id) {
    return this.request('get', table, {}, id);
  }

  async list(table) {
    return this.request('list', table);
  }

  async insert(table, data) {
    return this.request('insert', table, data);
  }

  async update(table, id, data) {
    return this.request('update', table, data, id);
  }

  async delete(table, id) {
    return this.request('delete', table, {}, id);
  }
}

// Export a singleton instance
const db = new NetlifyDB();
export default db;
