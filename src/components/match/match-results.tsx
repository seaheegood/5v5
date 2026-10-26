"use client";

import { useRef, useState, useTransition } from "react";
import { ChevronDown, ImagePlus, Trash2, Undo2 } from "lucide-react";
import { castVote, deleteScreenshot, reopenMatch, uploadScreenshot } from "@/app/actions/results";
import { MAX_SCREENSHOTS, TEAM_LABEL, VOTE_LABEL } from "@/lib/constants";
import type { MatchResults as Results, Participant, Screenshot, Team, VoteKind } from "@/lib/types";
import { cn } from "@/lib/utils";
import { LaneIcon } from "../icons/lane-icon";
import { Button } from "../ui/button";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "../ui/drawer";
import { TEAM_STYLE } from "./team-style";

type Me = { id: string; isAdmin: boolean };

/** 최다 득표자 닉네임 (동률이면 모두) */
function leaders(tally: Record<string, number>, participants: Participant[]): string | null {
  const max = Math.max(0, ...Object.values(tally));
  if (max === 0) return null;
  return participants
    .filter((p) => tally[p.userId] === max)
    .map((p) => p.nickname)
    .join(", ");
}

const otherTeam = (team: Team): Team => (team === "blue" ? "red" : "blue");

/**
 * 종료된 매치의 결과: 스크린샷 → MVP(이긴 팀) → 범인(진 팀). (댓글은 티켓 맨 아래에 항상)
 * 관리자는 맨 아래에서 종료를 취소할 수 있다.
 */
