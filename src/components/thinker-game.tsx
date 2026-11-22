"use client";

import { useCallback, useEffect, useState } from "react";
import { RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

type ColorCode = "R" | "G" | "B" | "Y";

type GameColor = {
  code: ColorCode;
  name: string;
  hex: string;
  ink: string;
};

const COLORS: GameColor[] = [
  { code: "R", name: "Красный", hex: "#e74c3c", ink: "#ffffff" },
  { code: "G", name: "Зелёный", hex: "#27ae60", ink: "#ffffff" },
  { code: "B", name: "Синий", hex: "#3498db", ink: "#ffffff" },
  { code: "Y", name: "Жёлтый", hex: "#f1c40f", ink: "#1f2937" },
];

const CODE_LENGTH = 4;
const MAX_ATTEMPTS = 6;

type Evaluation = { blacks: number; whites: number };
type Board = (ColorCode | null)[][];

const emptyBoard = (): Board =>
  Array.from({ length: MAX_ATTEMPTS }, () =>
    Array<ColorCode | null>(CODE_LENGTH).fill(null),
  );

function createSecret(): ColorCode[] {
  const pool = COLORS.map((color) => color.code);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool;
}

function evaluateGuess(guess: ColorCode[], secret: ColorCode[]): Evaluation {
  const guessLeft: (ColorCode | null)[] = [...guess];
  const secretLeft: (ColorCode | null)[] = [...secret];
  let blacks = 0;
  let whites = 0;

  for (let i = 0; i < CODE_LENGTH; i++) {
    if (guessLeft[i] !== null && guessLeft[i] === secretLeft[i]) {
      blacks++;
      guessLeft[i] = null;
      secretLeft[i] = null;
    }
  }

  for (let i = 0; i < CODE_LENGTH; i++) {
    const code = guessLeft[i];
    if (code === null) continue;
    const match = secretLeft.indexOf(code);
    if (match !== -1) {
      whites++;
      secretLeft[match] = null;
    }
  }

  return { blacks, whites };
}

const colorByCode = (code: ColorCode) =>
  COLORS.find((color) => color.code === code);

const toneClass = {
  info: "text-muted-foreground",
  error: "text-destructive",
  success: "text-emerald-600 dark:text-emerald-400",
} as const;

export function ThinkerGame() {
  // The code stays hidden while playing, so drawing it during the lazy
  // initializer keeps the server and client markup identical.
  const [secret, setSecret] = useState<ColorCode[]>(createSecret);
  const [board, setBoard] = useState<Board>(emptyBoard);
  const [results, setResults] = useState<(Evaluation | null)[]>(() =>
    Array(MAX_ATTEMPTS).fill(null),
  );
  const [activeRow, setActiveRow] = useState(0);
  const [status, setStatus] = useState<"playing" | "won" | "lost">("playing");
  const [message, setMessage] = useState<{
    text: string;
    tone: keyof typeof toneClass;
  }>({
    text: "Кликните по ячейкам, чтобы выбрать цвета.",
    tone: "info",
  });

  const startNewGame = useCallback(() => {
    setSecret(createSecret());
    setBoard(emptyBoard());
    setResults(Array(MAX_ATTEMPTS).fill(null));
    setActiveRow(0);
    setStatus("playing");
    setMessage({
      text: "Кликните по ячейкам, чтобы выбрать цвета.",
      tone: "info",
    });
  }, []);

  const submitActiveRow = useCallback(() => {
    if (status !== "playing" || secret.length !== CODE_LENGTH) return;

    const row = board[activeRow];
    if (row.some((code) => code === null)) {
      setMessage({ text: "Заполните все четыре ячейки.", tone: "error" });
      return;
    }

    const guess = row as ColorCode[];
    if (new Set(guess).size !== CODE_LENGTH) {
      setMessage({
        text: "Цвета в попытке не должны повторяться.",
        tone: "error",
      });
      return;
    }

    const evaluation = evaluateGuess(guess, secret);
    const nextResults = results.slice();
    nextResults[activeRow] = evaluation;
    setResults(nextResults);

    if (evaluation.blacks === CODE_LENGTH) {
      setStatus("won");
      setMessage({ text: "Победа! Код разгадан.", tone: "success" });
      return;
    }

    const nextRow = nextResults.findIndex((result) => result === null);
    if (nextRow === -1) {
      setStatus("lost");
      setMessage({
        text: "Попытки закончились. Загаданный код был другим.",
        tone: "error",
      });
      return;
    }

    setActiveRow(nextRow);
    setMessage({
      text:
        evaluation.blacks + evaluation.whites === 0
          ? "Ни один цвет не угадан. Попробуйте другую комбинацию."
          : "Есть совпадения. Продолжайте подбирать код.",
      tone: "info",
    });
  }, [activeRow, board, results, secret, status]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      submitActiveRow();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [submitActiveRow]);

  const handleCellClick = (rowIndex: number, position: number) => {
    if (status !== "playing" || results[rowIndex] !== null) return;

    if (rowIndex !== activeRow) {
      setActiveRow(rowIndex);
      setMessage({
        text: "Кликните по ячейкам, чтобы выбрать цвета.",
        tone: "info",
      });
      return;
    }

    const nextBoard = board.map((row) => row.slice());
    const current = nextBoard[rowIndex][position];
    const currentIndex = current
      ? COLORS.findIndex((color) => color.code === current)
      : -1;
    nextBoard[rowIndex][position] =
      COLORS[(currentIndex + 1) % COLORS.length].code;
    setBoard(nextBoard);

    setMessage({
      text: nextBoard[rowIndex].every((code) => code !== null)
        ? "Ряд заполнен. Нажмите Enter, чтобы оценить попытку."
        : "Выбирайте цвета для ячеек.",
      tone: "info",
    });
  };

  const revealed = status !== "playing";

  return (
    <Card className="w-full">
      <CardHeader className="items-center text-center">
        <CardTitle className="text-2xl">Мыслитель</CardTitle>
        <CardDescription className="max-w-sm text-balance">
          Угадайте код из четырёх разных цветов за шесть попыток. Чёрная точка —
          цвет на своём месте, светлая — цвет есть, но стоит не там.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="flex items-center justify-center gap-4">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Код
          </span>
          <div className="flex gap-2">
            {Array.from({ length: CODE_LENGTH }).map((_, position) => {
              const code = secret[position];
              const color = revealed && code ? colorByCode(code) : null;
              return (
                <div
                  key={position}
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-lg border text-sm font-bold",
                    color
                      ? "border-transparent"
                      : "border-dashed border-border bg-muted/40 text-muted-foreground",
                  )}
                  style={
                    color ? { backgroundColor: color.hex, color: color.ink } : undefined
                  }
                >
                  {color ? color.code : "?"}
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          {board.map((row, rowIndex) => {
            const result = results[rowIndex];
            const isActive = rowIndex === activeRow && result === null;
            const isLocked = result !== null;

            return (
              <div
                key={rowIndex}
                className={cn(
                  "flex items-center gap-2 rounded-xl px-2 py-1.5 transition-colors sm:gap-3",
                  isActive && "bg-accent/60 ring-1 ring-inset ring-primary/40",
                  !isActive && !isLocked && "hover:bg-muted/60",
                )}
              >
                <span className="w-4 shrink-0 text-xs tabular-nums text-muted-foreground">
                  {rowIndex + 1}
                </span>

                <div className="flex gap-2">
                  {row.map((code, position) => {
                    const color = code ? colorByCode(code) : null;
                    return (
                      <button
                        key={position}
                        type="button"
                        onClick={() => handleCellClick(rowIndex, position)}
                        disabled={status !== "playing" || isLocked}
                        aria-label={color ? `Цвет: ${color.name}` : "Пустая ячейка"}
                        className={cn(
                          "flex h-10 w-10 items-center justify-center rounded-lg border-2 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed sm:h-11 sm:w-11",
                          color
                            ? "border-transparent"
                            : "border-dashed border-border bg-muted/40",
                          !isLocked &&
                            status === "playing" &&
                            "cursor-pointer hover:border-primary/50",
                        )}
                        style={
                          color
                            ? { backgroundColor: color.hex, color: color.ink }
                            : undefined
                        }
                      >
                        {color ? color.code : ""}
                      </button>
                    );
                  })}
                </div>

                <div className="ml-auto grid grid-cols-2 gap-1 self-center">
                  {Array.from({ length: CODE_LENGTH }).map((_, pegIndex) => {
                    const isExact = !!result && pegIndex < result.blacks;
                    const isNear =
                      !!result &&
                      pegIndex >= result.blacks &&
                      pegIndex < result.blacks + result.whites;
                    return (
                      <span
                        key={pegIndex}
                        className={cn(
                          "h-3 w-3 rounded-full border",
                          isExact && "border-transparent bg-zinc-900 dark:bg-zinc-100",
                          isNear && "border-zinc-400 dark:border-zinc-500",
                          !isExact && !isNear && "border-border bg-muted/40",
                        )}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
          {COLORS.map((color) => (
            <span key={color.code} className="inline-flex items-center gap-1.5">
              <span
                className="h-3.5 w-3.5 rounded-full border border-black/10"
                style={{ backgroundColor: color.hex }}
              />
              {color.name}
            </span>
          ))}
        </div>

        <div className="flex flex-col items-center gap-3 border-t pt-5 sm:flex-row sm:justify-between">
          <p
            aria-live="polite"
            className={cn("text-sm font-medium", toneClass[message.tone])}
          >
            {message.text}
          </p>
          <Button onClick={startNewGame} className="shrink-0">
            <RotateCcw />
            Новая игра
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
