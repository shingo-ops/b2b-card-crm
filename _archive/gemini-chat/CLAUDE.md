# Gemini壁打ちアプリ

## 概要

人間心理学習のための壁打ちシステム。Gemini APIを使用した対話型Webアプリ。

## 環境

- **環境**: 提案環境（PROP）
- **スプレッドシートID**: `1NiPn-MaxbFDUUu8JvT7meY_64whgWDNXstAR-mVsY2M`
- **スクリプトID**: `1vlfQ9fJXkkokPMjTCvbbVOVHuWJMNirZ3HofuRakdzOFNsm5YSVfiK32`

## ファイル構成

| ファイル | 説明 |
|---------|------|
| Code.gs | メインロジック、Webアプリエントリーポイント |
| GeminiService.gs | Gemini API連携 |
| CrisisService.gs | 危機介入プロトコル |
| LogService.gs | ログ保存・分析 |
| index.html | チャットUI |
| style.html | CSS |

## 初回セットアップ

1. GASエディタで `initializeSpreadsheet()` を実行
2. スクリプトプロパティに `GEMINI_API_KEY` を設定
3. Webアプリをデプロイ

## スプレッドシート構造

### 会話ログ
| セッションID | ユーザーID | 役割 | メッセージ | タイムスタンプ | 返答時間(ms) | 感情タグ |

### セッション管理
| セッションID | ユーザーID | 開始時刻 | 終了時刻 | ステータス | メッセージ数 |

### 設定
| キー | 値 | 説明 |

## 機能

1. **同意画面**: 利用規約表示、同意取得
2. **チャットUI**: メッセージ送受信
3. **Gemini API連携**: 会話生成
4. **ログ保存**: 全会話を記録
5. **危機介入**: 特定キーワード検知→専門家案内

## 危機介入キーワード

- 死にたい、消えたい、限界、もう無理、生きてる意味 など

## 関連ドキュメント

- [DISC-036](../docs/00_common/PROJECT_PROPOSALS/DISC-036_GEMINI_LEARNING_ENV.md)
