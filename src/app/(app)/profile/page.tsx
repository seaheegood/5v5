import { PinChangeForm } from "@/components/profile/pin-change-form";
import { ProfileForm } from "@/components/profile/profile-form";
import { requireUser } from "@/lib/auth";

export default async function ProfilePage() {
  const me = await requireUser();

  return (
    <div className="flex flex-col gap-5">
      <section className="rounded-2xl bg-card p-5">
        <h2 className="mb-5 text-xl font-bold">프로필</h2>
        <ProfileForm user={me} />
      </section>
      <section className="rounded-2xl bg-card p-5">
        <h2 className="mb-4 text-xl font-bold">PIN 변경</h2>
        <PinChangeForm />
      </section>
    </div>
  );
}
