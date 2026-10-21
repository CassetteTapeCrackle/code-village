import type { Activity } from "./routines";

// What villagers say when hovered. Chatter is always there; a tip waits for its lesson to be passed;
// an activity line only fits while they are doing it. Nudges come from the village state (see talk.ts).
export type Line = {
  text: string;
  kind: "chatter" | "tip" | "activity";
  lesson?: string;
  activity?: Activity;
};
export type LineMemory = { used: number[]; sinceNudge: number };
export type LineContext = { passed: string[]; nudge: string | null; activity: Activity | null };

const chatter = (text: string): Line => ({ text, kind: "chatter" });
const tip = (lesson: string, text: string): Line => ({ text, kind: "tip", lesson });
const doing = (activity: Activity, text: string): Line => ({ text, kind: "activity", activity });

export const LINES: Record<string, Line[]> = {
  Ines: [
    chatter("I sweep the schoolhouse step every morning. The leaves never read the sign."),
    chatter("I sorted the library by colour once. Ms. Juniper put it back in alphabetical order."),
    chatter("Mochi naps on the bench by the square when nobody is looking."),
    chatter("A tidy desk is a tidy mind. A tidy notebook is a miracle."),
    chatter("The windmill squeaks in the same rhythm as my kettle."),
    chatter("I keep a list of every book I have read. It is getting long."),
    tip("conditions", "One = stores a value, two == compare them. I wrote it on my broom handle."),
    tip("strings", "Strings never change. upper() hands you a brand new one, so keep it."),
    tip("dicts", "A dict is a very well labelled drawer. Use .get() when the label might be missing."),
    tip("errors", "When a traceback looks scary, read its last line first. It is usually honest."),
    doing("sweep", "Mind the broom!"),
    doing("read", "Shh, I am at the good part."),
    doing("water", "The garden drinks more than Sam does."),
  ],
  Juniper: [
    chatter("Good morning! Punctuality is the first kindness a programmer learns."),
    chatter(
      "I keep a spare pencil for anyone who forgot theirs. And a spare semicolon, though Python never asks.",
    ),
    chatter("Every error message is a letter from the computer. Read it to the end."),
    chatter("The library is alphabetical again. Ines and I have an understanding."),
    chatter("I write my lesson notes in a notebook with a margin for second thoughts."),
    chatter("A quiet classroom is a running program. A noisy one is running too, just louder."),
    tip("functions", "A function has one job. Name it like a promise, then keep it."),
    tip("errors", "Read the traceback from the bottom up. The last line usually tells the truth first."),
    tip(
      "strings",
      "In quotes it is data; without quotes it is a name. That one difference is half of programming.",
    ),
    tip("dicts", "A dict maps a key to a value, like a name to a desk. Every key has its own seat."),
    doing("read", "Reading over your exercises. They are coming along."),
    doing("chat", "Come closer. I am all ears, and I brought spare pencils."),
  ],
  Sam: [
    chatter("The river is cold, but the bridge is warm by noon."),
    chatter("I caught nine fish today. Or ten. I always lose count at the end."),
    chatter("Fishing is mostly patience. The rest is pretending you meant to catch that boot."),
    chatter("The ducks and I have an understanding. They get the bread crusts."),
    chatter("Fog up north again. Nobody has crossed those rocks in years."),
    chatter("The best spot on the river is the middle of the bridge. Do not tell Mika."),
    tip("loops", "range(1, 10) stops at 9. Ask me how I know."),
    tip("lists", "Lists start at zero. My first fish was fish number zero. He was small."),
    tip("grids", "A grid is a list of lists. Like my tackle box: rows of little rows."),
    tip("recursion", "Every recursion needs a base case, or you go on fishing forever."),
    doing("fish", "Quiet, they are biting!"),
    doing("carry", "Heavy crate. Heavier than it looks."),
  ],
  Lou: [
    chatter("I bake on Sundays. The rest of the week I debug my oven timer."),
    chatter("The bread rose twice today. Once on purpose."),
    chatter("Flour, water, salt and a little patience. Same recipe as a good function."),
    chatter("Smell that? Cinnamon. Or something burning. Hard to say from here."),
    chatter("I name every loaf. Today's are Loaf 0 to Loaf 11."),
    chatter("The stall opens early. The croissants wait for nobody."),
    tip("values", '"3" + "4" is "34". I once ordered 34 eggs that way.'),
    tip("input-output", "input() always gives you text. Turn it into a number before you count with it."),
    tip("functions", "A function is a recipe: ingredients go in, and return hands you the loaf."),
    tip("comprehensions", "[loaf for loaf in oven if loaf.ready]. That is my whole morning."),
    doing("carry", "Fresh bread coming through!"),
    doing("sweep", "Flour gets everywhere."),
  ],
  Wren: [
    chatter("Mushrooms are like generators. You only pick the next one when you need it."),
    chatter("The brook moved a stone this morning. I moved it back. We will see who wins."),
    chatter("Chanterelles on the north side, blackberries on the south. Do not tell the squirrels."),
    chatter("My hut has one room and a lot of baskets. Baskets inside baskets, really."),
    chatter("The deer leave the best paths. I just follow them and call it foraging."),
    chatter("Noa counts squirrels. I count mushrooms. We argue about which is harder."),
    tip("classes", "A basket class, a hundred basket objects. I only had to weave the pattern once."),
    tip("composition", "My forager kit has a knife, a basket and a map. It is not a knife. It has one."),
    tip("generators", "yield one berry at a time and your basket never overflows."),
    doing("carry", "Full basket! Mind the brambles."),
    doing("water", "A little water and the herbs perk right up."),
  ],
  Noa: [
    chatter("Every tree here is an instance of Tree. Some of them have overridden grow()."),
    chatter("I count the squirrels each morning. They keep changing their attributes."),
    chatter("The forest was dark for years. Then someone brought a lantern."),
    chatter("I keep my maps in the cabin. One map, many copies. Not the same object, mind you."),
    chatter("Owls are birds, birds are animals. Inheritance is just a family tree."),
    chatter("A ranger has a backpack. A ranger is not a backpack. I say it twice a week."),
    tip("classes", "Forgot self in a method? Python will hand it over anyway, and then complain."),
    tip("identity", "Two equal pinecones are still two pinecones. == asks one thing, is asks another."),
    tip("dunders", "Give your class a __str__ and print finally says something useful."),
    tip(
      "dataclasses",
      "A dataclass writes the boring parts for you. Just never give it a list as a default.",
    ),
    tip("testing", "I test my traps before every walk. assert first, trust later."),
    doing("sweep", "Pine needles everywhere. Every single day."),
    doing("water", "The brambles like a drink before noon."),
  ],
  Alex: [
    chatter("I counted the stars last night. The median star is very average."),
    chatter("The wind up here has a standard deviation. You feel it in your ears."),
    chatter("A telescope is just a very patient way of reading data."),
    chatter("I log the weather every hour. The log logs me back, some days."),
    chatter("The rockslide moved once. Someone with a ranger's badge climbed right over it."),
    chatter(
      "Every star in my catalogue has two numbers. The trick is making them talk to each other fairly.",
    ),
    tip(
      "generators",
      "A generator is like the night sky: once the stars have passed, they do not come round again till you start over.",
    ),
    tip(
      "pandas-tables",
      "One question mark in a column and pandas reads it all as text. I learned that from a smudged logbook.",
    ),
    tip("numpy-arrays", "A list times two is the list twice. An array times two is twice as bright."),
    tip("statistics", "One freak gust drags the mean. The median keeps its feet on the ground."),
    tip("nearest-neighbour", "Scale your features first, or the biggest numbers shout over everyone else."),
    tip("train-test", "Never grade a model on the stars it learned from. It will tell you it is perfect."),
    doing("read", "Shh. I am counting."),
    doing("carry", "Careful, this crate is full of lenses."),
  ],
  Mika: [
    chatter("I hung every one of those flags myself. Two of them twice, after an off-by-one."),
    chatter("Bunting is just a list of triangles, if you think about it."),
    chatter("Next festival I want lanterns on every path. Even the blocked ones."),
    chatter("The fountain needs more ducks. I have asked the ducks."),
    chatter("Red, yellow, green, blue, repeat. Patterns make everything feel calm."),
    chatter("I painted the stall stripes. They are uneven on purpose. Mostly."),
    tip("loops", "for flag in flags: hang(flag). I could do it in my sleep."),
    tip("comprehensions", "zip pairs flags with hooks, and stops quietly when the shorter one runs out."),
    tip("dicts", "My colour chart is a dict: each flag's name points at its colour."),
    tip("functions", "Never give a function a list as its default. It remembers. Forever."),
    doing("water", "Flowers first, flags second."),
    doing("read", "This book has a whole chapter on knots."),
  ],
};

