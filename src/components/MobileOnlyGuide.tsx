import Image from "next/image";

/**
 * スマホ以外のデバイスでアクセスした場合の誘導画面（requirements.md §9-3）
 */
export default function MobileOnlyGuide() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-navy-800 px-8 text-center text-white">
      <Image src="/logo-wordmark-white.png" alt="Sporive" width={168} height={71} priority />
      <p className="leading-relaxed text-navy-100">
        Sporive はスマートフォン専用のアプリです。
        <br />
        お手数ですが、スマートフォンでこのページを開いてください。
      </p>
    </main>
  );
}
