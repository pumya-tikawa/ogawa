# ogawa-pcsite

PC周辺機器を紹介するブログ「おがわのデスクノート」。
AWS（S3 + CloudFront）で公開していて、`main` ブランチに push すると、GitHub Actions が自動で公開サイトに反映する。

## フォルダ構成

```
ogawa-pcsite/
├── .github/workflows/deploy.yml   自動公開の設定（GitHub Actions）
├── infrastructure/template.yaml   AWS環境の構築設定（CloudFormation）
├── public/                        公開されるファイル（この中身がサイトになる）
│   ├── images/                    画像
│   ├── posts/                     記事ページ（template.html をコピーして作る）
│   ├── index.html                 トップページ
│   ├── script.js                  カテゴリの絞り込み
│   └── style.css                  見た目
├── .gitignore
└── README.md
```

## 公開の仕組み

1. `main` に push する（または Pull Request をマージする）
2. GitHub Actions が、OIDC で AWS の役割（`GitHubDeployRole`）を使ってログインする
3. `public/` の中身を S3 に反映する（`aws s3 sync`）
4. CloudFront のキャッシュを更新する（`create-invalidation`）

動くのは、`main` への変更のうち `public/` か `deploy.yml` が変わったときだけ。
`eda1` など、ほかのブランチに push しても公開されない。

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

## AWS環境を作り直す手順

AWS環境が消えたあと（約105分で初期化される練習用環境）に、同じ構成を作り直す。
`template.yaml` と `deploy.yml` は、そのまま使える。作り直すたびに変わるのは、次の4つ。

| 項目 | 説明 |
|---|---|
| `BucketName` | S3 バケット名 |
| `DistributionId` | CloudFront の ID |
| `DeployRoleArn` | GitHub Actions が使う役割の ARN |
| `SiteUrl` | 公開サイトのURL |

### 手順

1. **IDプロバイダの確認**
   AWS の「IAM」→「IDプロバイダ」を開く。
   - `token.actions.githubusercontent.com` が**ない** → `CreateOidcProvider` は `true`（初期値）のまま
   - **ある** → スタック作成時に `CreateOidcProvider` を `false` にする

2. **スタックを作る**
   - リージョンを「アジアパシフィック（東京）`ap-northeast-1`」にする
   - 「CloudFormation」→「スタックの作成」→「新しいリソースを使用」→「テンプレートファイルのアップロード」で `infrastructure/template.yaml` を選ぶ
   - スタック名は `ogawa-pcsite`
   - 最後の確認画面で、IAM リソースが作られることを承認するチェックを入れる
   - 「CREATE_COMPLETE」になるまで待つ（数分）

3. **「出力」タブの値をコピーする**
   `DeployRoleArn`、`BucketName`、`DistributionId`

4. **GitHub の Secrets を上書きする**
   GitHub の `ogawa` リポジトリで「Settings」→「Secrets and variables」→「Actions」を開く。

   | Secret の名前 | 値 |
   |---|---|
   | `AWS_ROLE_ARN` | `DeployRoleArn` |
   | `S3_BUCKET_NAME` | `BucketName` |
   | `CLOUDFRONT_DISTRIBUTION_ID` | `DistributionId` |

   値の前後に空白や改行が入らないようにする。

5. **サイトのファイルを S3 に入れる**
   S3 バケットは空なので、「Actions」タブ →「Deploy to AWS」→「Run workflow」で、`main` を選んで手動実行する。
   緑のチェックになれば、`public/` の中身が反映されている。

6. **確認**
   「出力」の `SiteUrl` を開いて、サイトが表示されれば完了。

### リージョンについて
`deploy.yml` の `aws-region`（今は `ap-northeast-1`）と、スタックを作ったリージョンは、同じにする。
別のリージョンで環境が用意されるときは、`deploy.yml` のほうを書き換える。

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