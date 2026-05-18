import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TripVibe — AI 여행 플래너",
    short_name: "TripVibe",
    description: "AI가 만들어주는 나만의 완벽한 여행 일정",
    start_url: "/",
    display: "standalone",
    background_color: "#080c18",
    theme_color: "#080c18",
    orientation: "portrait",
    lang: "ko",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icon-maskable.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
