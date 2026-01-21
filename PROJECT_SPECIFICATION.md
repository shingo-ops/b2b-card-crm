# B2Bカード決済営業向け 統合システム仕様書

## プロジェクト概要
B2Bカード決済事業の営業活動を支援する統合システム。
全てGAS Webアプリで統一し、ランニングコスト0円を実現。

## システム構成
```
b2b-sales-system/
├── PROJECT_SPECIFICATION.md
├── recruitment-diagnosis/    # 採用診断アプリ
│   ├── Code.gs
│   ├── Index.html
│   ├── Stylesheet.html
│   ├── JavaScript.html
│   └── appsscript.json
├── crm-dashboard/           # CRMダッシュボード
│   ├── Code.gs
│   ├── Index.html
│   ├── Stylesheet.html
│   ├── JavaScript.html
│   └── appsscript.json
├── conversation-log/        # 会話ログDB
│   ├── Code.gs
│   ├── Index.html
│   ├── Stylesheet.html
│   ├── JavaScript.html
│   └── appsscript.json
└── sales-training/          # 営業教育アプリ
    ├── Code.gs
    ├── Index.html
    ├── Stylesheet.html
    ├── JavaScript.html
    └── appsscript.json
```

## 開発順序
1. **採用診断アプリ** - 新規開発（最優先）
2. **会話ログDB** - 新規開発
3. **CRMダッシュボード** - React→GAS Web App変換
4. **営業教育アプリ** - React→GAS Web App変換

## ID体系（システム間連携用）
| システム | ID形式 | 例 |
|---------|--------|-----|
| 候補者（採用診断） | APP-XXX | APP-001 |
| 診断結果 | DIA-XXX | DIA-001 |
| 面接記録 | INT-XXX | INT-001 |
| 営業担当者 | EMP-XXX | EMP-001 |
| リード | LD-XXX | LD-001 |
| 商談 | DL-XXX | DL-001 |
| 顧客 | CS-XXX | CS-001 |
| 会話ログ | LOG-XXX | LOG-001 |
| 振り返り | SUM-XXX | SUM-001 |

## 連携フロー
```
採用診断アプリ (APP-001)
    ↓ 合格
営業担当者マスタ (EMP-001)
    ↓ 担当割り当て
CRMダッシュボード (LD-001, DL-001, CS-001)
    ↓ 会話記録
会話ログDB (LOG-001)
    ↓ 振り返り
営業教育アプリ (SUM-001)
```

## 技術スタック
- Google Apps Script (GAS)
- Google Spreadsheet（データベース）
- HTML/CSS/JavaScript（フロントエンド）
- Gemini API（翻訳・感情分析）※会話ログDBのみ
