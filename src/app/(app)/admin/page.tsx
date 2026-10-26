import { redirect } from "next/navigation";
import { AddMemberForm } from "@/components/profile/add-member-form";
import { AdminUserCard } from "@/components/profile/admin-user-card";
import { requireUser } from "@/lib/auth";
import { getUsers } from "@/lib/data";

export default async function AdminPage() {
  const me = await requireUser();
  if (!me.is_admin) redirect("/");
  const users = await getUsers();

  return (
    <div className="flex flex-col gap-4">
      <AddMemberForm />
      <h2 className="mt-2 text-xl font-bold">멤버 {users.length}명</h2>
      <ul className="flex flex-col gap-2">
        {users.map((user) => (
          <AdminUserCard key={user.id} user={user} isMe={user.id === me.id} />
        ))}
      </ul>
    </div>
  );
}
