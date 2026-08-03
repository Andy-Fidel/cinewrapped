# Supabase Setup

CineWrapped delegates credentials, email verification, recovery links, Google OAuth, and Apple OAuth to Supabase Auth. The API accepts only verified Supabase JWTs and maps their immutable `sub` claim to an internal application user.

## Authentication

1. Create a Supabase project and copy its HTTPS project URL and public anon key into the Expo public variables.
2. Configure the same project URL, JWT issuer, authenticated audience, and JWKS URL for the API.
3. Enable email/password. Require email confirmation outside isolated local testing.
4. Configure Google and Apple with provider-owned client identifiers and secrets in the Supabase dashboard. Never place OAuth secrets in Expo variables.
5. Add `cinewrapped://auth/callback` and the deployed web callback URL to the allowed redirect list. Add `cinewrapped://(auth)/update-password` if the dashboard requires exact recovery redirects.

## Avatar storage

Create a public Storage bucket named `avatars` with an image-only MIME allowlist and an appropriate file-size limit. Public read access is intentional for avatar delivery; unlisted profile and social surfaces must still enforce application privacy before revealing the URL.

Apply owner-folder write policies. The mobile client stores objects under `<auth.uid()>/<random>.jpg`:

```sql
create policy "avatar owners can insert"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "avatar owners can update"
on storage.objects for update to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "avatar owners can delete"
on storage.objects for delete to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);
```

Do not add an anonymous write policy. Bucket creation and policy installation are deployment steps, not runtime application behavior.
