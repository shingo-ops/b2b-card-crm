# CRM Dashboard - 開発ログ

## 概要
CRM Dashboardの開発経緯と重要な決定事項を記録します。

## 2026年1月12日

### google.script.run null問題の修正

- **症状**: `getLeads()` をブラウザから呼び出すと `null` が返るが、GASエディタでは正常動作
- **原因**: スプレッドシートの `getValues()` は日付セルを JavaScript `Date` オブジェクトで返し、`Date` オブジェクトを含む配列は `google.script.run` でシリアライズに失敗することがある
- **修正内容**:
  - `WebApp.gs`: getLeads(), getStaffList(), getDeals() で Date を ISO 文字列に変換
  - `DashboardService.gs`: getSheetDataAsObjects() で Date を ISO 文字列に変換
  - `index.html`: 診断ツールを強化
- **再発防止**: CLAUDE.md セクション9、TROUBLESHOOTING.md に追記
- **コミット**: eed41d8

### Phase B: SPA統一・不要HTMLファイル削除

- **変更内容**:
  - doGet()を常にindex.htmlを返すSPA方式に統一
  - 不要なHTMLファイル(leads.html, deals.html, staff.html, dashboard.html)を削除
  - バックアップ: docs/01_crm/ARCHIVE_HTML.md
  - CSメモ列を新規リードフォームと詳細ビューに追加
- **コミット**: 2ad7558

### 商談レポート機能実装（離席モード）
- **背景**: 商談終了後の振り返りと知見蓄積を支援するため、詳細な商談レポート機能が必要
- **決定**: 離席モードのルールに従い、シート構造変更は手動実行用関数として準備
- **実装内容**:
  - **SetupDealReport.gs**: シートセットアップ用GAS関数
    - `setupDealReportSheets()`: 全シートを一括作成
    - `addDealReportSettingsColumns()`: 設定シートに列追加
    - `createDealReportSheet()`: 商談レポートシート作成
    - `createBuddyDialogLogSheet()`: Buddy対話ログシート作成
    - `createConversationLogSheet()`: 会話ログシート作成
  - **DealReportService.gs**: レポート保存サービス
    - `saveDealReport()`: レポート保存
    - `saveConversationLog()`: 会話ログ保存
    - `getDealDataForReport()`: 商談データ取得
    - `generateReportId()`: レポートID生成（RPT-00001形式）
    - `getDealReportDropdownOptions()`: プルダウン選択肢取得
  - **BuddyFeedbackService.gs**: Gemini APIフィードバック生成
    - `generateDealFeedback()`: 商談フィードバック生成
    - `callGeminiAPI()`: Gemini API呼び出し
    - `generateBuddyChatResponse()`: チャット応答生成
  - **index.html**: 商談レポートフォームV2
    - 商談結果選択で条件分岐（成約/失注/追客/見送り/対象外）
    - チェックボックス式の商材・販売先選択
    - 「その他」選択時の自由入力欄
    - 「不明」ボタンで自動入力
    - Buddyフィードバック表示エリア
    - 壁打ち開始ボタン
  - **style.html**: V2フォーム用スタイル追加
- **離席モード制約対応**:
  | 制約 | 対応 |
  |------|------|
  | シート構造変更禁止 | 手動実行用関数として準備 |
  | clasp deploy禁止 | clasp pushのみ実行 |
- **次回必要な作業**:
  1. GASエディタで `setupDealReportSheets()` を手動実行
  2. テストURL（@HEAD）で動作確認
  3. 問題なければ本番デプロイ
- **コミット**: aa34ecc

### UI/UX共通ガイドライン作成・不具合修正
- **背景**: Buddyチャット実装時に以下の不具合が発見された
  - エンターキー連打による重複送信
  - ダッシュボードタブのセレクタスコープ問題
- **決定**: 不具合の根本原因をUI/UX共通ルールとして文書化し、今後の開発で再発防止
- **実装内容**:
  - docs/00_common/UI_UX_GUIDELINES.md 新規作成
    - 自由記述入力欄の仕様（Chatwork方式: エンター=改行、ボタン=送信）
    - 重複送信防止パターン（isSendingフラグ）
    - 日本語入力（IME）対応の注意事項
    - 開発時チェックリスト
  - docs/00_common/COMMON_RULES.md 更新
    - セクション4.3「UI/UX共通ルール」追加、ガイドライン参照を追記
  - index.html 修正
    - Buddyチャットに`isBuddySending`フラグ追加（重複送信防止）
    - `showDashboardTab`のセレクタを`#dashboard-full`にスコープ限定