export const freshMemory = (): LineMemory => ({ used: [], sinceNudge: 3 });

// The next thing a villager says. A nudge wins when one is due and at least three lines have passed since
// the last; otherwise a line they have not said yet, starting over once every fitting line was used.
export function pickLine(
  name: string,
  memory: LineMemory,
  ctx: LineContext,
  random: () => number = Math.random,
): { text: string; memory: LineMemory } {
  if (ctx.nudge && memory.sinceNudge >= 3) return { text: ctx.nudge, memory: { ...memory, sinceNudge: 0 } };
  const lines = LINES[name] ?? LINES.Ines;
  const fits = (l: Line): boolean =>
    l.kind === "chatter" ||
    (l.kind === "tip" && ctx.passed.includes(l.lesson ?? "")) ||
    (l.kind === "activity" && l.activity === ctx.activity);
  const eligible = lines.flatMap((l, i) => (fits(l) ? [i] : []));
  let fresh = eligible.filter((i) => !memory.used.includes(i));
  let used = memory.used;
  if (fresh.length === 0) {
    fresh = eligible;
    used = [];
  }
  const pick = fresh[Math.floor(random() * fresh.length)];
  return { text: lines[pick].text, memory: { used: [...used, pick], sinceNudge: memory.sinceNudge + 1 } };
}
