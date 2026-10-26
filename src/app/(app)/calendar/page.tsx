import { CalendarView } from "@/components/calendar/calendar-view";
import { requireUser } from "@/lib/auth";
import { getFinishedDates, getSchedules, getUsers } from "@/lib/data";
import { isValidDate, monthRange, parseMonth, todayKST } from "@/lib/date";

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; date?: string }>;
}) {
  const me = await requireUser();
  const params = await searchParams;

  // ?date=2026-10-24 로 들어오면 해당 월을 보여주고 바텀 시트를 바로 연다
  const date = isValidDate(params.date) ? params.date : undefined;
  const { year, month } = parseMonth(params.month ?? date?.slice(0, 7));
  const monthKey = `${year}-${String(month).padStart(2, "0")}`;
  const initialDate = date?.startsWith(monthKey) ? date : undefined;

  const { from, to } = monthRange(year, month);
  const [schedules, users] = await Promise.all([getSchedules({ from, to }), me.is_admin ? getUsers() : []]);
  const finishedDates = await getFinishedDates([...new Set(schedules.map((s) => s.play_date))]);

  return (
    <CalendarView
      key={`${monthKey}-${initialDate ?? ""}`}
      year={year}
      month={month}
      today={todayKST()}
      schedules={schedules}
      me={me}
      users={users}
      finishedDates={finishedDates}
      initialDate={initialDate}
    />
  );
}