- **不具合詳細**:
  | 問題 | 原因 | 修正 |
  |------|------|------|
  | メッセージ重複送信 | 送信中ガードなし | `isBuddySending`フラグ追加 |
  | タブ消失（オーナー） | `.dashboard-tab`が全タブに影響 | `#dashboard-full .dashboard-tab`にスコープ |
- **コミット**: ceff9c9（不具合修正）、85db4f3（ドキュメント追加）

### Buddyチャット入力欄修正（本番デプロイ @28）
- **背景**: UI/UXガイドラインに従い、Buddyチャットの入力欄を修正
- **決定**: Chatwork方式（エンター=改行、ボタン=送信）に統一
- **実装内容**:
  - index.html: `handleBuddyChatKeydown`関数を削除
  - index.html: textareaからonkeydown属性を削除
  - style.html: `.buddy-chat-input`のCSS調整
    - resize: none → vertical（ユーザーがリサイズ可能に）
    - max-height: 150px 追加
    - font-family: inherit 追加
- **動作仕様**:
  | 操作 | 動作 |
  |------|------|
  | エンターキー | 改行 |
  | 送信ボタンクリック | 送信 |
- **コミット**: 6ec513f
- **デプロイバージョン**: @28

## 2026年1月11日

### Buddy MVP実装（離席モード）
- **背景**: Buddy設計完了後、Phase 1 MVPの実装を開始
- **実装内容**:
  - **Buddyカード**: 営業ダッシュボード上部に表示、時間帯別挨拶・今日のアクション表示
  - **Buddy相談モーダル**: Gemini API連携（フォールバック応答あり）
  - **商談レポートフォーム**: 手応え5段階、振り返り入力、Buddyフォロー自動生成
  - **アラート機能**: ネクストアクション未設定/期限超過、滞留案件検知、Discord通知
  - **ログイン/ログアウト記録**: ハートビート方式（15分間隔）、30分非アクティブで自動ログアウト
- **GAS API追加**:
  - getBuddyData(): 挨拶・今日のアクション取得
  - getBuddyResponse(): Gemini APIでBuddy応答生成
  - saveDealReport(): 商談レポート保存
  - recordLogin/recordHeartbeat/checkInactiveUsers: ログイン管理
  - checkNextActionAlerts/checkStagnantDeals/dailyAlertBatch: アラート機能
- **制約**: 離席モードのため
  - clasp deploy禁止（本番デプロイ禁止）
  - スプレッドシート構造変更禁止（新規シート作成はGAS実行時に自動作成）
- **保留タスク**:
  - Task 1: 新規シート作成（離席モードで禁止のためスキップ）
  - clasp push: 認証エラーのためユーザー実行必要
- **コミット**: f3746b5
- **次のステップ**: clasp push → テスト環境確認 → 本番デプロイ

### Buddy設計完了
- **背景**: 営業担当者に伴走するAIパートナー「Buddy」システムの詳細設計が必要
- **決定**: 以下の仕様書を作成し、実装の基盤を確立
- **作成ファイル**:
  - BUDDY_SPEC.md: Buddyの人格・発言ルール・UI仕様
  - STAFF_CARD_SPEC.md: 担当者カルテの仕様
  - ALERT_SYSTEM_SPEC.md: アラートシステムの仕様
  - REPORT_TEMPLATE_SPEC.md: 振り返りレポートの仕様
  - TOOL_INVENTORY.md: Buddyプロジェクトを追加
- **主な決定事項**:
  - Buddy名: 「Buddy（バディ）」
  - 基本絵文字: 🧔‍♂️
  - エビデンスベースの発言のみ（予測・主観的評価は禁止）
  - センシティブな数字には触れない
  - ペンタゴングラフ: 5軸（営業力、行動力、知識、自己管理、コミュニケーション）
  - 3段階記録: 採用時 → 教育終了 → 現在
  - モチベーションアラート: 良好(70+)、注意(50-69)、要対応(<50)、緊急(<30)
  - アラート種類: ネクストアクション、滞留案件、アサイン後未対応、モチベーション
  - ハイブリッド式通知: 3日=Buddy、7日=Discord
- **次のステップ**: Phase 1 MVP実装開始

