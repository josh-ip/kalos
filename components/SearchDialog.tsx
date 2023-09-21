"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useCompletion } from "ai/react";
import {
  X,
  Loader,
  User,
  Frown,
  CornerDownLeft,
  Search,
  Wand,
} from "lucide-react";

export function SearchDialog() {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState<string>("");

  const { complete, completion, isLoading, error } = useCompletion({
    api: "/api/replicate",
  });

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && e.metaKey) {
        setOpen(true);
      }

      if (e.key === "Escape") {
        console.log("esc");
        handleModalToggle();
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  function handleModalToggle() {
    setOpen(!open);
    setQuery("");
  }

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();
    console.log(query);
    complete(query);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="relative z-50 flex min-w-[300px] items-center gap-2 rounded-md border
        border-slate-200 px-4  py-2 text-base
        text-slate-500
        transition-colors
        hover:border-slate-300 hover:text-slate-700 dark:border-slate-500 dark:text-slate-400 dark:hover:border-slate-500
        dark:hover:text-slate-300 "
      >
        <Search width={15} />
        <span className="h-5 border border-l"></span>
        <span className="ml-4 inline-block">Search...</span>
        <kbd
          className="pointer-events-none absolute right-3
          top-2.5 inline-flex h-5 select-none items-center gap-1
          rounded border border-slate-100 bg-slate-100 px-1.5
          font-mono text-[10px] font-medium
          text-slate-600 opacity-100 dark:border-slate-700 dark:bg-slate-900
          dark:text-slate-400 "
        >
          <span className="text-xs">⌘</span>K
        </kbd>{" "}
      </button>
      <Dialog open={open}>
        <DialogContent className="max-h-[80vh] overflow-y-auto text-black sm:max-w-[850px]">
          <DialogHeader>
            <DialogTitle>OpenAI powered doc search</DialogTitle>
            <DialogDescription>
              Build your own ChatGPT style search with Next.js, OpenAI &
              Supabase.
            </DialogDescription>
            <hr />
            <button
              className="absolute top-0 right-2 p-2"
              onClick={() => setOpen(false)}
            >
              <X className="h-4 w-4 dark:text-gray-100" />
            </button>
          </DialogHeader>

          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4 text-slate-700">
              {query && (
                <div className="flex gap-4">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 p-2 text-center dark:bg-slate-300">
                    <User width={18} />{" "}
                  </span>
                  <p className="mt-0.5 font-semibold text-slate-700 dark:text-slate-100">
                    {query}
                  </p>
                </div>
              )}

              {isLoading && (
                <div className="relative ml-2 flex h-5 w-5 animate-spin">
                  <Loader />
                </div>
              )}

              {error && (
                <div className="flex items-center gap-4">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100 p-2 text-center">
                    <Frown width={18} />
                  </span>
                  <span className="text-slate-700 dark:text-slate-100">
                    Sad news, the search has failed! Please try again.
                  </span>
                </div>
              )}

              {completion && !error ? (
                <div className="flex items-center gap-4 dark:text-white">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500 p-2 text-center">
                    <Wand width={18} className="text-white" />
                  </span>
                  <h3 className="font-semibold">Answer:</h3>
                  {completion}
                </div>
              ) : null}

              <div className="relative">
                <Input
                  placeholder="Ask a question..."
                  name="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="col-span-3"
                />
                <CornerDownLeft
                  className={`absolute top-3 right-5 h-4 w-4 text-gray-300 transition-opacity ${
                    query ? "opacity-100" : "opacity-0"
                  }`}
                />
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-100">
                Or try:{" "}
                <button
                  type="button"
                  className="rounded border
                  border-slate-200 bg-slate-50
                  px-1.5 py-0.5
                  transition-colors hover:bg-slate-100 dark:border-slate-600 dark:bg-gray-500
                  dark:hover:bg-gray-600"
                  onClick={(_) => setQuery("What are embeddings?")}
                >
                  What are embeddings?
                </button>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" className="bg-red-500">
                Ask
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
