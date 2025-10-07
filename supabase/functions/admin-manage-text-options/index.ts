import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const adminKey = Deno.env.get('ADMIN_KEY');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, adminKey: providedKey, productId, texts, textOptionId, status } = await req.json();

    // Verify admin key
    if (providedKey !== adminKey) {
      console.log('Invalid admin key provided');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Admin action: ${action}`);

    // Handle different actions
    if (action === 'bulk_add') {
      if (!productId || !texts || !Array.isArray(texts)) {
        return new Response(
          JSON.stringify({ error: 'Missing productId or texts' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const inserts = texts.map((text) => ({
        product_id: productId,
        text_md: text,
        status: 'available',
      }));

      const { data, error } = await supabase
        .from('product_text_options')
        .insert(inserts)
        .select();

      if (error) {
        console.error('Error inserting text options:', error);
        throw error;
      }

      console.log(`Successfully added ${texts.length} text options`);
      return new Response(
        JSON.stringify({ success: true, count: texts.length, data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'update_status') {
      if (!textOptionId || !status) {
        return new Response(
          JSON.stringify({ error: 'Missing textOptionId or status' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data, error } = await supabase
        .from('product_text_options')
        .update({ status })
        .eq('id', textOptionId)
        .select();

      if (error) {
        console.error('Error updating text option status:', error);
        throw error;
      }

      console.log(`Successfully updated text option status to ${status}`);
      return new Response(
        JSON.stringify({ success: true, data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in admin-manage-text-options:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