### 本番デプロイ・ファビコン追加
- **本番デプロイ @26**: Phase 1-5完了、セキュリティ強化、レイアウト修正
- **本番デプロイ @27**: ファビコン追加
- **実装内容**:
  - index.html: ファビコン（📊）をSVGデータURIで追加
  - レイアウト修正: メインコンテンツ幅の問題解消
  - updateKPIs nullエラー修正

### リーダーダッシュボード実装（Phase 5）【離席モード】
- **背景**: リーダー/オーナー向けにチーム全体の状況を把握できるダッシュボードが必要
- **決定**: 概要タブをリーダーダッシュボードに改善し、CS/営業部門サマリとチームランキングを表示
- **実装内容**:
  - WebApp.gs: getLeaderMetrics()追加
    - CS部門サマリ: 総リード数、本日新規、未アサイン
    - 営業部門サマリ: 商談数、成約数、成約率、総売上
    - チームランキング: 上位5名の成績（商談数、成約数、成約率、売上）
  - index.html: 概要タブ（tab-overview）をリーダーダッシュボード仕様に変更
    - 2カラムグリッドでCS/営業部門を並列表示
    - 営業成績ランキングテーブル（Top 5）
  - index.html: loadLeaderMetrics()追加
  - style.html: overview-grid, mini-table, trend系クラス追加済み（Phase 4で対応）
- **注意**: 離席モードのためclasp deployは禁止。テスト版（@HEAD）のみ反映

### 営業ダッシュボード実装（Phase 4）【離席モード】
- **背景**: 営業担当者向けに個人成績とチーム成績を表示する専用ダッシュボードが必要
- **決定**: 個人タブとチームタブの2タブ構成、今日のアクションリストを表示
- **実装内容**:
  - WebApp.gs: getSalesMetrics()追加
    - 個人成績: 商談数、成約数、成約率、売上
    - 今日のアクション: 次回アクション日が今日/明日の商談リスト
  - WebApp.gs: getTeamStats()追加
    - チーム成績ランキング（売上順ソート）
  - index.html: 営業ダッシュボードUI追加
    - 個人タブ: KPIカード + 今日のアクションリスト
    - チームタブ: 成績ランキングテーブル（自分はハイライト）
  - index.html: loadSalesMetrics(), loadTeamStats(), showSalesTab()追加
  - style.html: アクションリストCSS追加（.action-list, .action-item, .priority-high/medium）
  - style.html: チーム成績テーブルCSS追加（.highlight-row, .no-data）
- **注意**: 離席モードのためclasp deployは禁止。テスト版（@HEAD）のみ反映

### セキュリティ強化・認証必須化（緊急修正）
- **背景**: 未登録ユーザーが全メニューにアクセス可能、APIに権限チェックなしの重大なセキュリティ問題
- **決定**: 認証前UI非表示、全画面ブロックエラー表示、APIに権限チェック必須化
- **実装内容**:
  - index.html: 認証チェック中のローディング画面追加（auth-loading）
  - index.html: メインコンテンツをapp-containerで囲み認証成功後に表示
  - index.html: showAuthError()を全画面ブロックに変更（body.innerHTMLを置換）
  - index.html: initializeUser()に認証成功時のUI表示処理を追加
  - style.html: 認証エラー画面CSS追加（.auth-error-screen, .auth-error-box等）
  - WebApp.gs: checkPermission()関数追加（認証・権限チェック共通関数）
  - WebApp.gs: getLeads()にlead_view権限チェック追加
  - WebApp.gs: getDeals()にdeal_view_all/deal_view_own権限チェック追加
  - WebApp.gs: getAdminSettings()にadmin_access権限チェック追加
  - WebApp.gs: saveNotificationSettings()にadmin_access権限チェック追加
  - WebApp.gs: saveRole()にadmin_access権限チェック追加
  - WebApp.gs: deleteRole()にadmin_access権限チェック追加
  - WebApp.gs: getStaffWithRoles()にstaff_manage権限チェック追加
  - WebApp.gs: forceResetWithPassword()にforce_reset権限チェック追加
  - WebApp.gs: getCSMetrics()にdashboard_cs権限チェック追加
- **セキュリティ改善**:
  - 担当者マスタ未登録: 全画面ブロック（アプリにアクセス不可）
  - 担当者マスタ登録済み: 権限に応じたメニューのみ表示
  - APIを直接呼び出し: 権限チェックでエラー
