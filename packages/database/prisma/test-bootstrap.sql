-- Supabase provides these PostgREST roles in hosted environments. A plain
-- PostgreSQL integration database needs compatible no-login roles so the
-- production privilege-hardening migrations can be exercised unchanged.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
end
$$;
