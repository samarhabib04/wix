import { redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ id: string }>;
};

/** Admin dashboard links use /user-profile/:id; the real page lives at /users/:id. */
export default async function UserProfileAliasPage({ params }: PageProps) {
  const { id } = await params;
  redirect(`/users/${id}`);
}