- **デプロイバージョン**: @25

### CSダッシュボード追加（Phase 3）
- **背景**: 役割に応じた専用ダッシュボードを表示し、CS担当者向けのKPIを表示する
- **決定**: 役割別ダッシュボードコンテナを実装、CS用KPI（本日新規、アサイン待ち、今週アサイン済、総リード数）を追加
- **実装内容**:
  - WebApp.gs: getCSMetrics()追加（CS用KPI計算）
    - todayNewLeads: 本日登録されたリード数
    - waitingAssign: 担当者未設定のリード数
    - weekAssigned: 今週担当者にアサインされた数
    - totalLeads: 総リード数
  - index.html: ダッシュボードページを役割別コンテナに再構成
    - dashboard-cs: CS専用ダッシュボード（KPIカード + クイックアクション）
    - dashboard-sales: 営業専用ダッシュボード（Phase 4で実装予定）
    - dashboard-full: オーナー/システム管理者/リーダー用（タブ切り替え）
  - index.html: showDashboardByRole()を実装（役割に応じたダッシュボード表示）
  - index.html: loadCSMetrics()を追加（CSメトリクスAPI呼び出し）
  - index.html: showDashboardTab()を追加（フルダッシュボードのタブ切り替え）
  - style.html: ダッシュボードタブCSS追加（.dashboard-tabs, .dashboard-tab）
  - style.html: KPIカードバリエーション追加（.kpi-card-highlight, .kpi-card-warning, .kpi-card-info, .kpi-card-success）
  - style.html: .kpi-cards グリッドスタイル追加
- **機能**:
  - CS役割: CSダッシュボード表示（4つのKPIカード + リードへのクイックアクション）
  - 営業役割: 営業ダッシュボード表示（Phase 4で詳細実装）
  - オーナー/システム管理者/リーダー: フルダッシュボード（概要/CS/営業タブ切り替え）
- **デプロイバージョン**: @24

### 期間タイプ設定シート対応・ログイン時役割取得（Phase 2）
- **背景**: 期間タイプを設定シートで管理可能にし、ログイン時にユーザーの役割を取得してメニュー表示を制御
- **決定**: 期間タイプを設定シート管理に移行、ログイン時認証機能を追加
- **実装内容**:
  - Config.gs: DEFAULT_DROPDOWN_OPTIONSに'期間タイプ'追加（月次、週次、四半期、年次）
  - Config.gs: DROPDOWN_COLUMNSに'期間タイプ'追加
  - SheetService.gs: initializeGoalsSheet()の期間タイプ入力規則を設定シートから取得するように修正
  - WebApp.gs: getCurrentUserRole()追加（メールアドレスから担当者情報取得）
  - WebApp.gs: getPermissionsByRole()追加（役割から権限取得）
  - WebApp.gs: getCurrentUserWithPermissions()追加（ユーザー情報と権限をまとめて取得）
  - index.html: initializeUser()追加（ページ読み込み時にユーザー認証）
  - index.html: updateMenuByPermissions()追加（権限に応じてメニュー表示/非表示）
  - index.html: サイドバーフッターにユーザー名表示エリア追加
  - style.html: .sidebar-footer, .user-info, .user-icon CSS追加
- **機能**:
  - ページ読み込み時に担当者マスタからメールで検索し役割を取得
  - 役割に基づいて権限設定シートから権限を取得
  - 権限に応じてサイドメニューの表示/非表示を制御
  - サイドバー下部にログインユーザー名を表示
- **デプロイバージョン**: @23

### 権限マトリクス更新・目標設定シート追加（Phase 1）
- **背景**: 役割ごとの権限を細かく設定できるようにし、目標管理機能の基盤を作成
- **決定**: 権限マトリクスを拡張（5役割 × 16権限）、目標設定シートを追加
- **実装内容**:
  - Config.gs: DEFAULT_ROLESを配列→オブジェクト形式に変更
  - Config.gs: PERMISSION_DEFINITIONSを新形式（カテゴリ付き）に変更
  - Config.gs: 役割リストを更新（オーナー、システム管理者、リーダー、営業、CS）
  - Config.gs: SHEETS.GOALS、GOALS_HEADERSを追加
  - Config.gs: HEADERS.PERMISSIONSを16権限に拡張
  - SheetService.gs: initializePermissionsSheet()を新形式対応に更新
  - SheetService.gs: initializeGoalsSheet()を追加
  - SheetService.gs: initializeGoalsSheetFromMenu()、initializePermissionsSheetFromMenu()を追加
  - WebApp.gs: getGoals(), addGoal(), updateGoal(), deleteGoal(), generateNextGoalId()を追加
  - WebApp.gs: getRoleNames()をオブジェクト形式対応に修正
  - Code.gs: onOpen()メニューに「📋 初期設定」サブメニュー追加（目標/権限シート個別初期化）
