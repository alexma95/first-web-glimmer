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

    const { action, adminKey: providedKey, productId, texts, textOptionId, textOptionIds, status } = await req.json();

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

    if (action === 'bulk_delete') {
      if (!textOptionIds || !Array.isArray(textOptionIds) || textOptionIds.length === 0) {
        return new Response(
          JSON.stringify({ error: 'textOptionIds array is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Admin action: bulk_delete - deleting ${textOptionIds.length} text options`);

      const { error } = await supabase
        .from('product_text_options')
        .delete()
        .in('id', textOptionIds);

      if (error) {
        console.error('Bulk delete error:', error);
        throw error;
      }

      console.log(`Successfully deleted ${textOptionIds.length} text options`);
      return new Response(
        JSON.stringify({ success: true, message: `Deleted ${textOptionIds.length} text options` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'cleanup_duplicates') {
      console.log('Starting duplicate cleanup...');
      
      // Find all duplicates
      const { data: duplicates, error: findError } = await supabase.rpc('find_duplicate_text_options');
      
      if (findError) {
        console.error('Error finding duplicates:', findError);
        throw findError;
      }

      const idsToDelete: string[] = [];
      
      // For each duplicate set, keep the best one
      for (const dup of duplicates || []) {
        const { data: options, error: optionsError } = await supabase
          .from('product_text_options')
          .select('*')
          .eq('product_id', dup.product_id)
          .eq('text_md', dup.text_md)
          .order('created_at', { ascending: true });

        if (optionsError || !options || options.length <= 1) continue;

        // Priority: assigned > available > disabled
        const assigned = options.find(o => o.status === 'assigned');
        const available = options.find(o => o.status === 'available');
        
        let keepId: string;
        if (assigned) {
          keepId = assigned.id;
        } else if (available) {
          keepId = available.id;
        } else {
          keepId = options[0].id;
        }

        // Mark others for deletion
        options.forEach(opt => {
          if (opt.id !== keepId) {
            idsToDelete.push(opt.id);
          }
        });
      }

      if (idsToDelete.length === 0) {
        return new Response(
          JSON.stringify({ success: true, message: 'No duplicates found', deletedCount: 0 }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { error: deleteError } = await supabase
        .from('product_text_options')
        .delete()
        .in('id', idsToDelete);

      if (deleteError) {
        console.error('Cleanup delete error:', deleteError);
        throw deleteError;
      }

      console.log(`Deleted ${idsToDelete.length} duplicate text options`);
      return new Response(
        JSON.stringify({ 
          success: true,
          message: `Cleaned up ${idsToDelete.length} duplicates`, 
          deletedCount: idsToDelete.length 
        }),
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
