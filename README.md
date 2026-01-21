# Sales Ops with Claude

営業オペレーション × AI協業プロジェクト

---

## プロジェクト構成

```
sales-ops-with-claude/
├── CLAUDE.md                    # AI用指示（225KB）
├── README.md                    # このファイル
│
├── _framework/                  # 開発フレームワーク（ルール・ガイド）
│   ├── rules/                   # 開発ルール
│   │   ├── COMMON_RULES.md      # 共通ルール
│   │   ├── THREE_ENVIRONMENT_SETUP.md  # 3環境セットアップ
│   │   └── TROUBLESHOOTING.md   # トラブルシューティング
│   ├── guides/                  # ガイド
│   │   ├── GAS_WEBAPP_GUIDE.md  # GAS Webアプリガイド
│   │   └── UI_UX_GUIDELINES.md  # UI/UXガイドライン
│   ├── ai-agent/                # AIエージェント仕様
│   └── templates/               # テンプレート
│
├── apps/                        # 営業アプリケーション
│   ├── 01_crm/                  # CRM（顧客・商談管理）
│   │   ├── prod/                # 本番環境
│   │   ├── staging/             # 検証環境
│   │   ├── dev/                 # 開発環境
│   │   └── docs/                # CRM仕様書
│   │
│   ├── 02_recruitment/          # 採用診断アプリ
│   │   ├── prod/
│   │   └── docs/
│   │
│   ├── 03_training/             # 営業教育アプリ
│   │   ├── prod/
│   │   └── docs/
│   │
│   ├── 04_conversation/         # 会話ログDB
│   │   ├── prod/
│   │   └── docs/
│   │
│   └── 05_gemini/               # Geminiダッシュボード
│       ├── prod/
│       ├── dev/
│       └── docs/
│
├── docs/                        # 詳細ドキュメント（既存）
│   ├── 00_common/               # 共通ドキュメント
│   ├── 01_crm/                  # CRM詳細
│   └── 03_knowledge/            # ナレッジベース
│
├── scripts/                     # ユーティリティスクリプト
└── _archive/                    # アーカイブ（旧フォルダ）
```

---

## アプリ一覧

| アプリ | フォルダ | 状態 | 説明 |
|--------|---------|------|------|
| CRM | `apps/01_crm/` | 開発中 | 顧客・商談管理、Buddy機能 |
| 採用診断 | `apps/02_recruitment/` | 運用中 | 候補者適性診断 |
| 営業教育 | `apps/03_training/` | 計画中 | 営業スキルトレーニング |
| 会話ログ | `apps/04_conversation/` | 開発中 | 翻訳・感情分析 |
| Gemini | `apps/05_gemini/` | 開発中 | Gemini統合ダッシュボード |

---

## 3環境システム

| 環境 | 用途 | フォルダ |
|-----|------|---------|
| prod | 本番運用 | `apps/XX_name/prod/` |
| staging | 検証・テスト | `apps/XX_name/staging/` |
| dev | 開発 | `apps/XX_name/dev/` |

### デプロイフロー

```
dev → staging → [承認] → prod
```

---

## 技術スタック

| 種類 | 技術 |
|-----|------|
| Runtime | Google Apps Script (V8) |
| Frontend | HTML, CSS, JavaScript (SPA) |
| Backend | Google Sheets (データストア) |
| Deployment | clasp CLI |
| 通知 | Discord Webhook |
| AI | Gemini API |
| AI協業 | Claude Code |

---

## クイックスタート

```bash
# リポジトリをクローン
git clone https://github.com/shingo-ops/sales-ops-with-claude.git
cd sales-ops-with-claude

# claspにログイン
clasp login

# CRMをデプロイする場合
cd apps/01_crm/prod
clasp push
clasp deploy
```

---

## 重要ドキュメント

| ドキュメント | パス | 説明 |
|-------------|------|------|
| AI指示 | `CLAUDE.md` | Claude Code用の詳細指示（225KB） |
| 共通ルール | `_framework/rules/COMMON_RULES.md` | 開発ルール |
| 3環境セットアップ | `_framework/rules/THREE_ENVIRONMENT_SETUP.md` | 環境構築手順 |
| GASガイド | `_framework/guides/GAS_WEBAPP_GUIDE.md` | GAS Webアプリの作り方 |

---

## リンク

- GitHub: https://github.com/shingo-ops/sales-ops-with-claude
- バックアップ: https://github.com/shingo-ops/b2b-card-crm-backup

---

## ライセンス

Private - All rights reserved

---

更新日: 2026-01-20
