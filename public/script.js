// カテゴリのキーを押すと、その記事だけ表示する
const keys = document.querySelectorAll(".key");
const posts = document.querySelectorAll(".post");
const emptyMessage = document.getElementById("empty-message");

keys.forEach((key) => {
  key.addEventListener("click", () => {
    const filter = key.dataset.filter;

    // 押したキーだけ「押されている」状態にする
    keys.forEach((k) => k.setAttribute("aria-pressed", String(k === key)));

    // 記事の表示・非表示を切り替える
    let visibleCount = 0;
    posts.forEach((post) => {
      const show = filter === "all" || post.dataset.category === filter;
      post.hidden = !show;
      if (show) visibleCount += 1;
    });

    emptyMessage.hidden = visibleCount > 0;
  });
});
