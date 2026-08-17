"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { signOut } from "next-auth/react";
import {
  IconMenu,
  IconClose,
  IconHome,
  IconPlay,
  IconHistory,
  IconUser,
  IconTrophy,
  IconSettings,
  IconLogout,
} from "./icons";

const NAV_ITEMS = [
  { href: "/", label: "ホーム", Icon: IconHome },
  { href: "/sessions/new", label: "対局を記録", Icon: IconPlay },
  { href: "/sessions", label: "対局履歴", Icon: IconHistory },
  { href: "/me", label: "個人成績", Icon: IconUser },
  { href: "/ranking", label: "グループランキング", Icon: IconTrophy },
  { href: "/settings", label: "メンバー・グループ設定", Icon: IconSettings },
];

export function AppShell({
  groupName,
  displayName,
  children,
}: {
  groupName: string;
  displayName: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div>
      <header className="app-header">
        <button className="hamburger-btn" onClick={() => setOpen(true)} aria-label="メニューを開く">
          <IconMenu />
        </button>
        <div className="app-header-brand">♠ ポーカー収支帳</div>
      </header>

      {open && (
        <>
          <div className="nav-scrim" onClick={() => setOpen(false)} />
          <nav className="nav-drawer" aria-label="ナビゲーション">
            <div className="nav-drawer-head">
              <div className="nav-drawer-brand">♠ ポーカー収支帳</div>
              <button className="hamburger-btn" onClick={() => setOpen(false)} aria-label="メニューを閉じる">
                <IconClose />
              </button>
            </div>
            <div className="nav-drawer-group">
              グループ
              <strong>{groupName}</strong>
            </div>
            <ul className="nav-links">
              {NAV_ITEMS.map(({ href, label, Icon }) => {
                const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      className={`nav-link${active ? " active" : ""}`}
                      onClick={() => setOpen(false)}
                    >
                      <Icon />
                      <span>{label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
            <div className="nav-footer">
              <div style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 10 }}>
                {displayName} でログイン中
              </div>
              <button className="ghost" onClick={() => signOut({ callbackUrl: "/login" })}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                  <IconLogout />
                  ログアウト
                </span>
              </button>
            </div>
          </nav>
        </>
      )}

      <main>{children}</main>
    </div>
  );
}
