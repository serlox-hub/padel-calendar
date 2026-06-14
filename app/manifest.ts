import type { MetadataRoute } from "next";

/**
 * PWA manifest. Lets the app be "installed" to the home screen, which on iOS
 * is a hard requirement before web push notifications are allowed.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "No puedo, tengo pádel",
    short_name: "Pádel",
    description: "Apúntate al partido de la mañana o de la tarde",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#059669",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
