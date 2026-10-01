# Googleスプレッドシート連携設定

## 1. Apps Scriptを追加

対象のGoogleスプレッドシートで「拡張機能 → Apps Script」を開き、`Code.gs`の内容を貼り付けて保存します。

## 2. GitHubトークンを作成

GitHubの Settings → Developer settings → Personal access tokens → Fine-grained tokens から作成します。

- Repository access: 公開するリポジトリだけ
- Repository permissions → Contents: Read and write

## 3. Apps Scriptのプロパティを設定

Apps Scriptの「プロジェクトの設定 → スクリプト プロパティ」に追加します。

| 名前 | 値の例 |
| --- | --- |
| `GITHUB_OWNER` | GitHubのユーザー名 |
| `GITHUB_REPO` | `keirin-dashboard` |
| `GITHUB_TOKEN` | 作成したfine-grained token |
| `GITHUB_BRANCH` | `main` |
| `GITHUB_DATA_PATH` | `data/data.js` |

トークンはシートのセルやGitHubリポジトリには保存しないでください。

## 4. 初回実行

スプレッドシートを開き直し、「収支ダッシュボード → Webへ反映」を選びます。初回だけGoogleの権限確認が表示されます。

## 5. 自動更新

「収支ダッシュボード → 10分ごとの自動反映を開始」を選択します。変更がない場合はGitHubへのコミットを作りません。

スマホから操作する場合は「スマホ用チェックボックスを作成」を選択し、作成された`_設定`シートのチェックボックスを使用します。
