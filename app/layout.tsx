import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "@/components/LanguageProvider";
import FeedbackWidget from "@/components/FeedbackWidget";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://ceritabel.vercel.app"),
  title: "ceritabel: upload your data, understand it in plain language",
  description:
    "Upload a CSV and ceritabel runs a correct statistical EDA in your browser, then explains the findings in plain language with AI.",
  applicationName: "ceritabel",
  keywords: [
    "EDA",
    "exploratory data analysis",
    "CSV",
    "statistics",
    "data analysis",
    "AI insight",
  ],
  authors: [{ name: "ceritabel" }],
  openGraph: {
    title: "ceritabel: upload your data, understand it in plain language",
    description:
      "A correct statistical EDA in your browser. All numbers computed in code; AI only explains them in plain language.",
    siteName: "ceritabel",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ceritabel: upload your data, understand it in plain language",
    description:
      "A correct statistical EDA in your browser. AI explains the findings; it never invents the numbers.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-accent="hazard"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {/* Apply the saved accent before first paint - no color flash. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var a=localStorage.getItem('ceritabel-accent');if(a){document.documentElement.dataset.accent=a;}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <LanguageProvider>
          {children}
          <FeedbackWidget />
        </LanguageProvider>
      </body>
    </html>
  );
}
