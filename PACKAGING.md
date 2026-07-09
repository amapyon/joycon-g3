# パッケージ作成メモ

## Windows パッケージ

Windows 版のパッケージは以下のコマンドで作成します。

```powershell
npm run package-win
```

このコマンドは先に `npm run build` を実行してから、`scripts/package-win.js` でパッケージを作成します。
パッケージ版は `dist/` のビルド済みファイルを取り込むため、`dist/` が古いと exe も古い内容になります。

作成された exe は以下に出力されます。

```text
dist_packager/JoyCon Clicker-win32-x64/JoyCon Clicker.exe
```

## 確認方法

パッケージ版で修正を確認する場合は、`dist_packager/JoyCon Clicker-win32-x64/` 配下の exe を起動してください。
修正が反映されていない場合は、以下のビルド済みファイルが最新か確認してください。

```text
dist_packager/JoyCon Clicker-win32-x64/resources/app/dist/
```

たとえば `src/` を修正済みでも、古い `dist/` を使ってパッケージ作成すると、古い renderer コードが exe に残ることがあります。
