import { createFileRoute } from "@tanstack/react-router";
import { BallDropGame } from "@/components/BallDropGame";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Ball Drop Merge — Drop, Merge, Grow" },
      { name: "description", content: "A casual physics puzzle: drop balls, merge matching levels, and chase your best score." },
      { property: "og:title", content: "Ball Drop Merge" },
      { property: "og:description", content: "Drop balls, merge matching levels, and chase your best score." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <BallDropGame />,
});
