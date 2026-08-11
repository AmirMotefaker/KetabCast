import { ExternalLink, GitBranch, Mic2 } from "lucide-react";

import { projectStatus } from "@/lib/project-status";

export default function DevelopmentStatus() {
  const productionReady =
    projectStatus.productionAudio.ready.toLocaleString("fa-IR");
  const productionTotal =
    projectStatus.productionAudio.total.toLocaleString("fa-IR");
  const variantsReady =
    projectStatus.dualVoice.verifiedVariants.toLocaleString("fa-IR");
  const variantsTotal =
    projectStatus.dualVoice.targetVariants.toLocaleString("fa-IR");

  return (
    <section
      id="development-status"
      className="mx-auto max-w-6xl px-4 pt-8"
      aria-labelledby="development-status-title"
    >
      <div className="rounded-3xl border border-gray-800 bg-surface/50 p-5 shadow-xl md:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-accent">
              وضعیت توسعه زبدینو
            </p>
            <h2
              id="development-status-title"
              className="mt-2 text-2xl font-extrabold md:text-3xl"
            >
              آخرین تغییرات پروژه را همین‌جا ببین
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-gray-400">
              این بخش همراه milestoneهای اصلی GitHub به‌روزرسانی
              می‌شود؛ صوت production فعلی تا کامل‌شدن Dual Voice
              بدون تغییر باقی می‌ماند.
            </p>
          </div>

          <span className="rounded-full border border-accent/40 bg-accent/10 px-3 py-1.5 text-xs font-bold text-accent">
            {projectStatus.version}
          </span>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-gray-800 bg-background/60 p-4">
            <p className="text-xs font-bold text-gray-500">
              صوت اصلی
            </p>
            <p className="mt-2 text-xl font-extrabold text-white">
              {productionReady} از {productionTotal} آماده
            </p>
          </div>

          <div className="rounded-2xl border border-gray-800 bg-background/60 p-4">
            <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
              <Mic2 size={15} />
              Dual Voice
            </div>
            <p className="mt-2 text-xl font-extrabold text-white">
              {variantsReady} از {variantsTotal} variant تأییدشده
            </p>
            <p className="mt-1 text-xs leading-6 text-gray-500">
              Sulafat / Warm · Schedar / Even
            </p>
          </div>

          <div className="rounded-2xl border border-gray-800 bg-background/60 p-4">
            <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
              <GitBranch size={15} />
              مرحله فعلی
            </div>
            <p className="mt-2 text-sm font-bold leading-7 text-gray-200">
              {projectStatus.dualVoice.stage}
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-4 text-sm font-bold">
          <a
            href={projectStatus.currentMilestone.issueUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-accent hover:underline"
          >
            Issue #{projectStatus.currentMilestone.issueNumber.toLocaleString(
              "fa-IR",
            )}
            <ExternalLink size={14} />
          </a>

          <a
            href={projectStatus.releasesUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-gray-400 hover:text-white"
          >
            تاریخچه Releaseها
            <ExternalLink size={14} />
          </a>
        </div>
      </div>
    </section>
  );
}
