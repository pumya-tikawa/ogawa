# ogawa-pcsite

PC周辺機器を紹介するブログ「おがわのデスクノート」と、漫画のおすすめレビューページ（API付き）。
AWS で公開していて、`main` ブランチに push すると、GitHub Actions が自動で AWS に反映する。

---

## 🔧 AWS環境を作り直す手順（最初に読む）

AWS環境が消えたあと（約105分で初期化される練習用環境）に、同じ構成を作り直す手順。目安は10〜15分。
コードと設定は GitHub に残っているので、`infrastructure/template.yaml`、`backend/template.yaml`、2つの workflow（`deploy.yml`、`deploy-backend.yml`）は、そのまま使える。

**消えるもの**：S3 のファイル、CloudFront、Lambda、DynamoDB（**投稿されたレビューも消える**）
**消えないもの**：このリポジトリのコードと設定

作り直すたびに変わるのは、次の項目。

| 項目 | 説明 | どこで見るか |
|---|---|---|
| `BucketName` | サイトの S3 バケット名 | `ogawa-pcsite` スタックの「出力」 |
| `DistributionId` | CloudFront の ID | 同上 |
| `DeployRoleArn` | GitHub Actions が使う役割の ARN | 同上 |
| `SamBucketName` | SAM がコードをアップロードする S3 バケット名 | 同上 |
| `SiteUrl` | 公開サイトのURL | 同上 |
| `ApiUrl` | レビュー API のURL | `ogawa-pcsite-backend` スタックの「出力」 |

### 手順

1. **IDプロバイダの確認**
   AWS の「IAM」→「IDプロバイダ」を開く。
   - `token.actions.githubusercontent.com` が**ない** → `CreateOidcProvider` は `true`（初期値）のまま
   - **ある** → スタック作成時に `CreateOidcProvider` を `false` にする

2. **インフラのスタックを作る**
   - リージョンを「アジアパシフィック（東京）`ap-northeast-1`」にする
   - 「CloudFormation」→「スタックの作成」→「新しいリソースを使用」→「テンプレートファイルのアップロード」で `infrastructure/template.yaml` を選ぶ
   - スタック名は `ogawa-pcsite`
   - 最後の確認画面で、IAM リソースが作られることを承認するチェックを入れる
   - 「CREATE_COMPLETE」になるまで待つ（数分）

3. **「出力」タブの値をコピーする**
   `DeployRoleArn`、`BucketName`、`DistributionId`、`SamBucketName`

4. **GitHub の Secrets を上書きする**
   GitHub の `ogawa` リポジトリで「Settings」→「Secrets and variables」→「Actions」を開く。

   | Secret の名前 | 値 |
   |---|---|
   | `AWS_ROLE_ARN` | `DeployRoleArn` |
   | `S3_BUCKET_NAME` | `BucketName` |
   | `CLOUDFRONT_DISTRIBUTION_ID` | `DistributionId` |
   | `SAM_ARTIFACT_BUCKET` | `SamBucketName` |

   値の前後に空白や改行が入らないようにする。

5. **backend（API）をデプロイして、API のURLを控える**
   - 「Actions」タブ →「Deploy backend (SAM)」→「Run workflow」で、`main` を選んで手動実行する
   - 緑のチェックになったら、CloudFormation の `ogawa-pcsite-backend` スタックの「出力」タブで `ApiUrl` をコピーする
   - 失敗して `ogawa-pcsite-backend` が `ROLLBACK_COMPLETE` のまま残ったときは、そのスタックを削除してから、もう一度実行する
   - スタック名 `ogawa-pcsite-backend` は、`deploy-backend.yml` と `infrastructure/template.yaml`（`BackendStackName`）で決めている。変えるときは両方を合わせる

6. **サイトの API のURLを書き換えて、公開する**
   - `public/reviews.js` の1行目の `API_URL` を、手順5の `ApiUrl` に書き換える
   - `main` に push する（または Pull Request をマージする）
   - `public/` が変わるので、「Deploy to AWS」が自動で動く。S3 バケットは空なので、これでサイトのファイルも入る
   - 動かないときは、「Actions」タブ →「Deploy to AWS」→「Run workflow」で、`main` を選んで手動実行する

7. **確認**
   `SiteUrl` を開いて、サイトが表示されるか確認する。続けて、末尾に `/reviews.html` を付けて開き、レビューページが表示されれば完了（レビューは空の状態から始まる）。

> **順番に注意**：API のURLは作り直すたびに変わる。必ず手順5（backend）→ 手順6（URLの書き換え）の順に行う。逆にすると、サイトは新しいのに API のURLが古いままになり、一覧が読み込めない。

### リージョンについて
`deploy.yml` と `deploy-backend.yml` の `aws-region`（今は `ap-northeast-1`）と、スタックを作ったリージョンは、同じにする。
別のリージョンで環境が用意されるときは、2つの workflow のほうを書き換える。

---

## フォルダ構成

```
ogawa-pcsite/
├── .github/workflows/
│   ├── deploy.yml                 サイトの自動公開（GitHub Actions）
│   └── deploy-backend.yml         API の自動デプロイ（GitHub Actions + SAM）
├── backend/                       レビュー API（AWS SAM）
│   ├── template.yaml              API Gateway / Lambda / DynamoDB の構築設定
│   └── src/
│       ├── get_reviews.py         レビュー一覧を返す
│       └── post_reviews.py        レビューを保存する
├── infrastructure/template.yaml   AWS環境の構築設定（CloudFormation）
├── public/                        公開されるファイル（この中身がサイトになる）
│   ├── images/                    画像
│   ├── posts/                     記事ページ（template.html をコピーして作る）
│   ├── index.html                 トップページ
│   ├── reviews.html               漫画レビューのページ
│   ├── reviews.js                 レビューページの処理（API の呼び出し）
│   ├── script.js                  カテゴリの絞り込み
│   └── style.css                  見た目
├── .gitignore
└── README.md
```