export function MatchResults({
  date,
  participants,
  results,
  me,
  defaultOpen = false,
}: {
  date: string;
  participants: Participant[];
  results: Results;
  me: Me;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [reopening, startReopen] = useTransition();
  const mvp = leaders(results.tallies.mvp, participants);
  const blame = leaders(results.tallies.blame, participants);

  const reopen = () => {
    if (!confirm("종료를 취소할까요? 팀 배정과 투표가 지워져요. (댓글/사진은 유지)")) return;
    startReopen(async () => {
      const result = await reopenMatch(date);
      if (!result.ok) alert(result.error);
    });
  };

  return (
    <section className={cn("mt-3 rounded-xl bg-background/50", reopening && "opacity-50")}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex min-h-12 w-full items-center gap-2 px-4 py-2 text-left"
      >
        <span className="shrink-0 font-bold">결과</span>
        <span className="flex-1 truncate text-sm text-muted-foreground">
          {[
            mvp && `MVP ${mvp}`,
            blame && `범인 ${blame}`,
            results.screenshots.length > 0 && `사진 ${results.screenshots.length}`,
          ]
            .filter(Boolean)
            .join(" · ") || "투표 진행 중"}
        </span>
        <ChevronDown className={cn("size-5 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="flex flex-col gap-6 px-4 pt-1 pb-4">
          <Screenshots date={date} screenshots={results.screenshots} me={me} />
          <VoteBlock kind="mvp" date={date} participants={participants} results={results} me={me} />
          <VoteBlock kind="blame" date={date} participants={participants} results={results} me={me} />
          {me.isAdmin && (
            <Button variant="ghost" size="sm" onClick={reopen} disabled={reopening} className="self-center text-muted-foreground">
              <Undo2 className="size-4" />
              종료 취소
            </Button>
          )}
        </div>
      )}
    </section>
  );
}

function VoteBlock({
  kind,
  date,
  participants,
  results,
  me,
}: {
  kind: VoteKind;
  date: string;
  participants: Participant[];
  results: Results;
  me: Me;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const tally = results.tallies[kind];
  const myVote = results.myVotes[kind];
  // MVP 는 이긴 팀에서, 범인은 진 팀에서. 투표는 그 경기 10명만
  const candidateTeam = kind === "mvp" ? results.winner : otherTeam(results.winner);
  const candidates = participants.filter((p) => results.teams[p.userId] === candidateTeam);
  const canVote = me.id in results.teams;
  const max = Math.max(0, ...Object.values(tally));
  const accent = kind === "mvp" ? "primary" : "destructive";

  // 같은 사람을 다시 누르면 취소
  const vote = (targetId: string) =>
    startTransition(async () => {
      setError(null);
      const result = await castVote({ date, kind, targetId: myVote === targetId ? null : targetId });
      if (!result.ok) setError(result.error);
    });

  return (
    <div className={cn("flex flex-col gap-2", pending && "opacity-60")}>
      <div className="flex items-baseline justify-between">
        <h4 className={cn("font-bold", accent === "primary" ? "text-primary" : "text-destructive")}>
          {VOTE_LABEL[kind]}
          <span className={cn("ml-1.5 text-xs font-semibold", TEAM_STYLE[candidateTeam].text)}>
            {TEAM_LABEL[candidateTeam]} {kind === "mvp" ? "(승)" : "(패)"}
          </span>
        </h4>
        <span className="text-xs text-muted-foreground">{canVote ? "익명 투표" : "경기한 10명만 투표"}</span>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {candidates.map((p) => {
          const count = tally[p.userId] ?? 0;
          const mine = myVote === p.userId;
          const top = count > 0 && count === max;
          return (
            <button
              key={p.userId}
              type="button"
              disabled={!canVote || p.userId === me.id || pending}
              onClick={() => vote(p.userId)}
              aria-pressed={mine}
              className={cn(
                "flex h-11 items-center gap-1.5 rounded-lg border-2 px-2 text-sm transition-all active:scale-95 disabled:active:scale-100",
                mine
                  ? accent === "primary"
                    ? "border-primary bg-primary/15"
                    : "border-destructive bg-destructive/15"
                  : "border-border",
              )}
            >
              {p.lane && <LaneIcon lane={p.lane} className="size-4" />}
              <span className={cn("flex-1 truncate text-left", top && "font-bold")}>{p.nickname}</span>
              {count > 0 && (
                <span
                  className={cn(
                    "font-bold tabular-nums",
                    top ? (accent === "primary" ? "text-primary" : "text-destructive") : "text-muted-foreground",
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
      {error && <p className="text-sm font-semibold text-destructive">{error}</p>}
    </div>
  );
}

/** 긴 변 1920px, JPEG 85% 로 줄여서 업로드 (게임 스크린샷 PNG 3~5MB → 수백 KB) */
async function compress(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1920 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
  return blob ? new File([blob], "screenshot.jpg", { type: "image/jpeg" }) : file;
}

function Screenshots({ date, screenshots, me }: { date: string; screenshots: Screenshot[]; me: Me }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewing, setViewing] = useState<Screenshot | null>(null);
  const [open, setOpen] = useState(false);
  const [deleting, startDelete] = useTransition();
  const remaining = MAX_SCREENSHOTS - screenshots.length;

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setError(null);
    const list = [...files].slice(0, remaining);
    for (const [i, file] of list.entries()) {
      setProgress(`${i + 1}/${list.length}`);
      try {
        const formData = new FormData();
        formData.set("date", date);
        formData.set("file", await compress(file));
        const result = await uploadScreenshot(formData);
        if (!result.ok) {
          setError(result.error);
          break;
        }
      } catch {
        setError("이미지를 읽을 수 없어요.");
        break;
      }
    }
    setProgress(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const show = (shot: Screenshot) => {
    setViewing(shot);
    setOpen(true);
  };

  const remove = () => {
    if (!viewing || !confirm("스크린샷을 삭제할까요?")) return;
    startDelete(async () => {
      const result = await deleteScreenshot(viewing.id);
      if (result.ok) setOpen(false);
      else alert(result.error);
    });
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <h4 className="font-bold">스크린샷</h4>
        <span className="text-xs text-muted-foreground tabular-nums">
          {screenshots.length}/{MAX_SCREENSHOTS}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        {screenshots.map((shot) => (
          <button
            key={shot.id}
            type="button"
            onClick={() => show(shot)}
            className="aspect-video overflow-hidden rounded-lg bg-muted"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={shot.url} alt="경기 결과 스크린샷" className="size-full object-cover" />
          </button>
        ))}
        {remaining > 0 && (
          <button
            type="button"
            disabled={progress !== null}
            onClick={() => inputRef.current?.click()}
            className="flex aspect-video flex-col items-center justify-center gap-0.5 rounded-lg border-2 border-dashed text-xs text-muted-foreground disabled:opacity-60"
          >
            <ImagePlus className="size-5" />
            {progress ? `올리는 중 ${progress}` : "추가"}
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => onFiles(e.target.files)}
      />
      {error && <p className="text-sm font-semibold text-destructive">{error}</p>}

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>스크린샷</DrawerTitle>
            <DrawerDescription>{viewing?.uploaderNickname ?? "탈퇴한 멤버"}</DrawerDescription>
          </DrawerHeader>
          {viewing && (
            <div className="flex flex-col gap-3 px-5">
              <a href={viewing.url} target="_blank" rel="noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={viewing.url}
                  alt="경기 결과 스크린샷"
                  className="max-h-[65dvh] w-full rounded-lg object-contain"
                />
              </a>
              {(viewing.uploaderId === me.id || me.isAdmin) && (
                <Button variant="outline" onClick={remove} disabled={deleting}>
                  <Trash2 className="size-5 text-destructive" />
                  삭제
                </Button>
              )}
            </div>
          )}
        </DrawerContent>
      </Drawer>
    </div>
  );
}
