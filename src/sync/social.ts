import type { Bundle } from "../content/types";

export type BoardRow = {
  nickname: string;
  xp: number;
  level: number;
  lessons: number;
  bossesWon: number;
  hardWins: number;
  furthestWorld: string | null;
  lastActive: string;
};
export type PlayerCard = BoardRow & { joined: string; trophies: string[]; recent: NewsItem[] };
export type NewsItem = {
  nickname: string;
  kind: "lesson_passed" | "boss_won" | "boss_hard_won";
  id: string;
  day: string;
};

// News carries ids, not titles: the browser looks titles up in its bundle, so the server never sends text it did not write.
export function newsLine(item: NewsItem, bundle: Bundle): string {
  if (item.kind === "lesson_passed") {
    return `${item.nickname} finished ${bundle.lessons.find((l) => l.id === item.id)?.title ?? "something new"}`;
  }
  const boss = bundle.bosses.find((b) => b.id === item.id)?.title ?? "something new";
  return item.kind === "boss_won"
    ? `${item.nickname} beat ${boss}`
    : `${item.nickname} beat ${boss} on hard mode`;
}