- **権限マトリクス（16項目）**:
  - 基本機能: dashboard_view
  - ダッシュボード: dashboard_cs, dashboard_sales, dashboard_leader
  - リード管理: lead_view, lead_add, lead_edit, lead_delete
  - 商談管理: deal_view_all, deal_view_own, deal_edit, team_stats
  - 管理機能: staff_manage, settings, admin_access, force_reset
- **目標設定シートヘッダー**: 目標ID, 担当者ID, 担当者名, 期間タイプ, 期間, 商談数目標, 成約数目標, 成約率目標, 売上目標, メモ, 作成日, 更新日
- **デプロイバージョン**: @22

### 流入経路デフォルト値の空化・列幅自動調整の削除
- **背景**: 流入経路はビジネスごとに異なる。列幅はオーナーが手動調整
- **決定**: 流入経路のデフォルト値を空配列に変更、autoResizeColumn()の呼び出しを削除
- **実装内容**:
  - Config.gs: '流入経路（IN）'と'流入経路（OUT）'のデフォルト値を[]に変更
  - SheetService.gs: initializePermissionsSheet()からautoResizeColumn削除
  - SheetService.gs: forceResetSettingsSheet()からautoResizeColumn削除
  - SheetService.gs: updateSettingsSheet()からautoResizeColumn削除

### ボタン色の統一（青・赤カラースキーム）
- **背景**: ボタン色がオレンジで統一されていたが、用途に応じた色分けが必要
- **決定**: メインボタン（追加・保存）を青、削除・危険操作ボタンを赤に統一
- **実装内容**:
  - style.html: .btn-primary を青（#0b58cf）に変更、border: none追加
  - style.html: .action-btn を青（#0b58cf）に変更
  - style.html: .btn-delete クラスを追加（赤 #dc3545）、border: none追加
  - index.html: 削除ボタンを.btn-deleteクラスに変更
  - index.html: 強制リセットボタンを.btn-dangerクラスに変更
  - index.html: 編集ボタンにmargin-right: 8pxを追加
- **配色**:
  - メインボタン: #0b58cf（ホバー: #0947a8）
  - 削除/危険ボタン: #dc3545（ホバー: #c82333）
  - サイドメニューアクティブ: #FF6B35（変更なし）

### 設定シート・担当者マスタ入力規則の改善
- **背景**: 役割のプルダウン選択肢に「オーナー」がなく、担当者マスタの入力規則が設定シートと連動していなかった
- **決定**: 設定シートに役割列を追加し、担当者マスタの入力規則を設定シートから取得するように修正
- **実装内容**:
  - Config.gs: 役割オプションを['オーナー', '管理者', '営業', 'CS']に変更
  - SheetService.gs: 担当者マスタシートに役割・ステータスの入力規則を適用（既存実装を確認）
  - index.html: 担当者管理テーブルの編集・削除ボタン間のmarginを4px→8pxに変更

### UIデザイン改善（オレンジテーマ）
- **背景**: デザインモックアップに合わせてロゴとUIを改善
- **決定**: ブランドカラーをオレンジ（#FF6B35）に統一
- **実装内容**:
  - style.html: ロゴボックス用CSS追加（.sidebar-logo-box, .sidebar-logo-icon, .sidebar-logo-text）
  - style.html: アクティブメニューをオレンジに変更（背景・テキスト・ボーダー）
  - style.html: ボタン色をオレンジに変更（.btn-primary, .action-btn）
  - style.html: フォームフォーカス色をオレンジに変更
  - style.html: KPIハイライトカードをオレンジグラデーションに変更
  - index.html: ロゴをSVGアイコン + テキストに変更
- **配色**:
  - メインカラー: #FF6B35
  - ホバー: #E55A2B
  - グラデーション: #FF6B35 → #FF8C5A
  - アクティブ背景: rgba(255, 107, 53, 0.1)

