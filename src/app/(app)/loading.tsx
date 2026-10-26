/**
 * 화면 이동 중 바로 보여주는 자리표시 (헤더/탭바는 유지).
 * 서버 응답을 기다리는 동안에도 "눌렸다"는 게 바로 보이게 한다.
 */
export default function Loading() {
  return (
    <div aria-busy="true" aria-label="불러오는 중" className="flex flex-col gap-3">
      <div className="mx-auto mb-1 size-7 animate-spin rounded-full border-[3px] border-muted border-t-primary" />
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex animate-pulse flex-col gap-3 rounded-2xl bg-card p-4">
          <div className="h-6 w-2/5 rounded-md bg-muted" />
          <div className="h-3 w-full rounded-full bg-muted" />
          <div className="h-4 w-3/5 rounded-md bg-muted" />
        </div>
      ))}
    </div>
  );
}
