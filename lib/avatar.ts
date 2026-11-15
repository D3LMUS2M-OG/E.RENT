/** Profile pictures live in the public "avatars" bucket. profiles.avatar_url stores the path inside it. */
export const avatarUrl = (path: string | null | undefined) =>
  path ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${path}` : null;
