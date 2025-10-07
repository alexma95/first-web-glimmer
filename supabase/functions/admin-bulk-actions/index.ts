import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const adminKey = Deno.env.get('ADMIN_KEY');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, adminKey: providedKey } = await req.json();

    // Verify admin key
    if (providedKey !== adminKey) {
      console.log('Invalid admin key provided');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Admin bulk action: ${action}`);

    if (action === 'delete_all_texts') {
      const { error } = await supabase
        .from('product_text_options')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (error) {
        console.error('Error deleting text options:', error);
        throw error;
      }

      console.log('Successfully deleted all text options');
      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'delete_all_proofs') {
      // Delete from storage
      const { data: files } = await supabase.storage
        .from('proofs')
        .list();

      if (files && files.length > 0) {
        const filePaths = files.map(f => f.name);
        const { error: storageError } = await supabase.storage
          .from('proofs')
          .remove(filePaths);
        
        if (storageError) {
          console.error('Error deleting from storage:', storageError);
        }
      }

      // Delete file records
      const { error } = await supabase
        .from('files')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (error) {
        console.error('Error deleting file records:', error);
        throw error;
      }

      console.log('Successfully deleted all proof files');
      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'delete_all_data') {
      // Delete in order due to foreign key constraints
      const { error: paymentError } = await supabase
        .from('payment_info')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (paymentError) {
        console.error('Error deleting payment info:', paymentError);
        throw paymentError;
      }

      const { error: assignmentsError } = await supabase
        .from('assignments')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (assignmentsError) {
        console.error('Error deleting assignments:', assignmentsError);
        throw assignmentsError;
      }

      const { error: enrollmentsError } = await supabase
        .from('enrollments')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (enrollmentsError) {
        console.error('Error deleting enrollments:', enrollmentsError);
        throw enrollmentsError;
      }

      // Delete storage files
      const { data: files } = await supabase.storage.from('proofs').list();
      if (files && files.length > 0) {
        const filePaths = files.map(f => f.name);
        await supabase.storage.from('proofs').remove(filePaths);
      }

      // Delete file records
      const { error: filesError } = await supabase
        .from('files')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (filesError) {
        console.error('Error deleting file records:', filesError);
        throw filesError;
      }

      console.log('Successfully deleted all user data');
      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in admin-bulk-actions:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
