// Netlify function to handle database operations
const { Client } = require('@netlify/functions');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  try {
    const { action, table, data, id } = JSON.parse(event.body);
    let result;

    switch (action) {
      case 'get':
        result = await supabase
          .from(table)
          .select('*')
          .eq('id', id);
        break;
      
      case 'list':
        result = await supabase
          .from(table)
          .select('*');
        break;
      
      case 'insert':
        result = await supabase
          .from(table)
          .insert([data])
          .select();
        break;
      
      case 'update':
        result = await supabase
          .from(table)
          .update(data)
          .eq('id', id)
          .select();
        break;
      
      case 'delete':
        result = await supabase
          .from(table)
          .delete()
          .eq('id', id);
        break;
      
      default:
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Invalid action' }),
        };
    }

    if (result.error) throw result.error;

    return {
      statusCode: 200,
      body: JSON.stringify(result.data),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
