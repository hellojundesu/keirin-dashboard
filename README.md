# 競輪投票 収支ダッシュボード

Googleスプレッドシートを原本とし、GitHub Pagesへ自動公開する静的ダッシュボードです。

## データ更新

1. Googleスプレッドシートを更新
2. 「Webへ反映」を実行（または10分ごとの自動反映）
3. Apps Scriptが`data/data.js`を更新
4. GitHub ActionsがNodeで検証し、`dist/data.js`を生成
5. GitHub Pagesへ自動公開

## ローカル確認

```powershell
npm run check
npm run build
npm run preview
```

詳細は`GITHUB_PUBLISHING.md`と`google-apps-script/SETUP.md`を参照してください。
