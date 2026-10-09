# 競輪投票 収支ダッシュボード

Googleスプレッドシートを原本とし、GitHub Pagesへ自動公開する静的ダッシュボードです。

収支ダッシュボードに加え、ガールズ選手の直近3年間・競輪場別の勝率、連対率、3連対率を表示します。

## データ更新

1. Googleスプレッドシートを更新
2. 「Webへ反映」を実行（または10分ごとの自動反映）
3. Apps Scriptが`data/data.js`を更新
4. GitHub ActionsがNodeで検証し、`dist/data.js`を生成
5. GitHub Pagesへ自動公開

## ガールズ成績の更新

`2026-10-08/競輪レース評価ツール_最新版_20261008/ガールズ競輪場別成績更新`のBATを使います。
初回は3年分を取得し、以後は半年ごとに未取得レースだけを追加します。

## ローカル確認

```powershell
npm run check
npm run build
npm run preview
```

詳細は`GITHUB_PUBLISHING.md`と`google-apps-script/SETUP.md`を参照してください。
