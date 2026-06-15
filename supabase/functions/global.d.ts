/**
 * Supabase Edge Functions run on Deno. The Next.js tsconfig excludes this tree,
 * so we declare the globals the IDE needs for typechecking.
 */
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
  serve: (
    handler: (request: Request) => Response | Promise<Response>,
  ) => void;
};

/** Deno resolves this URL at runtime; map to npm types for the IDE. */
declare module "https://esm.sh/@supabase/supabase-js@2.45.0" {
  export function createClient(
    supabaseUrl: string,
    supabaseKey: string,
    options?: import("@supabase/supabase-js").SupabaseClientOptions<
      string
    >,
  ): import("@supabase/supabase-js").SupabaseClient;
}