## 構成

```
GitHub（main へ push）
  │  GitHub Actions（OIDC で AWS にログイン。アクセスキーは使わない）
  ├─ Deploy to AWS ............ public/ を S3 に反映 → CloudFront のキャッシュを更新
  └─ Deploy backend (SAM) ..... sam build → sam deploy

ブラウザ ─→ CloudFront ─→ S3（静的サイト）
   └──────→ API Gateway（HTTP API）─→ Lambda（Python）─→ DynamoDB
```

使っている技術：AWS（S3、CloudFront、API Gateway、Lambda、DynamoDB、IAM）／ CloudFormation・AWS SAM ／ GitHub Actions（OIDC）

## 公開の仕組み

### サイト（`public/`）

1. `main` に push する（または Pull Request をマージする）
2. GitHub Actions が、OIDC で AWS の役割（`GitHubDeployRole`）を使ってログインする
3. `public/` の中身を S3 に反映する（`aws s3 sync`）
4. CloudFront のキャッシュを更新する（`create-invalidation`）

動くのは、`main` への変更のうち `public/` か `deploy.yml` が変わったときだけ。
`eda1` など、ほかのブランチに push しても公開されない。

### API（`backend/`）

`main` への変更のうち `backend/` か `deploy-backend.yml` が変わったときだけ、`sam build` と `sam deploy` が自動で動く。
`infrastructure/template.yaml` を変えたときは自動では動かないので、CloudFormation のコンソールからスタックを更新する。

## API

| メソッド | パス | 内容 |
|---|---|---|
| GET | `/reviews` | レビュー一覧（新しい順） |
| POST | `/reviews` | レビューを投稿する（`title` は1〜100文字、`rating` は1〜5の整数、`comment` は500文字まで） |

## 記事を更新する

1. `public/posts/template.html` をコピーして、`public/posts/名前.html` を作る（名前は半角英数字とハイフン）
2. `【 】` の部分を全部書き換える（`Ctrl + F` で `【` を検索すると探せる）
3. 画像は `public/images/` に置く
4. `public/index.html` の記事カードを足す。カード内のリンクは `href="posts/名前.html"` にする
5. ブラウザ（Live Server など）で見た目を確認する
6. `git add .` → `git commit` → `git push`
7. GitHub の「Actions」タブで、緑のチェックになるのを待つ
8. サイトを開いて反映を確認する（古いままなら `Ctrl + F5`）

注意:
- `main` に直接 push すると、その内容がすぐ公開される。書きかけは `eda1` に push する（`eda1` では公開されない）。
- `public/posts/template.html` も公開される。リンクは貼っていないので目立たないが、URLを直接開けば見られる。

## つまずきやすい点

### `Not authorized to perform sts:AssumeRoleWithWebIdentity`（自動公開が赤いバツ）
GitHub が AWS に送る名前の形が、役割の条件と合っていない。

- `AWS_ROLE_ARN` の値が、新しい `DeployRoleArn` と同じか確認する
- このリポジトリは、名前に固有番号が付く形で送られる（`repo:ユーザー名@番号/リポジトリ名@番号:ref:refs/heads/main`）。
  その番号は `template.yaml` の `GitHubOwnerId` と `GitHubRepoId` に入れてある
- GitHub のリポジトリを作り直したり、別のアカウントで作ったりすると、番号が変わる。
  実際の値は、`deploy.yml` の「Checkout」の次に、次の項目を一時的に足して実行すると、実行ログに出る

```yaml
      - name: Show OIDC subject
        run: |
          curl -sH "Authorization: bearer $ACTIONS_ID_TOKEN_REQUEST_TOKEN" "$ACTIONS_ID_TOKEN_REQUEST_URL&audience=sts.amazonaws.com" | jq -r '.value | split(".")[1] | @base64d | fromjson | .sub'
```

確認できたら、この項目は消す。

### backend のデプロイで `not authorized to perform ...`（権限が足りない）
エラー文に、足りない操作（例：`apigateway:TagResource`）が書いてある。
`infrastructure/template.yaml` の `GitHubDeployRole` の `deploy-backend` にその操作を足して、CloudFormation のコンソールでインフラのスタックを更新する。
そのあと、失敗した `ogawa-pcsite-backend` が `ROLLBACK_COMPLETE` で残っていれば削除して、「Deploy backend (SAM)」をもう一度実行する。

### レビューの一覧が読み込めない
- `public/reviews.js` の `API_URL` が、今の `ApiUrl` と同じか確認する
- ブラウザで `F12` →「コンソール」のエラーを見る
- `reviews.html` をダブルクリック（`file://`）で開くと、CORS のエラーで読み込めない。公開サイトのURLか、Live Server で開く

### `git push` が `rejected (fetch first)` で止まる
GitHub 側に、手元にない変更がある。`git pull` で取り込んでから、もう一度 `git push` する。

### `git pull` のあと、Vim の画面が開いて閉じられない
`Esc` を押して、半角英数で `:wq` と入力して `Enter`。
次から開かないようにするには、次を実行する。

```powershell
git config --global core.editor "code --wait"
```

### サイトが古いまま表示される
`Ctrl + F5` で強制的に再読み込みする。
それでも変わらないときは、「Actions」タブで、緑のチェックになっているか確認する。

## 今後の改善案

- CORS を CloudFront のURLだけに絞る（今は全許可）
- API のリクエスト回数制限（スロットリング）
- Pull Request 時の自動テスト
- 本番で使う場合は、GitHub 用の役割から IAM 作成権限を外し、CloudFormation 実行用の役割に分ける