### 担当者管理ページの追加
- **背景**: Web画面から担当者の追加・編集・削除を行いたい
- **決定**: サイドメニューに「担当者管理」を追加し、CRUD機能を実装
- **実装内容**:
  - index.html: サイドメニューに「👥 担当者管理」追加
  - index.html: 担当者管理ページ（一覧テーブル）追加
  - index.html: 担当者編集モーダル追加（ID自動採番表示、役割は権限設定シートから動的取得）
  - index.html: loadStaffData(), renderStaffTable(), openStaffModal(), saveStaffFromModal(), deleteStaffConfirm()関数追加
  - WebApp.gs: getStaffWithRoles(), getRoleNames(), generateNextStaffId(), addStaff(), updateStaff(), deleteStaff()関数追加
- **機能**:
  - 担当者一覧表示（ID、氏名、メール、Discord ID、役割、ステータス）
  - 担当者追加（ID自動採番: EMP-001形式）
  - 担当者編集（役割は権限設定シートから取得）
  - 担当者削除（オーナー役割は削除不可）
- **担当者マスタヘッダー**: 担当者ID, 氏名（日本語）, 氏名（英語）, メール, Discord ID, 役割, ステータス, 元候補者ID

### サイドバーナビゲーションへの変更
- **背景**: 管理者設定タブが表示されない問題、画面幅によるメニュー折り返し問題
- **決定**: ヘッダーナビゲーションを左固定サイドバー形式に変更
- **実装内容**:
  - style.html: サイドバーCSS追加（.sidebar, .sidebar-header, .sidebar-menu, .sidebar-menu-item等）
  - style.html: メインコンテンツに左マージン220px追加（.main-content）
  - index.html: `<aside class="sidebar">` でサイドバーHTML追加
  - index.html: メインコンテンツを `<div class="main-content">` でラップ
  - index.html: JavaScript のナビゲーション処理を `.sidebar-menu-item` に変更
  - docs/00_common/GAS_WEBAPP_GUIDE.md: セクション10「UIデザイン標準」追加、サイドバー仕様を共通ルール化
- **仕様**: 幅220px、固定配置、z-index:100、ダークカラー（#2c3e50）

### 権限管理機能の追加
- **背景**: 役割ごとのアクセス権限を管理したい
- **決定**: 権限設定シートを作成し、Adminページに権限管理UIを追加
- **実装内容**:
  - Config.gs: SHEETS.PERMISSIONS、PERMISSION_DEFINITIONS、DEFAULT_ROLES追加
  - SheetService.gs: initializePermissionsSheet()追加
  - WebApp.gs: getPermissionDefinitions(), getRoles(), saveRole(), deleteRole()追加
  - index.html: 権限管理セクション・権限編集モーダル追加
- **シート構成**: 役割名 + 11権限項目（dashboard_view, lead_view, lead_add, lead_edit, lead_delete, deal_view, deal_edit, staff_manage, settings, admin_access, force_reset）
- **デフォルト役割**: オーナー（全権限）、管理者（削除・管理者設定除く）、営業（基本操作のみ）
- **備考**: 権限による制御は将来実装予定（現段階はデータ構造のみ）

### 管理者設定ページ（Adminページ）の追加
- **背景**: GASエディタを開かずに各種設定を管理したい
- **決定**: SPAに管理者設定タブを追加
- **実装内容**:
  - index.html: Adminタブ・管理者設定UI追加
  - index.html: loadAdminSettings(), saveNotificationSettings(), saveAdminPassword(), forceResetSettings()関数追加
  - WebApp.gs: getAdminSettings(), saveNotificationSettings(), saveAdminPassword(), verifyAdminPassword(), forceResetWithPassword()関数追加
- **機能**:
  - 通知設定（Discord Webhook、PMO URL、GitHub URL）
  - システム設定（管理者パスワード設定/変更）
  - 危険な操作（設定シート強制リセット、パスワード認証必須）
- **スクリプトプロパティ**: PMO_DISCORD_WEBHOOK, PMO_PROJECT_URL, GITHUB_URL, ADMIN_PASSWORD

### 「その他」選択時の自由記述機能
- **背景**: プルダウンで「その他」を選択した際に詳細を入力できなかった
- **決定**: 「その他」選択時に詳細入力欄を表示し、「その他: [入力内容]」形式で保存
- **実装内容**:
  - index.html: CSS（.other-detail-input）追加
  - index.html: 流入経路フィールドにonchangeハンドラと詳細入力欄追加
  - index.html: handleOtherSelect(), resetOtherDetails(), getOtherValue()関数追加
  - index.html: submitAddLead()でバリデーションと値フォーマット処理

