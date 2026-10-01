# GitHub Pages公開手順

## フォルダ構成

```text
keirin-dashboard/
├─ public/                 画面のソース
│  └─ index.html
├─ data/                   正式な表示用データ
│  └─ data.js
├─ scripts/                Nodeの生成・検証処理
├─ google-apps-script/     スプレッドシート側の処理
├─ .github/workflows/      GitHub Pagesの自動公開
├─ dist/                   Nodeが生成する完成版（Git管理しない）
└─ package.json
```

## 1. GitHubに空のリポジトリを作成

GitHubで新しいリポジトリを作ります。推奨名は`keirin-dashboard`です。収支データも公開されるため、個人情報や非公開情報を含めないでください。

## 2. このフォルダを登録

このフォルダ内で次を実行します。`YOUR_NAME`はGitHubユーザー名に置き換えます。

```powershell
git add .
git commit -m "Initial dashboard"
git branch -M main
git remote add origin https://github.com/YOUR_NAME/keirin-dashboard.git
git push -u origin main
```

## 3. GitHub Pagesを有効化

GitHubリポジトリの Settings → Pages → Build and deployment → Source で「GitHub Actions」を選択します。

`main`へのpush後、Actionsタブで`Build and deploy dashboard`が成功すると公開URLが表示されます。

## 4. スプレッドシートを接続

`google-apps-script/SETUP.md`に沿ってApps Scriptを設定します。「Webへ反映」を実行すると`data/data.js`だけが更新され、そのpushを検知したGitHub ActionsがNodeで検証してPagesへ公開します。

## ローカル確認

```powershell
npm run check
npm run build
npm run preview
```

ブラウザで`http://127.0.0.1:4173/`を開きます。
