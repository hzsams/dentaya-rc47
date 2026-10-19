import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const production =
    process.env.NEXT_PUBLIC_DENTAYA_RELEASE_CHANNEL ===
    "production";

  if (production) {
    return {
      rules: {
        userAgent: "*",
        allow: "/",
      },
    };
  }

  return {
    rules: {
      userAgent: "*",
      disallow: "/",
    },
  };
}