### 設定シート差分更新機能
- **背景**: 設定シートのリセットでユーザーのカスタマイズが失われる
- **決定**: 既存データを維持しつつ不足分のみ追加する機能を追加
- **実装内容**:
  - SheetService.gs: updateSettingsSheet()関数追加（差分検出・追加処理）
  - SheetService.gs: updateSettingsSheetFromMenu()関数追加
  - Code.gs: メニュー「🔄 設定を更新（差分のみ追加）」追加
- **動作**: 新しい列のみ追加、不足選択肢のみ追加、既存データは維持

### 強制リセットのパスワード保護
- **背景**: 誤操作による設定シート全削除を防止
- **決定**: 強制リセット実行前にADMIN_PASSWORDによる認証を要求
- **実装内容**:
  - SheetService.gs: resetSettingsSheetFromMenu()にパスワード認証追加
  - SheetService.gs: 確認ダイアログ追加
  - Code.gs: メニュー名を「🔃 設定を強制リセット（全削除）」に変更
- **設定**: スクリプトプロパティ「ADMIN_PASSWORD」を設定（未設定時はパスワード不要）

### PMO通知システムをCRMに統合
- **背景**: スタンドアロンスクリプトで作成されていたPMO通知システムを、正しくバインドスクリプトとして再実装
- **決定**: CRMスプレッドシートに「通知設定」シートを追加し、NotificationService.gsとして統合
- **実装内容**:
  - NotificationService.gs 新規作成
  - Config.gs に `NOTIFICATION` シート追加
  - Code.gs に「PMO通知」サブメニュー追加
  - SheetService.gs に通知設定シート初期化を追加
  - pmo-notification/ フォルダを削除
- **機能**:
  - 作業完了通知（PMOコピペ用Markdown含む）
  - 週次レビューリマインド通知
  - スケジュール通知（毎時トリガー）

### CLAUDE.md強化・ルール追加
- **背景**: 仕様と異なる実装が発生（スタンドアロンスクリプト問題）
- **決定**: ルール遵守を担保する仕組みを追加
- **実装内容**:
  - 作業依頼テンプレート追加
  - 実装前宣言（必須・省略禁止）追加
  - 禁止事項の強化・明確化
  - 完了報告テンプレート（仕様照合チェック）追加

### 流入経路のIN/OUT分割
- **背景**: INリード（問い合わせ）とOUTリード（営業開拓）で流入経路の選択肢が異なる
- **決定**: 流入経路を「流入経路（IN）」「流入経路（OUT）」に分割
- **実装内容**:
  - Config.gs: `DROPDOWN_COLUMNS`と`DEFAULT_DROPDOWN_OPTIONS`を更新
  - SheetService.gs: `setDataValidations()`でシートごとに異なるドロップダウンを適用
  - index.html: モーダルでIN/OUTに応じた流入経路セレクトを表示

### SPA化実装
- **背景**: マルチページ構成でのページ遷移が遅い
- **決定**: Single Page Application化
- **実装内容**:
  - index.html に全ページを統合
  - タブナビゲーションで表示切替
  - データキャッシュで再読み込み不要

### プルダウン設定のシート管理化
- **背景**: 選択肢の変更にコード修正が必要だった
- **決定**: 設定シートから動的に読み取り
- **実装内容**:
  - `getDropdownOptionsFromSheet()` 関数追加
  - CacheService で10分間キャッシュ
  - メニューから設定反映可能

## 2026年1月10日

### バインドスクリプトへの移行
- **背景**: カスタムメニューが表示されない
- **決定**: スタンドアロンからバインドスクリプトへ移行
- **実装内容**:
  - Script ID変更
  - `getSpreadsheet()` を `getActiveSpreadsheet()` に

### Web App初期デプロイ
- **背景**: スプレッドシート外からのアクセス需要
- **決定**: GAS Web App としてデプロイ
- **実装内容**:
  - `doGet()` でHTMLを返却
  - `google.script.run` でサーバー通信

---

## テンプレート

```markdown
### タイトル
- **背景**: なぜこの開発が必要だったか
- **決定**: 何を決めたか
- **実装内容**: 具体的に何をしたか
```
