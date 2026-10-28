// Optional dated backup of actual public interactions. No mock routes, credentials or real business inputs.
import { chromium, expect } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
const origin = "https://tastekey.52.47.205.18.sslip.io";
const status = await (await fetch(origin + "/api/status")).json();
if (!status.qloo || !status.model || status.release === "unknown")
  throw new Error("A known live release with both providers is required.");
mkdirSync("docs/media", { recursive: true });
mkdirSync("docs/screenshots/finalist-public", { recursive: true });
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1280, height: 900 },
  recordVideo: {
    dir: "test-results/demo-video",
    size: { width: 1280, height: 900 },
  },
});
const page = await context.newPage();
page.setDefaultTimeout(35000);
const video = page.video();
const started = performance.now(),
  scenes = [];
const stamp = (text) =>
  scenes.push({ atSeconds: (performance.now() - started) / 1000, text });
const pause = (ms = 3000) => page.waitForTimeout(ms);
let complete = false;
try {
  await page.goto(origin + "/tour");
  stamp(
    "TasteKey Relay: a real public walkthrough. All business inputs are synthetic.",
  );
  await pause();
  await page.goto(origin + "/personal/discover");
  stamp(
    "Personal: choose a film you like. Search resolves a real Qloo entity.",
  );
  await page.getByLabel("A film you love").fill("Interstellar");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await page
    .getByRole("button", { name: /^Interstellar movie/ })
    .first()
    .click();
  await page
    .getByText("Help us understand your choice (optional)", { exact: true })
    .click();
  await pause(2000);
  await page
    .getByRole("button", { name: "Emotional storytelling", exact: true })
    .click();
  stamp("A clarification is a choice, not a fact guessed about you.");
  await pause();
  await page.getByRole("button", { name: "Design", exact: true }).click();
  await page.getByLabel("A design you love").fill("Luxury architecture");
  await page.getByRole("button", { name: "Add this", exact: true }).click();
  await page.goto(origin + "/personal/taste-dna");
  stamp(
    "Keep aesthetics separate from spending. Optional AI proposes a budget correction for review.",
  );
  await page
    .getByPlaceholder(
      "I love luxury architecture, but choose affordable hotels. My hotel limit is $60 a night.",
    )
    .fill(
      "I love luxury architecture. My hotel budget is $60 a night. Keep my movie tastes.",
    );
  await page
    .getByRole("button", { name: "Interpret with language model", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Apply reviewed changes" }),
  ).toBeVisible();
  await pause(2500);
  await page.getByRole("button", { name: "Apply reviewed changes" }).click();
  await expect(page.getByLabel("Accommodation per night (USD)")).toHaveValue(
    "60",
  );
  await pause(2000);
  await page.goto(origin + "/personal/relay");
  stamp("Choose exactly which likes to share. Get real Qloo recommendations.");
  await page
    .getByRole("checkbox", { name: "Interstellar Film", exact: true })
    .check();
  await page
    .getByRole("checkbox", { name: "Emotional storytelling Film", exact: true })
    .check();
  await page
    .getByRole("button", { name: "Share these likes for 24 hours" })
    .click();
  await page
    .getByRole("button", { name: "Get suggestions", exact: true })
    .click();
  await expect(page.locator(".result-card").first()).toBeVisible();
  await page.screenshot({
    path: "docs/screenshots/finalist-public/personal-qloo.png",
    fullPage: true,
  });
  await pause(5000);
  await page.getByRole("button", { name: "Stop sharing", exact: true }).click();
  await expect(page.locator(".result-card")).toHaveCount(0);
  stamp(
    "Stop sharing clears the recommendations. Context permission remains under your control.",
  );
  await pause(2000);
  await page.goto(origin + "/studio/onboarding");
  stamp(
    "Studio: a synthetic cinema brief, a real cultural reference and a bounded pilot budget.",
  );
  await page.getByLabel("Business name").fill("Demo cinema — synthetic brief");
  await page.getByLabel("City").fill("Casablanca");
  await page
    .getByLabel("What do you offer?")
    .fill(
      "One weekly screening, subject to rights and capacity checks. Synthetic demo business.",
    );
  await page
    .getByLabel("What is your goal?")
    .fill(
      "Plan one small weekday screening pilot; no attendance outcome is claimed.",
    );
  await page.getByLabel("Pilot budget").fill("500");
  await page
    .getByRole("combobox", { name: "Currency", exact: true })
    .selectOption("MAD");
  await page
    .getByLabel("Limits to keep in mind (optional)")
    .fill("One evening; verify screening rights and costs before launch.");
  await page
    .getByLabel("Cultural reference", { exact: true })
    .fill("Interstellar");
  await page.getByRole("button", { name: "Search Qloo", exact: true }).click();
  await page
    .locator(".search-results button")
    .filter({ hasText: "Interstellar" })
    .first()
    .click();
  await page.getByRole("button", { name: "Save business profile" }).click();
  await expect(
    page.getByText("Business saved in your private server-side workspace."),
  ).toBeVisible();
  await page.goto(origin + "/studio/analysis");
  const responsePromise = page.waitForResponse(
    (r) => r.url().endsWith("/api/analysis") && r.request().method() === "POST",
  );
  await page
    .getByRole("button", { name: "Find ideas with Qloo", exact: true })
    .click();
  const analysis = await (await responsePromise).json();
  if (analysis.mode !== "live")
    throw new Error("Studio did not return live evidence.");
  await expect(
    page.getByText("Qloo response received", { exact: true }),
  ).toBeVisible();
  stamp(
    "Real Qloo evidence grounds pilot ideas. Demand, rights, supply and costs still need owner review.",
  );
  await page.screenshot({
    path: "docs/screenshots/finalist-public/studio-qloo.png",
    fullPage: true,
  });
  await pause(5000);
  await page
    .getByRole("button", { name: "Accept", exact: true })
    .first()
    .click();
  await page
    .getByRole("button", { name: "Create action plan", exact: true })
    .first()
    .click();
  await expect(
    page.getByRole("button", { name: "Plan saved in Action plans" }),
  ).toBeVisible();
  await page.goto(origin + "/studio/actions");
  stamp(
    "An accepted idea becomes a saved action plan. No invented sales or attendance result is entered.",
  );
  await pause(4000);
  await page.goto(origin + "/studio/scenarios");
  await page.getByLabel("City / market", { exact: true }).fill("Rabat");
  await page.getByLabel("Pilot budget (MAD)", { exact: true }).fill("250");
  await page.getByRole("button", { name: "Run alternative scenario" }).click();
  await expect(
    page.getByText("Qloo response received", { exact: true }),
  ).toBeVisible();
  stamp(
    "Compare a second city and budget. Location signals do not prove local demand.",
  );
  await page.screenshot({
    path: "docs/screenshots/finalist-public/studio-scenario.png",
    fullPage: true,
  });
  await pause(5000);
  await page.goto(origin + "/tour");
  stamp(
    "Working integrations, transparent evidence, honest limits. The public-ballot study did not establish recommendation improvement.",
  );
  await pause(4000);
  complete = true;
} finally {
  const duration = (performance.now() - started) / 1000;
  await context.close();
  await video.saveAs(
    complete
      ? "docs/media/tastekey-walkthrough.webm"
      : "test-results/incomplete-demo.webm",
  );
  await browser.close();
  if (complete) {
    const time = (s) => {
      const ms = Math.round(s * 1000);
      return `${String(Math.floor(ms / 3600000)).padStart(2, "0")}:${String(Math.floor(ms / 60000) % 60).padStart(2, "0")}:${String(Math.floor(ms / 1000) % 60).padStart(2, "0")},${String(ms % 1000).padStart(3, "0")}`;
    };
    writeFileSync(
      "docs/media/tastekey-walkthrough.srt",
      scenes
        .map(
          (s, i) =>
            `${i + 1}\n${time(s.atSeconds)} --> ${time(scenes[i + 1]?.atSeconds || duration)}\n${s.text}\n`,
        )
        .join("\n"),
    );
    writeFileSync(
      "docs/media/walkthrough-capture.json",
      JSON.stringify(
        {
          at: new Date().toISOString(),
          release: status.release,
          durationSeconds: duration,
          audio: false,
          realPublicInteractions: true,
          syntheticBusinessInputs: true,
          mockRoutes: false,
          scenes,
        },
        null,
        2,
      ) + "\n",
    );
    console.log(
      JSON.stringify({
        complete,
        durationSeconds: duration,
        release: status.release,
      }),
    );
  }
}
